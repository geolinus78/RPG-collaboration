const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { window: {} };

function loadScript(relativePath) {
  const fullPath = path.join(root, relativePath);
  const code = fs.readFileSync(fullPath, "utf8");
  vm.runInNewContext(code, sandbox, { filename: relativePath });
}

loadScript("game/data/world.js");
loadScript("game/data/dialogue.js");
loadScript("game/data/quests.js");

const world = sandbox.window.GAME_WORLD;
const dialogue = sandbox.window.GAME_DIALOGUE;
const quests = sandbox.window.GAME_QUESTS;
const errors = [];

function check(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

check(world && world.maps, "GAME_WORLD must define maps.");
check(Array.isArray(quests), "GAME_QUESTS must be an array.");
check(dialogue && typeof dialogue === "object", "GAME_DIALOGUE must be an object.");

Object.entries(world.maps).forEach(([mapId, map]) => {
  check(Array.isArray(map.rows), `${mapId} must have rows.`);
  check(map.rows.length > 0, `${mapId} must have at least one row.`);

  const width = map.rows[0].length;
  map.rows.forEach((row, rowIndex) => {
    check(row.length === width, `${mapId} row ${rowIndex} should be ${width} tiles wide.`);
    row.split("").forEach((symbol) => {
      check(world.tiles[symbol], `${mapId} uses unknown tile symbol "${symbol}".`);
    });
  });

  map.features.forEach((feature) => {
    check(feature.x >= 0 && feature.x < width, `${feature.id} x position is outside ${mapId}.`);
    check(feature.y >= 0 && feature.y < map.rows.length, `${feature.id} y position is outside ${mapId}.`);
    check(feature.name, `${feature.id} needs a name.`);
    check(feature.sprite, `${feature.id} needs a sprite name.`);

    if (feature.dialogueId) {
      check(dialogue[feature.dialogueId], `${feature.id} points to missing dialogue "${feature.dialogueId}".`);
    }
  });
});

if (errors.length) {
  console.error("Game validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Game validation passed.");

