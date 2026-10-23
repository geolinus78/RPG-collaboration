import assert from "node:assert/strict";
import { IslandWorld } from "../game/src/island-engine.js";
import { islands } from "../game/islands/island-registry.js";
import { shade } from "../game/src/map-art.js";
import { initialDesign } from "../game/shared/island-map.js";

assert.equal(shade(shade("#ff00ff", .5), -.5), "rgb(128,64,128)", "Layered shading must remain a valid canvas color");

// Exercise routing and exploration without a browser or a WebGL dependency.
// Drawing is checked separately in the browser; this context only supplies its API.
const gradient = { addColorStop() {} };
const context = new Proxy({}, { get: (_, name) => name === "measureText" ? text => ({ width: text.length * 6 }) : name === "createLinearGradient" || name === "createRadialGradient" ? () => gradient : () => {} });
const canvas = () => ({ parentElement: { clientWidth: 1240, clientHeight: 760 }, getContext: () => context, addEventListener() {} });
globalThis.window = { devicePixelRatio: 1, addEventListener() {} };
globalThis.document = { createElement: canvas };
globalThis.ResizeObserver = class { observe() {} };
globalThis.requestAnimationFrame = () => {};

let travelCount = 0, discoveryCount = 0;
const world = new IslandWorld({ canvas: canvas(), onMessage() {}, onTravel: () => travelCount++, onDiscovery: () => discoveryCount++ });
world.setActive(true);
for (const island of islands) {
  world.loadIsland(island);
  assert.ok(!world.tiles.has(`${Math.round(world.boat.waterX)},${Math.round(world.boat.waterZ)}`), "The boat must moor in water");
  for (let i = 1; i < 40; i++) assert.ok(!world.tiles.has(`${world.mooring.shore.x - i},${world.mooring.shore.z + i}`), "The departure lane must not cross land");
  const arrival = { ...world.player };
  world.interact();
  assert.equal(travelCount, islands.indexOf(island), "Travel requires reaching a boat");
  for (const feature of world.features) {
    const path = world.findPath(arrival, feature);
    assert.ok(path.length, `${island.name}: ${feature.name} must be reachable`);
    assert.ok(path.every(tile => world.tiles.has(`${tile.x},${tile.z}`)), "Route must stay on land");
    world.walkTo(feature);
    for (let i = 0; world.route.length && i < 3000; i++) world.update(.05);
    assert.equal(world.route.length, 0, "Walking must reach the target");
    assert.equal(world.targetFeature, null, "Arrival must complete the interaction");
    assert.ok(world.visited.get(island.id).has(feature.index), "Landmark discovery must update the journal");
    if (feature.kind === "boat") {
      assert.equal(travelCount, islands.indexOf(island), "Choosing a destination must wait for the boat to depart");
      assert.equal(world.sailing.phase, "departing");
      for (let i = 0; i < 20; i++) world.update(.05);
      assert.equal(travelCount, islands.indexOf(island), "The boat must sail before the menu opens");
      for (let i = 0; i < 50; i++) world.update(.05);
      assert.equal(world.sailing.phase, "offshore");
      let arrived = false;
      world.arrive(() => { arrived = true; });
      assert.equal(arrived, false, "Arrival must animate before disembarking");
      for (let i = 0; i < 70; i++) world.update(.05);
      assert.equal(arrived, true); assert.equal(world.sailing, null);
      assert.equal(world.player.x, world.mooring.shore.x);
    }
  }
  assert.equal(world.visited.get(island.id).size, island.landmarks.length);
  assert.equal(travelCount, islands.indexOf(island) + 1, "Each island's boat must allow travel");
  // All feature kinds and creature types must draw without throwing.
  for (const style of ["trail", "guard", "star"]) { world.setHeroStyle(style); world.draw(1); }
  world.walkTo(world.features[0]);
  const paused = { ...world.player };
  world.setActive(false); world.update(.5);
  assert.deepEqual(world.player, paused, "Menus must pause movement");
  world.setActive(true);
  world.setZoom(100); assert.equal(world.zoom, 2.5);
  world.setZoom(-100); assert.equal(world.zoom, .7);
  world.width = 390; world.height = 780; world.setZoom(1); world.draw(2);
  assert.ok(world.scale > 0, "Narrow screens must retain a usable map scale");
  console.log(`${island.name}: all landmarks reachable, exploration and boat travel pass`);
}
world.loadIsland(islands[0]);
assert.equal(world.visited.get(islands[0].id).size, islands[0].landmarks.length, "Return voyages must retain discoveries");
assert.ok(discoveryCount >= 20);
console.log("Map validation passed.");

for (const height of [6, 100, 10000, 1000000]) {
  const design = initialDesign(islands[0]);
  design.tiles.find(t => t.x === 0 && t.z === 0).level = height;
  world.loadIsland(islands[0], design); world.draw(1);
  const peak = world.project(0, 0, height), base = world.project(0, 0, 0);
  assert.ok(world.mapBounds.top <= peak.y - 12, "The cache must include the peak");
  assert.ok(world.mapBounds.top + world.mapLayer.height / world.mapBounds.scale >= base.y + 13, "The cache must include the base of the cliffs");
  assert.ok(world.mapLayer.width <= 2048 && world.mapLayer.height <= 1536, "Taller terrain must not allocate enormous bitmaps");
  assert.ok(Number.isFinite(world.scale) && world.scale > 0);
}
console.log("Tall terrain: uncapped heights and bounded rendering cache pass.");
