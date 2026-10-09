// Quest team: edit this file to change goals and checklist steps.
window.GAME_QUESTS = [
  {
    id: "map_archipelago",
    title: "Map the Archipelago",
    summary: "Find the old compass and open the southern fog route.",
    steps: [
      {
        text: "Find the Old Compass.",
        condition: {
          inventoryIncludes: "oldCompass"
        }
      },
      {
        text: "Open the Fog Gate.",
        condition: {
          flag: "fogGateOpen"
        }
      }
    ]
  }
];
