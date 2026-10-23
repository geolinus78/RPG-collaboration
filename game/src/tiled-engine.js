import { drawSymbol, polygon, ellipse, shade } from "./map-art.js";
import { initialDesign, findMooring, TERRAINS, noise as mapNoise } from "../shared/island-map.js";

const STEP = 4;
const keyOf = (x, z) => `${x},${z}`;
const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Fixed 2:1 projection. Terrain and miniature symbols are drawn on a 2D canvas.
export class IslandWorld {
  constructor({ canvas, onMessage, onTravel, onDiscovery = () => {} }) {
    Object.assign(this, { canvas, onMessage, onTravel, onDiscovery });
    this.ctx = canvas.getContext("2d");
    this.keys = new Set();
    this.active = false;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.heroStyle = "trail";
    this.visited = new Map();
    this.tiles = new Map();
    this.route = [];
    this.bindControls();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  setActive(active) {
    this.active = active;
    if (!active) this.keys.clear();
    this.lastTime = null;
  }

  setHeroStyle(style) { this.heroStyle = style; }

  loadIsland(island, design = null) {
    this.currentIsland = island;
    this.route = [];
    this.hover = null;
    this.labels = [];
    this.targetFeature = null;
    this.sailing = null;
    this.peers = [];
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.tiles = new Map();
    const data = design || initialDesign(island);
    for (const tile of data.tiles) this.tiles.set(keyOf(tile.x, tile.z), { ...tile, beach: tile.terrain === "sand", path: tile.terrain === "path", noise: mapNoise(tile.x, tile.z, island.terrain.seed) });
    const objects = data.objects.map(item => ({ ...item, level: this.tiles.get(keyOf(item.x, item.z))?.level || 0 }));
    this.features = objects.filter(item => item.landmark).map((item, index) => ({ ...item, index }));
    const originalBoat = island.landmarks.find(item => item.kind === "boat");
    this.mooring = findMooring([...this.tiles.values()], originalBoat?.position.map(v => v / STEP));
    this.boat = { ...originalBoat, id: "island-boat", kind: "boat", color: originalBoat?.color || "#e8cf73", name: originalBoat?.name || "Island boat", index: this.features.length, ...this.mooring.shore, waterX: this.mooring.x, waterZ: this.mooring.z, waterLevel: this.mooring.level, landmark: true };
    this.features.push(this.boat);
    const creatureKinds = ["fox", "bird", "spirit", "crawler"];
    this.creatures = objects.filter(item => creatureKinds.includes(item.kind)).map((item, phase) => ({ ...item, phase }));
    this.player = { ...this.nearestTile(island.playerStart), walk: 0 };
    for (const feature of design ? [] : this.features) {
      for (const point of this.findPath(this.player, feature)) this.tiles.get(keyOf(point.x, point.z)).path = true;
      this.tiles.get(keyOf(feature.x, feature.z)).path = true;
    }
    this.decor = objects.filter(item => !item.landmark && !creatureKinds.includes(item.kind));
    this.tileOrder = [...this.tiles.values()].sort((a, b) => a.x + a.z - b.x - b.z || a.x - b.x);
    if (!this.visited.has(island.id)) this.visited.set(island.id, new Set());
    this.onDiscovery(this.visited.get(island.id), this.features);
    this.bakeMap();
    this.onMessage(island.story.arrival);
  }

  nearestTile(position) {
    const x = position[0] / STEP, z = position[1] / STEP;
    let nearest, distance = Infinity;
    for (const tile of this.tiles.values()) {
      const d = Math.hypot(tile.x - x, tile.z - z);
      if (d < distance) { distance = d; nearest = tile; }
    }
    return { x: nearest.x, z: nearest.z, level: nearest.level };
  }

  findPath(from, to) {
    const start = keyOf(Math.round(from.x), Math.round(from.z)), end = keyOf(to.x, to.z);
    const queue = [start], previous = new Map([[start, null]]);
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      if (current === end) break;
      const tile = this.tiles.get(current);
      if (!tile) return [];
      for (const [dx, dz] of directions) {
        const key = keyOf(tile.x + dx, tile.z + dz);
        if (this.tiles.has(key) && !previous.has(key)) { previous.set(key, current); queue.push(key); }
      }
    }
    if (!previous.has(end)) return [];
    const path = [];
    for (let at = end; at !== start; at = previous.get(at)) {
      const { x, z, level } = this.tiles.get(at);
      path.unshift({ x, z, level });
    }
    return path;
  }

