// Map team: edit this file to change rooms, tiles, items, and NPC positions.
window.GAME_WORLD = {
  start: {
    mapId: "archipelago",
    x: 6,
    y: 5
  },

  tiles: {
    "~": {
      name: "open sea",
      sprite: "ocean",
      blocked: false
    },
    "=": {
      name: "sea route",
      sprite: "route",
      blocked: false
    },
    ".": {
      name: "island shore",
      sprite: "shore",
      blocked: false
    },
    "j": {
      name: "jungle island",
      sprite: "jungle",
      blocked: false
    },
    "c": {
      name: "cloud island",
      sprite: "cloud",
      blocked: false
    },
    "r": {
      name: "ruins",
      sprite: "ruins",
      blocked: false
    },
    "m": {
      name: "mountains",
      sprite: "mountain",
      blocked: true,
      bumpMessage: "The mountain cliffs are too steep from this side."
    }
  },

  maps: {
    archipelago: {
      name: "New Archipelago",
      rows: [
        "~~~~~~~~~~~~~",
        "~~...~~~...~~",
        "~..j.~~.c..~~",
        "~~...~~~...~~",
        "~~~~~===~~~~~",
        "~...~~=~~...~",
        "~.r.~~=~~m.~~",
        "~...~~=~~...~",
        "~~~~~===~~~~~",
        "~~....~....~~",
        "~..m..~..j..~",
        "~~....~....~~",
        "~~~~~~~~~~~~~"
      ],
      features: [
        {
          id: "harbor_notes",
          type: "sign",
          x: 6,
          y: 5,
          name: "Harbor Notes",
          sprite: "sign",
          dialogueId: "harbor_notes"
        },
        {
          id: "mira",
          type: "npc",
          x: 10,
          y: 6,
          name: "Mira",
          sprite: "npc",
          dialogueId: "mira_warning"
        },
        {
          id: "old_compass",
          type: "item",
          x: 2,
          y: 6,
          name: "Old Compass",
          itemId: "oldCompass",
          sprite: "key",
          pickupText: "You found an old compass. It points through the fog instead of north."
        },
        {
          id: "windcurve_island",
          type: "sign",
          x: 3,
          y: 2,
          name: "Windcurve Island",
          sprite: "home",
          dialogueId: "windcurve_note"
        },
        {
          id: "cloudhook_island",
          type: "sign",
          x: 9,
          y: 2,
          name: "Cloudhook Island",
          sprite: "sign",
          dialogueId: "cloudhook_note"
        },
        {
          id: "fog_gate",
          type: "gate",
          x: 6,
          y: 8,
          name: "Fog Gate",
          sprite: "gate",
          requiresItem: "oldCompass",
          flag: "fogGateOpen",
          lockedText: "A wall of fog blocks the southern route. The old stories say only a true compass can find the way.",
          openText: "The old compass spins, then steadies. A safe route opens through the fog."
        }
      ]
    }
  }
};
