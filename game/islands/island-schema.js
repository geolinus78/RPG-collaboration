export const ISLAND_LIMITS = {
  maxLandmarks: 16,
  maxCreatures: 14,
  maxScatterPerType: 400,
  maxTerrainSize: 140,
  minTerrainSize: 70
};

export const ALLOWED_LANDMARKS = [
  "boat",
  "camp",
  "crystal",
  "gate",
  "ruins",
  "shipwreck",
  "tower",
  "village"
];

export const ALLOWED_CREATURES = ["bird", "crawler", "fox", "spirit"];
export const ALLOWED_CHALLENGES = ["combat", "runes"];

export function validateIsland(island) {
  const errors = [];

  if (!island || typeof island !== "object") {
    return ["Island must export an object."];
  }

  requireText(island.id, "id", errors);
  requireText(island.name, "name", errors);
  requireText(island.designer, "designer", errors);
  requireText(island.tagline, "tagline", errors);
  requireText(island.biome, "biome", errors);

  if (!island.palette || typeof island.palette !== "object") {
    errors.push("palette must be an object of CSS hex colors.");
  } else {
    ["deepWater", "shallowWater", "sand", "lowland", "highland", "rock", "sky", "fog"].forEach(
      (key) => requireColor(island.palette[key], `palette.${key}`, errors)
    );
  }

  if (!island.terrain || typeof island.terrain !== "object") {
    errors.push("terrain must be an object.");
  } else {
    requireRange(island.terrain.size, ISLAND_LIMITS.minTerrainSize, ISLAND_LIMITS.maxTerrainSize, "terrain.size", errors);
    requireRange(island.terrain.height, 3, 14, "terrain.height", errors);
    requireRange(island.terrain.roughness, 0, 1, "terrain.roughness", errors);
    requireRange(island.terrain.coastWobble, 0, 1, "terrain.coastWobble", errors);
    requireNumber(island.terrain.seed, "terrain.seed", errors);
  }

  if (!island.atmosphere || typeof island.atmosphere !== "object") {
    errors.push("atmosphere must be an object.");
  } else {
    requireRange(island.atmosphere.sunIntensity, 0.5, 4, "atmosphere.sunIntensity", errors);
    requireRange(island.atmosphere.fogDensity, 0, 0.05, "atmosphere.fogDensity", errors);
    requireRange(island.atmosphere.windSpeed, 0, 3, "atmosphere.windSpeed", errors);
  }

  validatePosition(island.playerStart, "playerStart", errors);

  if (!island.nature || typeof island.nature !== "object") {
    errors.push("nature must be an object.");
  } else {
    ["trees", "rocks", "flowers", "crystals"].forEach((key) => {
      requireRange(island.nature[key], 0, ISLAND_LIMITS.maxScatterPerType, `nature.${key}`, errors);
    });
  }

  if (!Array.isArray(island.landmarks)) {
    errors.push("landmarks must be an array.");
  } else {
    if (island.landmarks.length > ISLAND_LIMITS.maxLandmarks) {
      errors.push(`landmarks can contain at most ${ISLAND_LIMITS.maxLandmarks} entries.`);
    }
    island.landmarks.forEach((landmark, index) => {
      if (!ALLOWED_LANDMARKS.includes(landmark.kind)) {
        errors.push(`landmarks[${index}].kind must be one of: ${ALLOWED_LANDMARKS.join(", ")}.`);
      }
      requireText(landmark.name, `landmarks[${index}].name`, errors);
      requireText(landmark.message, `landmarks[${index}].message`, errors);
      validatePosition(landmark.position, `landmarks[${index}].position`, errors);
    });
    if (!island.landmarks.some((landmark) => landmark.kind === "boat")) {
      errors.push("landmarks must include one boat so the player can travel.");
    }
  }

  if (!Array.isArray(island.creatures)) {
    errors.push("creatures must be an array.");
  } else {
    if (island.creatures.length > ISLAND_LIMITS.maxCreatures) {
      errors.push(`creatures can contain at most ${ISLAND_LIMITS.maxCreatures} entries.`);
    }
    island.creatures.forEach((creature, index) => {
      if (!ALLOWED_CREATURES.includes(creature.kind)) {
        errors.push(`creatures[${index}].kind must be one of: ${ALLOWED_CREATURES.join(", ")}.`);
      }
      requireText(creature.name, `creatures[${index}].name`, errors);
      validatePosition(creature.position, `creatures[${index}].position`, errors);
    });
  }

  if (!island.rescue || typeof island.rescue !== "object") {
    errors.push("rescue must describe the person who needs help.");
  } else {
    requireText(island.rescue.name, "rescue.name", errors);
    requireText(island.rescue.trappedMessage, "rescue.trappedMessage", errors);
    requireText(island.rescue.rescuedMessage, "rescue.rescuedMessage", errors);
    requireColor(island.rescue.color, "rescue.color", errors);
    validatePosition(island.rescue.position, "rescue.position", errors);
  }

  if (!island.challenge || typeof island.challenge !== "object") {
    errors.push("challenge must describe how the rescue cage is unlocked.");
  } else {
    if (!ALLOWED_CHALLENGES.includes(island.challenge.type)) {
      errors.push(`challenge.type must be one of: ${ALLOWED_CHALLENGES.join(", ")}.`);
    }
    requireText(island.challenge.name, "challenge.name", errors);
    requireText(island.challenge.hint, "challenge.hint", errors);
    requireText(island.challenge.completeMessage, "challenge.completeMessage", errors);

    if (island.challenge.type === "combat") {
      if (!Array.isArray(island.challenge.enemies) || island.challenge.enemies.length < 1) {
        errors.push("challenge.enemies must contain at least one enemy.");
      } else {
        if (island.challenge.enemies.length > 6) {
          errors.push("challenge.enemies can contain at most 6 enemies.");
        }
        island.challenge.enemies.forEach((enemy, index) => {
          requireText(enemy.name, `challenge.enemies[${index}].name`, errors);
          requireColor(enemy.color, `challenge.enemies[${index}].color`, errors);
          requireColor(enemy.glowColor, `challenge.enemies[${index}].glowColor`, errors);
          requireRange(enemy.health, 1, 6, `challenge.enemies[${index}].health`, errors);
          validatePosition(enemy.position, `challenge.enemies[${index}].position`, errors);
        });
      }
    }

    if (island.challenge.type === "runes") {
      if (!Array.isArray(island.challenge.nodes) || island.challenge.nodes.length < 2) {
        errors.push("challenge.nodes must contain at least two rune nodes.");
      } else {
        if (island.challenge.nodes.length > 6) {
          errors.push("challenge.nodes can contain at most 6 rune nodes.");
        }
        island.challenge.nodes.forEach((node, index) => {
          requireText(node.symbol, `challenge.nodes[${index}].symbol`, errors);
          requireText(node.name, `challenge.nodes[${index}].name`, errors);
          requireColor(node.color, `challenge.nodes[${index}].color`, errors);
          requireRange(node.height, 0, 8, `challenge.nodes[${index}].height`, errors);
          validatePosition(node.position, `challenge.nodes[${index}].position`, errors);
        });
      }
      if (!Array.isArray(island.challenge.sequence) || island.challenge.sequence.length !== island.challenge.nodes?.length) {
        errors.push("challenge.sequence must list every rune symbol in order.");
      } else {
        const nodeSymbols = new Set(island.challenge.nodes.map((node) => node.symbol));
        const sequenceSymbols = new Set(island.challenge.sequence);
        if (nodeSymbols.size !== island.challenge.nodes.length || sequenceSymbols.size !== nodeSymbols.size) {
          errors.push("Every rune symbol must be unique and appear once in challenge.sequence.");
        } else if (island.challenge.sequence.some((symbol) => !nodeSymbols.has(symbol))) {
          errors.push("challenge.sequence can only use symbols from challenge.nodes.");
        }
      }
    }
  }

  if (!island.story || typeof island.story !== "object") {
    errors.push("story must be an object.");
  } else {
    requireText(island.story.arrival, "story.arrival", errors);
    requireText(island.story.goal, "story.goal", errors);
    requireText(island.story.secret, "story.secret", errors);
  }

  return errors;
}

function requireText(value, path, errors) {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${path} must be a non-empty string.`);
  }
}

function requireNumber(value, path, errors) {
  if (!Number.isFinite(value)) {
    errors.push(`${path} must be a number.`);
  }
}

function requireRange(value, min, max, path, errors) {
  requireNumber(value, path, errors);
  if (Number.isFinite(value) && (value < min || value > max)) {
    errors.push(`${path} must be between ${min} and ${max}.`);
  }
}

function requireColor(value, path, errors) {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) {
    errors.push(`${path} must be a six-digit hex color such as #4ca7c9.`);
  }
}

function validatePosition(value, path, errors) {
  if (!Array.isArray(value) || value.length !== 2 || value.some((number) => !Number.isFinite(number))) {
    errors.push(`${path} must be [x, z], for example [4, -7].`);
  }
}