  project(x, z, level = 0) { return { x: (x - z) * 24, y: (x + z) * 12 - level * 7 }; }

  layout() {
    const sidebar = this.editorMode ? 0 : this.width > 800 ? 290 : 0, footer = this.editorMode ? 30 : this.width > 800 ? 50 : 215;
    const points = this.tileOrder.map(t => this.project(t.x, t.z, t.level));
    const minX = Math.min(...points.map(p => p.x)) - 125, maxX = Math.max(...points.map(p => p.x)) + 48;
    const minY = Math.min(...points.map(p => p.y)) - 100;
    const maxY = Math.max(...this.tileOrder.map(t => this.project(t.x, t.z).y)) + 60;
    this.scale = Math.min((this.width - sidebar - 40) / (maxX - minX), (this.height - footer - 90) / (maxY - minY)) * this.zoom;
    this.origin = { x: (this.width - sidebar) / 2 - (minX + maxX) / 2 * this.scale + this.pan.x, y: 65 + (this.height - footer - 65) / 2 - (minY + maxY) / 2 * this.scale + this.pan.y };
  }

  bakeMap() {
    const points = this.tileOrder.map(t => this.project(t.x, t.z, t.level));
    const left = Math.min(...points.map(p => p.x)) - 26, right = Math.max(...points.map(p => p.x)) + 26;
    const top = Math.min(...points.map(p => p.y)) - 14;
    const bottom = Math.max(...this.tileOrder.map(t => this.project(t.x, t.z).y)) + 28;
    // Keep the complete mountain in the cache without allocating a bitmap
    // whose height grows with the number of elevation levels.
    const scale = Math.min(1, 2048 / (right - left), 1536 / (bottom - top));
    this.mapBounds = { left, top, scale };
    if (!this.mapLayer) this.mapLayer = document.createElement("canvas");
    this.mapLayer.width = Math.max(1, Math.ceil((right - left) * scale));
    this.mapLayer.height = Math.max(1, Math.ceil((bottom - top) * scale));
    const ctx = this.mapLayer.getContext("2d");
    ctx.setTransform(scale, 0, 0, scale, -left * scale, -top * scale);
    for (const tile of this.tileOrder) this.drawTile(ctx, tile);
  }

  drawTile(ctx, tile) {
    const { x, y } = this.project(tile.x, tile.z, tile.level), pal = this.currentIsland.palette;
    const seaBottom = 13 + tile.level * 7;
    const terrain = TERRAINS.find(item => item.id === tile.terrain);
    const color = tile.terrain === "grass" ? pal.lowland : terrain?.color || pal.lowland;
    const top = shade(tile.beach ? pal.sand : color, (tile.noise - .5) * .13);
    const right = this.tiles.get(keyOf(tile.x + 1, tile.z)), front = this.tiles.get(keyOf(tile.x, tile.z + 1));
    if (!right || right.level < tile.level) {
      const bottom = right ? (tile.level - right.level) * 7 : seaBottom;
      polygon(ctx, [[x, y + 12], [x + 24, y], [x + 24, y + bottom], [x, y + 12 + bottom]], shade(tile.beach ? pal.sand : pal.rock, -.28), "#384c4338");
      const spacing = Math.max(5, bottom / 64);
      for (let d = spacing; d < bottom; d += spacing) polygon(ctx, [[x + 1, y + 12 + d], [x + 23, y + 1 + d]], "transparent", "#e7d2a31f");
    }
    if (!front || front.level < tile.level) {
      const bottom = front ? (tile.level - front.level) * 7 : seaBottom;
      polygon(ctx, [[x - 24, y], [x, y + 12], [x, y + 12 + bottom], [x - 24, y + bottom]], shade(tile.beach ? pal.sand : pal.rock, -.1), "#384c4338");
      const spacing = Math.max(5, bottom / 64);
      for (let d = spacing; d < bottom; d += spacing) polygon(ctx, [[x - 23, y + 1 + d], [x - 1, y + 12 + d]], "transparent", "#e7d2a326");
    }
    polygon(ctx, [[x, y - 12], [x + 24, y], [x, y + 12], [x - 24, y]], top, shade(top, -.09));
    polygon(ctx, [[x - 23, y], [x, y - 11], [x + 23, y]], "transparent", "#fff3c334");
    const rng = random(Math.floor(tile.noise * 100000));
    for (let i = 0; i < (tile.path ? 7 : 5); i++) {
      const ox = (rng() - .5) * 32, oy = (rng() - .5) * 10;
      if (tile.path || tile.beach) ellipse(ctx, x + ox, y + oy, 1 + rng() * 1.6, .6, shade(top, -.18));
      else polygon(ctx, [[x + ox - 1, y + oy], [x + ox, y + oy - 2], [x + ox + 1, y + oy]], shade(top, -.2));
    }
    if (tile.path) for (const [dx, dz] of directions) {
      const neighbor = this.tiles.get(keyOf(tile.x + dx, tile.z + dz));
      if (neighbor?.path && neighbor.level !== tile.level && neighbor.x + neighbor.z > tile.x + tile.z) {
        const q = this.project(neighbor.x, neighbor.z, neighbor.level);
        for (let s = 1; s < 5; s++) {
          const t = s / 5, sx = x + (q.x - x) * t, sy = y + (q.y - y) * t;
          polygon(ctx, [[sx - 4, sy - 2], [sx + 4, sy + 2]], "transparent", "#f0dfad", 2);
        }
      }
    }
  }

