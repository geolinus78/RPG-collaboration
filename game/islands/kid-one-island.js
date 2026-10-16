// KID ONE OWNS THIS FILE. Other teammates should not edit it at the same time.
// Change the numbers, colors, names, story, landmarks, and creatures below.
export default {
  id: "windcurve-island",
  name: "Windcurve Island",
  designer: "Kid One",
  tagline: "A green island where the wind redraws every trail.",
  biome: "windy jungle",

  palette: {
    deepWater: "#123f5b",
    shallowWater: "#3ca9b6",
    sand: "#dbc978",
    lowland: "#4e9a52",
    highland: "#1f5e42",
    rock: "#726d62",
    sky: "#8fd0dd",
    fog: "#cde6df"
  },

  terrain: {
    seed: 101,
    size: 58,
    height: 9,
    roughness: 0.58,
    coastWobble: 0.82
  },

  atmosphere: {
    sunIntensity: 1.8,
    fogDensity: 0.012,
    windSpeed: 1.25
  },

  playerStart: [2, 17],

  nature: {
    trees: 120,
    rocks: 32,
    flowers: 50,
    crystals: 8
  },

  landmarks: [
    {
      kind: "ruins",
      name: "The Bent Observatory",
      position: [-9, -4],
      color: "#b8b29f",
      message: "Every telescope points inland, away from the stars."
    },
    {
      kind: "camp",
      name: "Abandoned Wind Camp",
      position: [8, 8],
      color: "#d98045",
      message: "The tents are tied down, but every explorer's journal is missing."
    },
    {
      kind: "gate",
      name: "Root Gate",
      position: [2, -13],
      color: "#65b05e",
      message: "The roots open only when the island becomes completely still."
    }
  ],

  creatures: [
    { kind: "bird", name: "Kitewing", position: [-12, 7], color: "#f3d36a" },
    { kind: "fox", name: "Moss Fox", position: [11, -3], color: "#6ea85a" },
    { kind: "spirit", name: "Wind Wisp", position: [-2, -11], color: "#9fe9df" }
  ],

  story: {
    arrival: "The wind circles the island without ever blowing out to sea.",
    goal: "Reach the Root Gate and learn how to calm the storm.",
    secret: "The previous explorers built the observatory to watch something beneath the trees."
  }
};
