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
