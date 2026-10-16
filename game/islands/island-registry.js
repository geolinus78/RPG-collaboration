import emmaIsland from "./emma-island.js";
import charlieIsland from "./charlie-island.js";
import finnIsland from "./finn-island.js";
import neoIsland from "./neo-island.js";
import { validateIsland } from "./island-schema.js";

export const islands = [emmaIsland, charlieIsland, finnIsland, neoIsland];

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
