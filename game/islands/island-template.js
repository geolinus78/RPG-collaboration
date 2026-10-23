// Copy this file only when the group adds another island.
// For the current project, edit your assigned Emma, Charlie, Finn, or Neo file instead.
export default {
  id: "my-island",
  name: "My Island",
  designer: "Your Name",
  tagline: "One short sentence that makes the island sound exciting.",
  biome: "mystery biome",

  palette: {
    deepWater: "#174f70",
    shallowWater: "#49b8c8",
    sand: "#e8cc7d",
    lowland: "#6fae62",
    highland: "#326b4b",
    rock: "#82776c",
    sky: "#91d7e8",
    fog: "#d8edf0"
  },

  terrain: {
    seed: 404,
    size: 104,
    height: 8,
    roughness: 0.5,
    coastWobble: 0.5
  },

  atmosphere: {
    sunIntensity: 1.8,
    fogDensity: 0.012,
    windSpeed: 0.6
  },

  playerStart: [0, 26],

  nature: {
    trees: 70,
    rocks: 40,
    flowers: 40,
    crystals: 10
  },

  landmarks: [
    {
      kind: "ruins",
      name: "Name This Place",
      position: [0, -6],
      color: "#b8b29f",
      message: "Write what the player discovers here."
    },
    {
      kind: "boat",
      name: "My Island Boat",
      position: [25, 16],
      color: "#e8cc7d",
      message: "The boat is ready to sail to another island."
    }
  ],

  creatures: [
    { kind: "spirit", name: "Name This Creature", position: [7, 4], color: "#9fe9df" }
  ],

  challenge: {
    type: "combat",
    name: "Name This Challenge",
    hint: "Defeat the cage guards with F.",
    completeMessage: "The guards are defeated and the cage unlocks!",
    enemies: [
      { name: "Cage Guard", position: [-17, -10], color: "#586c73", glowColor: "#66d3df", health: 3 }
    ]
  },

  rescue: {
    name: "Name This Explorer",
    position: [-22, -12],
    color: "#4f78bd",
    trappedMessage: "Explain what has trapped this person.",
    rescuedMessage: "Explain what happens when the player rescues them."
  },

  story: {
    arrival: "What does the player notice when they arrive?",
    goal: "What should the player try to do?",
    secret: "What surprising truth is hidden here?"
  }
};
