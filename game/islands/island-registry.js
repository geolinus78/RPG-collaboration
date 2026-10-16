import harborIsland from "./harbor-island.js";
import kidOneIsland from "./kid-one-island.js";
import kidTwoIsland from "./kid-two-island.js";
import kidThreeIsland from "./kid-three-island.js";
import { validateIsland } from "./island-schema.js";

export const islands = [harborIsland, kidOneIsland, kidTwoIsland, kidThreeIsland];

export function getIsland(id) {
  return islands.find((island) => island.id === id) || islands[0];
}

export function validateRegistry() {
  const errors = [];
  const ids = new Set();

  islands.forEach((island) => {
    validateIsland(island).forEach((message) => errors.push(`${island.name || island.id || "Unknown island"}: ${message}`));
    if (ids.has(island.id)) {
      errors.push(`Duplicate island id: ${island.id}.`);
    }
    ids.add(island.id);
  });

  return errors;
}
