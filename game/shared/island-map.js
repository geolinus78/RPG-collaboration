export const STEP = 4;
export const GRID_LIMIT = 18;
export const tileKey = (x, z) => `${x},${z}`;
export const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const TERRAINS = [
  { id: "grass", name: "Grassland", color: "#78a968" },
  { id: "meadow", name: "Flower meadow", color: "#a0b66d" },
  { id: "jungle", name: "Jungle floor", color: "#477b50" },
  { id: "sand", name: "Golden sand", color: "#e8cc7d" },
  { id: "path", name: "Earth path", color: "#c5a46f" },
  { id: "cobble", name: "Cobblestones", color: "#aaa58f" },
  { id: "rock", name: "Mountain stone", color: "#7d8580" },
  { id: "snow", name: "Snow", color: "#d9e4df" },
  { id: "ash", name: "Volcanic ash", color: "#515453" },
  { id: "lava", name: "Lava field", color: "#bd6744" },
  { id: "moss", name: "Moss", color: "#6f8c65" },
  { id: "water", name: "Ocean / erase land", color: "#347c91" }
];
export function noise(x, z, seed) { const n = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453; return n - Math.floor(n); }
export function random(seed) { let n = seed >>> 0; return () => { n = Math.imul(n, 1664525) + 1013904223 | 0; return (n >>> 0) / 4294967296; }; }

export function generateTiles(island) {
  const tiles = [], half = Math.ceil(island.terrain.size / STEP / 2);
  for (let x = -half; x <= half; x++) for (let z = -half; z <= half; z++) {
    const nx = x / (half * .93), nz = z / (half * .77), angle = Math.atan2(nz, nx);
    const wobble = (Math.sin(angle * 3 + island.terrain.seed) * .1 + Math.cos(angle * 5) * .07) * island.terrain.coastWobble;
    const inland = 1 - Math.hypot(nx, nz) - wobble;
    if (inland < 0) continue;
    const variation = Math.sin(x * .5 + island.terrain.seed) * Math.cos(z * .5) * island.terrain.roughness * .1;
    const level = inland < .12 ? 0 : 1 + Math.floor(Math.max(0, inland - .24 + variation) * island.terrain.height * .28);
    tiles.push({ x, z, level, terrain: inland < .12 ? "sand" : "grass" });
  }
  return tiles;
}

export function nearestTile(tiles, x, z) {
  let nearest, distance = Infinity;
  for (const tile of tiles) {
    const d = Math.hypot(tile.x - x, tile.z - z);
    if (d < distance) { nearest = tile; distance = d; }
  }
  return nearest;
}

export function connected(tiles) {
  if (!tiles.length) return false;
  const map = new Map(tiles.map(t => [tileKey(t.x, t.z), t]));
  const queue = [tiles[0]], seen = new Set([tileKey(tiles[0].x, tiles[0].z)]);
  for (let i = 0; i < queue.length; i++) for (const [dx, dz] of DIRECTIONS) {
    const key = tileKey(queue[i].x + dx, queue[i].z + dz);
    if (map.has(key) && !seen.has(key)) { queue.push(map.get(key)); seen.add(key); }
  }
  return seen.size === tiles.length;
}

// Choose a coast with an unobstructed westward shipping lane. Boat coordinates
// are in ocean cells; the shore cell is only the walking / boarding target.
export function findMooring(tiles, preferred = [-8, 5]) {
  const occupied = new Set(tiles.map(t => tileKey(t.x, t.z)));
  const candidates = tiles.filter(t => {
    for (let i = 1; i <= GRID_LIMIT * 2 + 2; i++) if (occupied.has(tileKey(t.x - i, t.z + i))) return false;
    return !occupied.has(tileKey(t.x - 1, t.z)) || !occupied.has(tileKey(t.x, t.z + 1));
  });
  candidates.sort((a, b) => Math.hypot(a.x - preferred[0], a.z - preferred[1]) - Math.hypot(b.x - preferred[0], b.z - preferred[1]));
  const shore = candidates[0] || tiles[0];
  return { shore: { ...shore }, x: shore.x - 1.6, z: shore.z + 1.6, level: -1.3 };
}

export function initialDesign(island) {
  const tiles = generateTiles(island), objects = [];
  island.landmarks.forEach((object, index) => {
    if (object.kind === "boat") return;
    const tile = nearestTile(tiles, object.position[0] / STEP, object.position[1] / STEP);
    objects.push({ ...object, id: `landmark-${index}`, x: tile.x, z: tile.z, variant: .5, landmark: true });
  });
  island.creatures.forEach((object, index) => {
    const tile = nearestTile(tiles, object.position[0] / STEP, object.position[1] / STEP);
    objects.push({ ...object, id: `creature-${index}`, x: tile.x, z: tile.z, variant: .5 });
  });
  const rng = random(island.terrain.seed);
  for (const tile of tiles) {
    if (tile.terrain === "sand" || objects.some(o => Math.hypot(o.x - tile.x, o.z - tile.z) < 1.8)) continue;
    const roll = rng(), n = island.nature;
    const kind = roll < n.trees / 950 ? "tree" : roll < (n.trees + n.rocks * .6) / 950 ? "rock" : roll < (n.trees + n.rocks * .6 + n.crystals * .65) / 950 ? "crystal" : rng() < n.flowers / 650 ? "flowers" : null;
    if (kind) objects.push({ id: `nature-${tile.x}-${tile.z}`, kind, name: kind, x: tile.x, z: tile.z, variant: rng(), color: kind === "crystal" ? island.palette.shallowWater : island.palette.highland });
  }
  return { tiles, objects, revision: 0 };
}

export function validateDesign(design, allowedKinds) {
  if (!design || !Array.isArray(design.tiles) || !Array.isArray(design.objects)) return "Island data is missing.";
  if (design.tiles.length < 12 || design.tiles.length > (GRID_LIMIT * 2 + 1) ** 2) return "Keep at least twelve land tiles.";
  if (design.objects.length > 500) return "An island can have up to 500 objects.";
  const keys = new Set(), terrainIds = new Set(TERRAINS.filter(t => t.id !== "water").map(t => t.id));
  for (const tile of design.tiles) {
    if (!Number.isInteger(tile.x) || !Number.isInteger(tile.z) || Math.abs(tile.x) > GRID_LIMIT || Math.abs(tile.z) > GRID_LIMIT || !Number.isSafeInteger(tile.level) || tile.level < 0 || !terrainIds.has(tile.terrain)) return "A terrain tile has invalid settings.";
    const key = tileKey(tile.x, tile.z);
    if (keys.has(key)) return "Terrain tiles must be unique.";
    keys.add(key);
  }
  if (!connected(design.tiles)) return "Keep all land connected so players can explore the whole island.";
  const ids = new Set();
  for (const object of design.objects) {
    if (!object || typeof object.id !== "string" || object.id.length > 80 || ids.has(object.id) || !allowedKinds.has(object.kind) || object.kind === "boat" || !keys.has(tileKey(object.x, object.z)) || !Number.isFinite(object.variant) || object.variant < 0 || object.variant > 1 || !/^#[0-9a-f]{6}$/i.test(object.color || "") || typeof object.name !== "string" || object.name.length > 70 || (object.message != null && (typeof object.message !== "string" || object.message.length > 400))) return "An object has invalid settings or needs to be on land.";
    ids.add(object.id);
  }
  return null;
}
