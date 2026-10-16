// CHARLIE OWNS THIS FILE. Other teammates should not edit it at the same time.
// Change the numbers, colors, names, story, landmarks, and creatures below.
export default {
  id: "charlie-island",
  name: "Charlie Island",
  designer: "Charlie",
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
    size: 128,
    height: 12,
    roughness: 0.58,
    coastWobble: 0.82
  },

  atmosphere: {
    sunIntensity: 1.8,
    fogDensity: 0.012,
    windSpeed: 1.25
  },

  playerStart: [3, 31],

  nature: {
    trees: 320,
    rocks: 110,
    flowers: 180,
    crystals: 28
  },

  landmarks: [
    {
      kind: "ruins",
      name: "The Bent Observatory",
      position: [-24, -8],
      color: "#b8b29f",
      message: "Every telescope points inland, away from the stars."
    },
    {
      kind: "camp",
      name: "Abandoned Wind Camp",
      position: [20, 18],
      color: "#d98045",
      message: "The tents are tied down, but every explorer's journal is missing."
    },
    {
      kind: "gate",
      name: "Root Gate",
      position: [2, -29],
      color: "#65b05e",
      message: "The roots open only when the island becomes completely still."
    },
    {
      kind: "boat",
      name: "Charlie's Wind Skiff",
      position: [-31, 19],
      color: "#e8cf73",
      message: "The sail pulls toward the other islands even when the air is still."
    }
  ],

  creatures: [
    { kind: "bird", name: "Kitewing", position: [-26, 12], color: "#f3d36a" },
    { kind: "fox", name: "Moss Fox", position: [25, -7], color: "#6ea85a" },
    { kind: "spirit", name: "Wind Wisp", position: [-4, -25], color: "#9fe9df" }
  ],

  rescue: {
    name: "Ranger Rowan",
    position: [27, -18],
    color: "#6db36b",
    trappedMessage: "Ranger Rowan is held inside a cage tangled with wind-bent roots.",
    rescuedMessage: "You free Ranger Rowan! The circling wind calms enough to reveal a new trail."
  },

  story: {
    arrival: "The wind circles Charlie Island without ever blowing out to sea.",
    goal: "Rescue Ranger Rowan and reach the Root Gate to calm the storm.",
    secret: "The previous explorers built the observatory to watch something beneath the trees."
  }
};
