// NEO OWNS THIS FILE. Other teammates should not edit it at the same time.
// Change the numbers, colors, names, story, landmarks, and creatures below.
export default {
  id: "neo-island",
  name: "Neo Island",
  designer: "Neo",
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
    size: 134,
    height: 12,
    roughness: 0.86,
    coastWobble: 0.48
  },

  atmosphere: {
    sunIntensity: 1.7,
    fogDensity: 0.014,
    windSpeed: 0.75
  },

  playerStart: [0, 33],

  nature: {
    trees: 150,
    rocks: 360,
    flowers: 55,
    crystals: 220
  },

  landmarks: [
    {
      kind: "village",
      name: "Ashlight Village",
      position: [-24, 15],
      color: "#cb6d45",
      message: "The empty homes are warm, and a meal is still cooking."
    },
    {
      kind: "gate",
      name: "Mountain Door",
      position: [3, -31],
      color: "#de7a4c",
      message: "Three compass symbols are carved into the door. One is still dark."
    },
    {
      kind: "crystal",
      name: "Ember Heart",
      position: [28, -5],
      color: "#ff714c",
      message: "The Ember Heart pulses whenever another island's mystery is solved."
    },
    {
      kind: "boat",
      name: "Neo's Ember Ferry",
      position: [-32, 20],
      color: "#df7650",
      message: "Its black hull is cool even beside the glowing shore."
    }
  ],

  creatures: [
    { kind: "crawler", name: "Coalback", position: [20, 20], color: "#4a4542" },
    { kind: "fox", name: "Ember Fox", position: [-27, -8], color: "#df6544" },
    { kind: "spirit", name: "Cinder Wisp", position: [13, -24], color: "#ff9a55" }
  ],

  rescue: {
    name: "Engineer Ash",
    position: [28, 17],
    color: "#d85f45",
    trappedMessage: "Engineer Ash is trapped in a cage fused shut by glowing stone.",
    rescuedMessage: "You free Engineer Ash! The final symbol on the Mountain Door begins to shine."
  },

  story: {
    arrival: "The rocks of Neo Island glow beneath your boots, but no smoke rises from the peak.",
    goal: "Rescue Engineer Ash and light the final symbol on the Mountain Door.",
    secret: "The explorers are alive behind the door, trapped between all three islands."
  }
};
