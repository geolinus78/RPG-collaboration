// Map team: edit this file to change rooms, tiles, items, and NPC positions.
window.GAME_WORLD = {
  start: {
    mapId: "meadow",
    x: 4,
    y: 4
  },

  tiles: {
    ".": {
      name: "grass",
      sprite: "grass",
      blocked: false
    },
    "=": {
      name: "path",
      sprite: "path",
      blocked: false
    },
    "#": {
      name: "trees",
      sprite: "tree",
      blocked: true,
      bumpMessage: "The trees are too thick to walk through."
    },
    "~": {
      name: "water",
      sprite: "water",
      blocked: true,
      bumpMessage: "The stream is too deep here."
    }
  },

  maps: {
    meadow: {
      name: "Meadow Village",
      rows: [
        "#########",
        "#...=...#",
        "#..===..#",
        "#...=...#",
        "#...=...#",
        "#..~~~..#",
        "#...=...#",
        "#.......#",
        "#########"
      ],
      features: [
        {
          id: "sign_welcome",
          type: "sign",
          x: 4,
          y: 1,
          name: "Welcome Sign",
          sprite: "sign",
          dialogueId: "welcome_sign"
        },
        {
          id: "riley",
          type: "npc",
          x: 2,
          y: 2,
          name: "Riley",
          sprite: "npc",
          dialogueId: "riley_intro"
        },
        {
          id: "moon_key",
          type: "item",
          x: 6,
          y: 2,
          name: "Moon Key",
          itemId: "moonKey",
          sprite: "key",
          pickupText: "You found the Moon Key. The gate might open now."
        },
        {
          id: "home",
          type: "sign",
          x: 4,
          y: 3,
          name: "Workshop",
          sprite: "home",
          dialogueId: "workshop_note"
        },
        {
          id: "north_gate",
          type: "gate",
          x: 4,
          y: 6,
          name: "North Gate",
          sprite: "gate",
          requiresItem: "moonKey",
          flag: "gateOpen",
          lockedText: "The gate is locked. A moon-shaped keyhole shines on the handle.",
          openText: "The Moon Key turns. The gate opens with a bright click."
        }
      ]
    }
  }
};
