// Quest team: edit this file to change goals and checklist steps.
window.GAME_QUESTS = [
  {
    id: "open_gate",
    title: "Open the North Gate",
    summary: "Find the Moon Key and unlock the gate.",
    steps: [
      {
        text: "Find the Moon Key.",
        condition: {
          inventoryIncludes: "moonKey"
        }
      },
      {
        text: "Open the North Gate.",
        condition: {
          flag: "gateOpen"
        }
      }
    ]
  }
];

