// FINN OWNS THIS FILE. Other teammates should not edit it at the same time.
// Change the numbers, colors, names, story, landmarks, and creatures below.
export default {
  id: "finn-island",
  name: "Finn Island",
  designer: "Finn",
  tagline: "Pale cliffs rise through clouds filled with quiet lights.",
  biome: "cloud cliffs",

  palette: {
    deepWater: "#243e67",
    shallowWater: "#6aa7c4",
    sand: "#d8d3b8",
    lowland: "#8caf9e",
    highland: "#627f7d",
    rock: "#a8a9b2",
    sky: "#b7c9ef",
    fog: "#e9ecf7"
  },

  terrain: {
    seed: 202,
    size: 118,
    height: 13,
    roughness: 0.72,
    coastWobble: 0.63
  },

  atmosphere: {
    sunIntensity: 1.35,
    fogDensity: 0.019,
    windSpeed: 0.38
  },

  playerStart: [-6, 28],

  nature: {
    trees: 90,
    rocks: 280,
    flowers: 120,
    crystals: 150
  },

  landmarks: [
    {
      kind: "tower",
      name: "Cloud Bell",
      position: [0, -26],
      color: "#e6d17a",
      message: "The bell rings before anyone touches it."
    },
    {
      kind: "ruins",
      name: "Sky Archive",
      position: [-25, 1],
      color: "#b8c4d7",
      message: "A map here shows the archipelago floating above a much older island."
    },
    {
      kind: "crystal",
      name: "Sleeping Star",
      position: [24, 8],
      color: "#9eb8ff",
      message: "The crystal hums with the voices of the missing explorers."
    },
    {
      kind: "boat",
      name: "Finn's Cloud Cutter",
      position: [29, 19],
      color: "#dbe8ff",
      message: "Its pale sail disappears whenever a cloud passes overhead."
    }
  ],

  creatures: [
    { kind: "bird", name: "Cloud Ray", position: [22, -18], color: "#dfe8ff" },
    { kind: "spirit", name: "Bell Light", position: [4, -14], color: "#ffe990" },
    { kind: "crawler", name: "Pebble Walker", position: [-23, 18], color: "#8995a8" }
  ],

  rescue: {
    name: "Archivist Skye",
    position: [-27, -16],
    color: "#829fe4",
    trappedMessage: "Archivist Skye is sealed inside a cage of humming cloud crystal.",
    rescuedMessage: "You free Archivist Skye! She has memorized the missing expedition's sky map."
  },

  story: {
    arrival: "Clouds flow over the cliffs of Finn Island like slow rivers.",
    goal: "Rescue Archivist Skye, ring the Cloud Bell, and wake the Sleeping Star.",
    secret: "The voices inside the crystal know the way to the final island."
  }
};
