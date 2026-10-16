export default {
  id: "harbor-of-legends",
  name: "Harbor of Legends",
  designer: "Shared team",
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
    size: 48,
    height: 7,
    roughness: 0.34,
    coastWobble: 0.42
  },

  atmosphere: {
    sunIntensity: 2.3,
    fogDensity: 0.009,
    windSpeed: 0.55
  },

  playerStart: [0, 9],

  nature: {
    trees: 55,
    rocks: 24,
    flowers: 80,
    crystals: 4
  },

  landmarks: [
    {
      kind: "village",
      name: "Expedition Harbor",
      position: [0, 1],
      color: "#b75b45",
      message: "Maps, supplies, and three empty docks wait for the young island designers."
    },
    {
      kind: "tower",
      name: "Beacon Tower",
      position: [-9, -5],
      color: "#f4d66d",
      message: "The beacon points toward three islands that do not appear on any old chart."
    },
    {
      kind: "shipwreck",
      name: "The Returned Bow",
      position: [11, 5],
      color: "#6e4835",
      message: "Only the front of the previous explorers' ship returned with the tide."
    }
  ],

  creatures: [
    { kind: "bird", name: "Harbor Gull", position: [-6, 7], color: "#f8f3df" },
    { kind: "fox", name: "Dock Fox", position: [7, 3], color: "#cf7044" }
  ],

  story: {
    arrival: "The Harbor of Legends is busy with one final expedition preparation.",
    goal: "Visit each child's island and discover what happened to the previous explorers.",
    secret: "The broken ship carries a compass mark that matches all three islands."
  }
};
