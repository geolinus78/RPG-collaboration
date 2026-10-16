import islandTemplate from "../game/islands/island-template.js";
import { islands, validateRegistry } from "../game/islands/island-registry.js";
import { validateIsland } from "../game/islands/island-schema.js";

const errors = validateRegistry();
validateIsland(islandTemplate).forEach((message) => errors.push(`Island template: ${message}`));

if (errors.length > 0) {
  console.error("Island validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("All island files are valid:");
islands.forEach((island) => {
  console.log(`- ${island.name} by ${island.designer}: ${island.landmarks.length} landmarks, ${island.creatures.length} creatures`);
});