  bindControls() {
    window.addEventListener("keydown", event => {
      if (!this.active || this.editorMode || this.sailing || event.target.closest?.("input, textarea, select, button, [contenteditable]")) return;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright", "e", " ", "+", "-", "0"].includes(key)) event.preventDefault();
      if (key === "e" || key === " ") { if (!event.repeat) this.interact(); return; }
      if (key === "+" || key === "=") this.setZoom(this.zoom + .15);
      if (key === "-") this.setZoom(this.zoom - .15);
      if (key === "0") this.setZoom(1);
      this.keys.add(key);
    });
    window.addEventListener("keyup", e => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => this.keys.clear());
    this.canvas.addEventListener("pointerdown", e => {
      if (this.active && !this.sailing && (!this.editorMode || this.editorPan)) this.drag = { x: e.clientX, y: e.clientY, panX: this.pan.x, panY: this.pan.y, moved: false };
    });
    this.canvas.addEventListener("pointermove", e => {
      if (this.drag) {
        const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
        if (Math.hypot(dx, dy) > 5) this.drag.moved = true;
        if (this.drag.moved) {
          this.canvas.setPointerCapture(e.pointerId);
          this.pan = { x: this.drag.panX + dx, y: this.drag.panY + dy };
          this.hover = null;
          return;
        }
      }
      this.hover = this.tileAtPointer(e);
    });
    this.canvas.addEventListener("pointerup", () => { this.suppressClick = this.drag?.moved; this.drag = null; });
    this.canvas.addEventListener("pointercancel", () => { this.drag = null; });
    this.canvas.addEventListener("pointerleave", () => { this.hover = null; });
    this.canvas.addEventListener("click", e => {
      if (this.suppressClick) { this.suppressClick = false; return; }
      if (!this.active || this.editorMode || this.sailing) return;
      this.canvas.focus({ preventScroll: true });
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left - this.origin.x) / this.scale, my = (e.clientY - rect.top - this.origin.y) / this.scale;
      const labelFeature = this.labels?.find(label => mx >= label.left && mx <= label.left + label.width && my >= label.top && my <= label.top + 20)?.feature;
      const feature = labelFeature || [...this.features, ...this.creatures].find(f => {
        const p = this.featurePoint(f);
        this.ctx.font = '600 11px "Segoe UI", sans-serif';
        const labelWidth = f.landmark ? this.ctx.measureText(f.name).width / 2 + 14 : 18;
        return Math.abs(mx - p.x) < Math.max(28, labelWidth) && my > p.y - (f.kind === "tower" ? 100 : 65) && my < p.y + (f.landmark ? 34 : 14);
      });
      if (feature) this.walkTo(feature);
      else { const tile = this.tileAtPointer(e); if (tile) { this.targetFeature = null; this.route = this.findPath(this.player, tile); } }
    });
  }

  tileAtPointer(event) {
    if (!this.currentIsland || !this.origin) return null;
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - this.origin.x) / this.scale, y = (event.clientY - rect.top - this.origin.y) / this.scale;
    return [...this.tileOrder].reverse().find(t => { const p = this.project(t.x, t.z, t.level); return Math.abs(x - p.x) / 24 + Math.abs(y - p.y) / 12 <= 1; }) || null;
  }

  walkTo(feature) {
    if (!this.active || this.sailing) return;
    this.targetFeature = feature;
    this.route = this.findPath(this.player, feature);
    if (!this.route.length) { this.interact(feature); this.targetFeature = null; }
    else this.onMessage(`Following the trail to ${feature.name}…`);
  }

  setZoom(value) {
    this.zoom = Math.max(.7, Math.min(2.5, value));
    if (value === 1) this.pan = { x: 0, y: 0 };
  }

  update(delta) {
    if (!this.active || !this.player) return;
    if (this.editorMode) return;
    if (this.sailing) { this.updateSailing(delta); return; }
    const k = this.keys;
    const sx = Number(k.has("d") || k.has("arrowright")) - Number(k.has("a") || k.has("arrowleft"));
    const sy = Number(k.has("s") || k.has("arrowdown")) - Number(k.has("w") || k.has("arrowup"));
    if (sx || sy) {
      this.targetFeature = null;
      if (this.route.length > 1) this.route = this.route.slice(0, 1);
      if (!this.route.length) {
        const dx = sx ? sx : sy, dz = sx ? -sx : sy;
        const x = Math.round(this.player.x) + dx, z = Math.round(this.player.z) + dz;
        const tile = this.tiles.get(keyOf(x, z));
        if (tile) this.route = [{ x, z, level: tile.level }];
      }
    }
    const next = this.route[0];
    if (!next) return;
    const distance = Math.hypot(next.x - this.player.x, next.z - this.player.z), step = delta * 3.8;
    this.player.walk += delta * 12;
    if (distance <= step) {
      Object.assign(this.player, next);
      this.route.shift();
      if (!this.route.length && this.targetFeature) { const feature = this.targetFeature; this.targetFeature = null; this.interact(feature); }
    } else {
      this.player.x += (next.x - this.player.x) / distance * step;
      this.player.z += (next.z - this.player.z) / distance * step;
      this.player.level += (next.level - this.player.level) * Math.min(1, delta * 12);
    }
  }

  interact(chosen) {
    if (!this.active || !this.currentIsland || this.sailing || this.editorMode) return;
    const nearest = chosen || [...this.features, ...this.creatures].sort((a, b) => Math.hypot(a.x - this.player.x, a.z - this.player.z) - Math.hypot(b.x - this.player.x, b.z - this.player.z))[0];
    if (!nearest || Math.hypot(nearest.x - this.player.x, nearest.z - this.player.z) > 1.9) { this.onMessage("Move closer to a landmark, or click its miniature to follow the trail."); return; }
    if (nearest.landmark) { const visited = this.visited.get(this.currentIsland.id); visited.add(nearest.index); this.onDiscovery(visited, this.features); }
    this.onMessage(`${nearest.name}: ${nearest.message || "It pauses to watch you pass."}`);
    if (nearest.kind === "boat") this.depart();
  }

  depart() {
    this.keys.clear(); this.route = []; this.targetFeature = null;
    this.setZoom(1);
    this.sailing = { phase: "departing", elapsed: 0, duration: 3.2 };
    this.onMessage("All aboard! Sailing out of the harbor…");
  }

  arrive(onArrival = () => {}) {
    this.keys.clear(); this.route = [];
    this.player = { ...this.mooring.shore, walk: 0 };
    this.setZoom(1); this.setActive(true);
    this.sailing = { phase: "arriving", elapsed: 0, duration: 3.2, onArrival };
    this.onMessage(`Approaching ${this.currentIsland.name}. Bringing the boat alongside…`);
  }

  updateSailing(delta) {
    const voyage = this.sailing;
    if (voyage.phase === "offshore") return;
    voyage.elapsed += delta;
    if (voyage.elapsed < voyage.duration) return;
    if (voyage.phase === "departing") {
      this.sailing = { phase: "offshore" };
      this.onTravel();
    } else {
      this.sailing = null;
      this.onMessage(`Moored at ${this.currentIsland.name}. Step ashore and explore.`);
      voyage.onArrival();
    }
  }

  setPeers(players) { this.peers = players.filter(p => p.presence?.islandId === this.currentIsland?.id && p.online && !p.presence.sailing); }

  featurePoint(feature) {
    return feature.kind === "boat" ? this.project(feature.waterX, feature.waterZ, feature.waterLevel) : this.project(feature.x, feature.z, feature.level);
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.width = Math.max(1, parent.clientWidth); this.height = Math.max(1, parent.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * ratio); this.canvas.height = Math.round(this.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  frame(time) {
    const delta = this.lastTime == null ? 0 : Math.min((time - this.lastTime) / 1000, .05);
    this.lastTime = time;
    if (this.active && this.currentIsland) { this.update(delta); this.draw(time / 1000); }
    requestAnimationFrame(this.frame);
  }

  draw(time) {
    this.layout();
    const ctx = this.ctx, island = this.currentIsland, pal = island.palette;
    const water = ctx.createLinearGradient(0, 0, this.width, this.height);
    water.addColorStop(0, shade(pal.deepWater, .23)); water.addColorStop(1, shade(pal.deepWater, -.13));
    ctx.fillStyle = water; ctx.fillRect(0, 0, this.width, this.height);
    for (let i = 0; i < 110; i++) {
      const x = noise(i, 4, 1) * this.width, y = noise(i, 8, 7) * this.height, drift = Math.sin(time * .35 * island.atmosphere.windSpeed + i) * 3;
      ctx.strokeStyle = i % 4 ? "#a2e2d617" : "#bee8d530"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + drift, y); ctx.bezierCurveTo(x + 5 + drift, y - 2, x + 9 + drift, y + 2, x + 16 + drift, y); ctx.stroke();
    }
    ctx.save(); ctx.translate(this.origin.x, this.origin.y); ctx.scale(this.scale, this.scale);
    for (const tile of this.tileOrder) {
      if (!tile.beach) continue;
      const p = this.project(tile.x, tile.z);
      ellipse(ctx, p.x, p.y + 10, 39, 23, `${pal.shallowWater}42`);
      polygon(ctx, [[p.x - 29, p.y + 14], [p.x, p.y + 29], [p.x + 29, p.y + 14]], "transparent", "#d9efc459", 1.5);
    }
    const bounds = this.mapBounds;
    ctx.drawImage(this.mapLayer, bounds.left, bounds.top, this.mapLayer.width / bounds.scale, this.mapLayer.height / bounds.scale);
    if (this.editorMode) {
      ctx.strokeStyle = "#dfeddb18"; ctx.lineWidth = .7;
      for (let i = -18; i <= 18; i++) {
        const a = this.project(i, -18), b = this.project(i, 18), c = this.project(-18, i), d = this.project(18, i);
        polygon(ctx, [[a.x, a.y], [b.x, b.y]], null, "#dfeddb18"); polygon(ctx, [[c.x, c.y], [d.x, d.y]], null, "#dfeddb18");
      }
    }
    const shore = this.project(this.mooring.shore.x, this.mooring.shore.z, this.mooring.shore.level), berth = this.featurePoint(this.boat);
    // The jetty remains at the coast while the vessel sails independently.
    for (let i = 0; i <= 9; i++) {
      const t = i / 10, x = shore.x + (berth.x - shore.x) * t, y = shore.y + (berth.y - shore.y) * t;
      polygon(ctx, [[x - 2, y - 5], [x + 3, y - 4], [x + 3, y + 7], [x - 2, y + 6]], i % 2 ? "#b99a62" : "#a58a57", "#625137");
    }
    for (const point of this.route) { const p = this.project(point.x, point.z, point.level); ellipse(ctx, p.x, p.y, 2.4, 1.3, "#fff1b4ba"); }
    if (this.hover) { const p = this.project(this.hover.x, this.hover.z, this.hover.level); polygon(ctx, [[p.x, p.y - 12], [p.x + 24, p.y], [p.x, p.y + 12], [p.x - 24, p.y]], "#fff4c42a", "#ffe1a7", 1.5); }
    const symbols = [...this.decor, ...this.features.filter(f => f.kind !== "boat"), ...this.creatures,
      ...(!this.sailing ? [{ ...this.boat, x: this.boat.waterX, z: this.boat.waterZ, level: this.boat.waterLevel }] : []),
      ...(!this.sailing && !this.editorMode ? [{ ...this.player, kind: "hero", style: this.heroStyle, moving: this.route.length > 0 }] : []),
      ...(this.editorMode ? [] : (this.peers || []).map(p => ({ ...p.presence, kind: "hero", walk: time * 6, peerName: p.name })))
    ].sort((a, b) => a.x + a.z - b.x - b.z);
    for (const item of symbols) {
      const p = this.project(item.x, item.z, item.level);
      ctx.save(); ctx.translate(p.x, p.y); drawSymbol(ctx, item, island, time); ctx.restore();
      if (item.peerName) { ctx.fillStyle = "#fff4ce"; ctx.font = '11px "Segoe UI"'; ctx.textAlign = "center"; ctx.fillText(item.peerName, p.x, p.y - 59); }
    }
    if (this.sailing && this.sailing.phase !== "offshore") {
      const voyage = this.sailing, t = Math.min(1, voyage.elapsed / voyage.duration), eased = t * t * (3 - 2 * t);
      const offscreenX = -this.origin.x / this.scale - 100;
      const x = voyage.phase === "departing" ? berth.x + (offscreenX - berth.x) * eased : offscreenX + (berth.x - offscreenX) * eased;
      ctx.save(); ctx.translate(x, berth.y);
      for (let i = 0; i < 4; i++) ellipse(ctx, 18 + i * 9, 8, 10 + i * 3, 2, "#d7ece83c");
      drawSymbol(ctx, { ...this.boat, afloat: true }, island, time);
      ctx.save(); ctx.translate(-5, -5); ctx.scale(.5, .5); drawSymbol(ctx, { kind: "hero", style: this.heroStyle }, island, time); ctx.restore();
      ctx.restore();
    }
    const labels = [];
    for (const feature of [...this.features].sort((a, b) => this.project(a.x, a.z, a.level).y - this.project(b.x, b.z, b.level).y)) {
      if (feature.kind === "boat" && this.sailing) continue;
      const p = this.featurePoint(feature), visited = this.visited.get(island.id).has(feature.index);
      const text = `${visited ? "✓ " : ""}${feature.name}`;
      ctx.font = '600 11px "Segoe UI", sans-serif';
      const width = ctx.measureText(text).width + 18;
      const left = p.x - width / 2;
      let top = p.y + 14;
      // Offset nearby place names instead of letting the map labels collide.
      for (const other of labels) {
        if (left < other.left + other.width + 4 && left + width + 4 > other.left && top < other.top + 24 && top + 24 > other.top) top = other.top + 25;
      }
      if (top > p.y + 14) polygon(ctx, [[p.x, p.y + 10], [p.x, top]], "transparent", "#e7dab5a0");
      labels.push({ left, top, width, feature });
      ctx.fillStyle = "#183c37eb"; ctx.beginPath(); ctx.roundRect(left, top, width, 20, 3); ctx.fill();
      ctx.strokeStyle = visited ? "#c9b775" : "#91b5a45c"; ctx.lineWidth = .7; ctx.stroke();
      ctx.fillStyle = visited ? "#e8cc83" : "#f2ead3"; ctx.textAlign = "center"; ctx.fillText(text, p.x, top + 14);
    }
    this.labels = labels;
    ctx.restore();
    if (!this.editorMode) this.drawCompass(ctx);
  }

  drawCompass(ctx) {
    ctx.save(); ctx.translate(49, this.height - (this.width > 800 ? 67 : 244));
    ellipse(ctx, 0, 0, 24, 24, "#113c454d");
    ctx.strokeStyle = "#e9d5a16b"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
    polygon(ctx, [[0, -20], [6, 0], [0, 17], [-6, 0]], "#e4cd93"); polygon(ctx, [[0, -20], [0, 0], [-6, 0]], "#fff2cb");
    polygon(ctx, [[-17, 0], [0, -5], [17, 0], [0, 5]], "#b9c3aa"); ellipse(ctx, 0, 0, 3, 3, "#234c49");
    ctx.font = '10px Georgia'; ctx.textAlign = "center"; ctx.fillStyle = "#e9d5a1"; ctx.fillText("N", 0, -30); ctx.restore();
  }
}

function noise(x, y, seed) { const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return v - Math.floor(v); }
function random(seed) { let n = seed >>> 0; return () => { n = Math.imul(n, 1664525) + 1013904223 | 0; return (n >>> 0) / 4294967296; }; }
