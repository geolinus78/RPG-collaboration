// Copy this file only when the group adds a fourth island.
// For the current project, edit your assigned kid-one, kid-two, or kid-three file instead.
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
    size: 52,
    height: 8,
    roughness: 0.5,
    coastWobble: 0.5
  },

  atmosphere: {
    sunIntensity: 1.8,
    fogDensity: 0.012,
    windSpeed: 0.6
  },

  playerStart: [0, 15],

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
    }
  ],

  creatures: [
    { kind: "spirit", name: "Name This Creature", position: [7, 4], color: "#9fe9df" }
  ],

  story: {
    arrival: "What does the player notice when they arrive?",
    goal: "What should the player try to do?",
    secret: "What surprising truth is hidden here?"
  }
};
