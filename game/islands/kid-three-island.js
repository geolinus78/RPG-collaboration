// KID THREE OWNS THIS FILE. Other teammates should not edit it at the same time.
// Change the numbers, colors, names, story, landmarks, and creatures below.
export default {
  id: "emberpeak-island",
  name: "Emberpeak Island",
  designer: "Kid Three",
  tagline: "Warm black mountains surround a forest of glowing stone.",
  biome: "volcanic highlands",

  palette: {
    deepWater: "#162f44",
    shallowWater: "#356c7c",
    sand: "#9b8061",
    lowland: "#596c49",
    highland: "#343d3b",
    rock: "#56525a",
    sky: "#ca8d72",
    fog: "#6d5961"
  },

  terrain: {
    seed: 303,
    size: 62,
    height: 12,
    roughness: 0.86,
    coastWobble: 0.48
  },

  atmosphere: {
    sunIntensity: 1.7,
    fogDensity: 0.014,
    windSpeed: 0.75
  },

  playerStart: [0, 19],

  nature: {
    trees: 42,
    rocks: 125,
    flowers: 8,
    crystals: 55
  },

  landmarks: [
    {
      kind: "village",
      name: "Ashlight Village",
      position: [-9, 7],
      color: "#cb6d45",
      message: "The empty homes are warm, and a meal is still cooking."
    },
    {
      kind: "gate",
      name: "Mountain Door",
      position: [2, -14],
      color: "#de7a4c",
      message: "Three compass symbols are carved into the door. One is still dark."
    },
    {
      kind: "crystal",
      name: "Ember Heart",
      position: [12, -2],
      color: "#ff714c",
      message: "The Ember Heart pulses whenever another island's mystery is solved."
    }
  ],

  creatures: [
    { kind: "crawler", name: "Coalback", position: [8, 9], color: "#4a4542" },
    { kind: "fox", name: "Ember Fox", position: [-12, -4], color: "#df6544" },
    { kind: "spirit", name: "Cinder Wisp", position: [6, -10], color: "#ff9a55" }
  ],

  story: {
    arrival: "The rocks glow gently beneath your boots, but no smoke rises from the peak.",
    goal: "Light the final symbol on the Mountain Door.",
    secret: "The explorers are alive behind the door, trapped between all three islands."
  }
};
