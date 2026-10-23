import { IslandWorld } from "./island-engine.js";
import { drawSymbol } from "./map-art.js";
import { OBJECTS } from "../shared/object-library.js";
import { TERRAINS, GRID_LIMIT, tileKey, connected } from "../shared/island-map.js";

export class IslandEditor {
  constructor({ onChange, onFinish }) {
    this.onChange = onChange;
    this.canvas = document.getElementById("editorCanvas");
    this.world = new IslandWorld({ canvas: this.canvas, onMessage() {}, onTravel() {} });
    this.world.editorMode = true;
    this.tool = "paint"; this.terrain = "grass"; this.brushSize = 1;
    this.undoStack = []; this.redoStack = [];
    this.locked = false;
    this.status = document.getElementById("editorStatus");
    this.buildLibrary();
    document.getElementById("finishDesignButton").addEventListener("click", onFinish);
    document.getElementById("brushSize").addEventListener("change", event => { this.brushSize = Number(event.target.value); });
    document.querySelectorAll("[data-editor-tool]").forEach(button => button.addEventListener("click", () => this.setTool(button.dataset.editorTool)));
    document.getElementById("editorUndo").addEventListener("click", () => this.undo());
    document.getElementById("editorRedo").addEventListener("click", () => this.undo(true));
    document.querySelectorAll("[data-editor-zoom]").forEach(button => button.addEventListener("click", () => this.world.setZoom(button.dataset.editorZoom === "fit" ? 1 : this.world.zoom + Number(button.dataset.editorZoom))));
    document.getElementById("objectSearch").addEventListener("input", () => this.filterLibrary());
    document.getElementById("objectCategory").addEventListener("change", () => this.filterLibrary());
    this.canvas.addEventListener("pointerdown", event => this.beginStroke(event));
    this.canvas.addEventListener("pointermove", event => { if (this.stroke && this.tool !== "move") this.applyAt(event); });
    this.canvas.addEventListener("pointerup", event => this.endStroke(event));
    this.canvas.addEventListener("pointercancel", () => { this.stroke = null; });
    this.canvas.addEventListener("dragover", event => event.preventDefault());
    this.canvas.addEventListener("drop", event => {
      event.preventDefault();
      if (this.locked) return;
      const item = OBJECTS.find(object => object.id === event.dataTransfer.getData("text/plain"));
      if (!item) return;
      this.selectedObject = item; this.setTool("place"); this.remember(); this.place(item, this.cellAt(event)); this.flushChanges();
    });
    window.addEventListener("keydown", event => {
      if (document.getElementById("editorScreen").hidden || this.locked || event.target.closest?.("input, select, textarea")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); this.undo(event.shiftKey); }
    });
  }
  load(island, design) {
    this.island = island; this.design = structuredClone(design);
    this.undoStack = []; this.redoStack = []; this.render(); this.buildPreviews();
    document.getElementById("editorIslandName").textContent = island.name;
    this.setTool("paint");
  }
  setLocked(locked) {
    this.locked = locked;
    document.getElementById("finishDesignButton").disabled = locked;
    document.getElementById("editorScreen").classList.toggle("editor-locked", locked);
    if (locked) this.stroke = null;
  }
  setTool(tool) {
    this.tool = tool; this.world.editorPan = tool === "pan";
    this.canvas.style.cursor = tool === "pan" ? "grab" : tool === "move" ? "move" : "crosshair";
    document.querySelectorAll("[data-editor-tool]").forEach(button => button.classList.toggle("selected", button.dataset.editorTool === tool));
    document.querySelectorAll(".object-option").forEach(button => button.classList.toggle("selected", tool === "place" && button.dataset.object === this.selectedObject?.id));
    const names = { paint: `Paint: ${TERRAINS.find(t => t.id === this.terrain).name}`, raise: "Raise terrain", lower: "Lower terrain", erase: "Remove an object", move: "Drag an object to another tile", pan: "Drag the chart to pan", place: `Place: ${this.selectedObject?.name || "choose an object"}` };
    document.getElementById("editorToolLabel").textContent = names[tool];
  }
  buildLibrary() {
    const terrainList = document.getElementById("terrainLibrary");
    for (const terrain of TERRAINS) {
      const button = document.createElement("button"); button.type = "button"; button.className = "terrain-option";
      button.textContent = terrain.name; button.style.setProperty("--swatch", terrain.color); button.dataset.terrain = terrain.id;
      button.addEventListener("click", () => {
        this.terrain = terrain.id; this.setTool("paint");
        terrainList.querySelectorAll("button").forEach(b => b.classList.toggle("selected", b === button));
      });
      button.classList.toggle("selected", terrain.id === this.terrain); terrainList.append(button);
    }
    const library = document.getElementById("objectLibrary");
    for (const item of OBJECTS) {
      const button = document.createElement("button"); button.type = "button"; button.className = "object-option"; button.draggable = true; button.dataset.object = item.id;
      button.title = `Drag ${item.name} onto your island, or select it and click a tile.`;
      const preview = document.createElement("canvas"); preview.width = 160; preview.height = 120; preview.setAttribute("aria-hidden", "true");
      const label = document.createElement("span"); label.textContent = item.name; button.append(preview, label);
      button.addEventListener("click", () => { this.selectedObject = item; this.setTool("place"); });
      button.addEventListener("dragstart", event => { event.dataTransfer.setData("text/plain", item.id); event.dataTransfer.effectAllowed = "copy"; });
      library.append(button);
    }
  }
  buildPreviews() {
    for (const button of document.querySelectorAll(".object-option")) {
      const item = OBJECTS.find(object => object.id === button.dataset.object), canvas = button.querySelector("canvas"), ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, 160, 120); ctx.save(); ctx.translate(80, 105); ctx.scale(1.15, 1.15); drawSymbol(ctx, item, this.island, 1); ctx.restore();
    }
  }
  filterLibrary() {
    const search = document.getElementById("objectSearch").value.toLowerCase(), category = document.getElementById("objectCategory").value;
    document.querySelectorAll(".object-option").forEach(button => {
      const item = OBJECTS.find(object => object.id === button.dataset.object);
      button.hidden = !item.name.toLowerCase().includes(search) || (category !== "All" && item.category !== category);
    });
  }
  cellAt(event) {
    const existing = this.world.tileAtPointer(event);
    if (existing) return { x: existing.x, z: existing.z };
    const rect = this.canvas.getBoundingClientRect(), w = this.world;
    const x = (event.clientX - rect.left - w.origin.x) / w.scale / 24, y = (event.clientY - rect.top - w.origin.y) / w.scale / 12;
    const cell = { x: Math.round((x + y) / 2), z: Math.round((y - x) / 2) };
    return Math.abs(cell.x) <= GRID_LIMIT && Math.abs(cell.z) <= GRID_LIMIT ? cell : null;
  }
  remember() {
    this.undoStack.push(structuredClone(this.design)); if (this.undoStack.length > 40) this.undoStack.shift(); this.redoStack = [];
  }
  undo(redo = false) {
    if (this.locked) return;
    const source = redo ? this.redoStack : this.undoStack, target = redo ? this.undoStack : this.redoStack;
    if (!source.length) return;
    target.push(structuredClone(this.design)); this.design = source.pop(); this.changed();
  }
  beginStroke(event) {
    if (this.locked || this.tool === "pan" || event.button !== 0) return;
    event.preventDefault(); this.canvas.setPointerCapture(event.pointerId); this.remember();
    this.stroke = { cells: new Set(), object: null };
    if (this.tool === "move") {
      const cell = this.cellAt(event);
      this.stroke.object = cell && [...this.design.objects].reverse().find(o => o.x === cell.x && o.z === cell.z);
      if (!this.stroke.object) this.status.textContent = "Start dragging on the base tile of an object.";
    } else this.applyAt(event);
  }
  endStroke(event) {
    if (!this.stroke) return;
    if (this.tool === "move" && this.stroke.object) {
      const cell = this.cellAt(event);
      if (cell && this.design.tiles.some(t => t.x === cell.x && t.z === cell.z)) {
        Object.assign(this.stroke.object, cell); this.changed();
      }
    }
    this.stroke = null;
    this.flushChanges();
  }
  applyAt(event) {
    if (!this.stroke || this.locked) return;
    const cell = this.cellAt(event);
    if (!cell) return;
    if (this.tool === "place") {
      if (!this.stroke.cells.size) { this.stroke.cells.add("placed"); this.place(this.selectedObject, cell); }
      return;
    }
    const radius = this.tool === "erase" ? 0 : this.brushSize - 1;
    let changed = false;
    for (let dx = -radius; dx <= radius; dx++) for (let dz = -radius; dz <= radius; dz++) {
      if (Math.abs(dx) + Math.abs(dz) > radius) continue;
      const x = cell.x + dx, z = cell.z + dz, key = tileKey(x, z);
      if (Math.abs(x) > GRID_LIMIT || Math.abs(z) > GRID_LIMIT || this.stroke.cells.has(key)) continue;
      this.stroke.cells.add(key);
      const index = this.design.tiles.findIndex(t => t.x === x && t.z === z), tile = this.design.tiles[index];
      if (this.tool === "erase") {
        const object = [...this.design.objects].reverse().find(o => o.x === x && o.z === z);
        if (object) { this.design.objects = this.design.objects.filter(o => o.id !== object.id); changed = true; }
      } else if (this.tool === "paint" && this.terrain === "water") {
        if (!tile) continue;
        const next = this.design.tiles.filter((_, i) => i !== index);
        if (next.length < 12 || !connected(next)) { this.status.textContent = "Keep the land connected and at least twelve tiles large."; continue; }
        this.design.tiles = next; this.design.objects = this.design.objects.filter(o => o.x !== x || o.z !== z); changed = true;
      } else if (this.tool === "paint") {
        if (tile) { tile.terrain = this.terrain; changed = true; }
        else if (this.design.tiles.some(t => Math.abs(t.x - x) + Math.abs(t.z - z) === 1)) { this.design.tiles.push({ x, z, level: 0, terrain: this.terrain }); changed = true; }
        else this.status.textContent = "Grow new land out from an existing shoreline tile.";
      } else if (tile && (this.tool === "raise" || this.tool === "lower")) {
        const level = Math.max(0, tile.level + (this.tool === "raise" ? 1 : -1));
        if (Number.isSafeInteger(level)) { tile.level = level; changed = true; }
      }
    }
    if (changed) this.changed();
  }
  place(item, cell) {
    if (!item || !cell || !this.design.tiles.some(t => t.x === cell.x && t.z === cell.z)) { this.status.textContent = "Place objects on a land tile."; return; }
    if (this.design.objects.length >= 500) { this.status.textContent = "The library is full on this island. Remove an object first."; return; }
    if (this.design.objects.some(o => o.x === cell.x && o.z === cell.z)) { this.status.textContent = "That tile already has an object. Move or remove it first."; return; }
    this.design.objects.push({ ...item, id: crypto.randomUUID?.() || `object-${Date.now()}-${Math.random().toString(36).slice(2)}`, ...cell, message: `You discover ${item.name.toLowerCase()} on ${this.island.name}.` });
    this.changed();
  }
  changed() {
    this.render(); this.status.textContent = "Saving island…"; this.dirty = true;
    if (!this.saveTimer) this.saveTimer = setTimeout(() => this.flushChanges(), 200);
  }
  flushChanges() {
    clearTimeout(this.saveTimer); this.saveTimer = null;
    if (!this.dirty) return Promise.resolve();
    this.dirty = false; return this.onChange(structuredClone(this.design));
  }
  render() {
    const { zoom, pan } = this.world;
    this.world.loadIsland(this.island, this.design); this.world.zoom = zoom; this.world.pan = pan;
    this.world.setActive(true); this.world.resize();
    document.getElementById("editorObjectCount").textContent = `${this.design.tiles.length} tiles · ${this.design.objects.length} objects`;
    document.getElementById("editorUndo").disabled = !this.undoStack.length;
    document.getElementById("editorRedo").disabled = !this.redoStack.length;
  }
}
