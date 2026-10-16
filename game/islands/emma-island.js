// EMMA OWNS THIS FILE. Other teammates should not edit it at the same time.
export default {
  id: "emma-island",
  name: "Emma Island",
  designer: "Emma",
  tagline: "The safe harbor where every expedition begins.",
  biome: "sunlit harbor",

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
    seed: 11,
    size: 112,
    height: 10,
    roughness: 0.34,
    coastWobble: 0.42
  },

  atmosphere: {
    sunIntensity: 2.3,
    fogDensity: 0.009,
    windSpeed: 0.55
  },

  playerStart: [0, 26],

  nature: {
    trees: 240,
    rocks: 90,
    flowers: 260,
    crystals: 18
  },

  landmarks: [
    {
      kind: "village",
      name: "Expedition Harbor",
      position: [0, 4],
      color: "#b75b45",
      message: "Maps, supplies, and three empty docks wait for the young island designers."
    },
    {
      kind: "tower",
      name: "Beacon Tower",
      position: [-22, -10],
      color: "#f4d66d",
      message: "The beacon points toward three islands that do not appear on any old chart."
    },
    {
      kind: "shipwreck",
      name: "The Returned Bow",
      position: [25, 10],
      color: "#6e4835",
      message: "Only the front of the previous explorers' ship returned with the tide."
    },
    {
      kind: "boat",
      name: "Emma's Explorer Boat",
      position: [-28, 18],
      color: "#f0c85a",
      message: "Climb aboard to sail to another island."
    }
  ],

  creatures: [
    { kind: "bird", name: "Harbor Gull", position: [-16, 20], color: "#f8f3df" },
    { kind: "fox", name: "Dock Fox", position: [18, 8], color: "#cf7044" }
  ],

  story: {
    arrival: "You arrive on Emma Island, where the Harbor of Legends is preparing an expedition.",
    goal: "Explore Emma Island and find the explorer boat when you are ready to travel.",
    secret: "The broken ship carries a compass mark that matches all three islands."
  }
};
