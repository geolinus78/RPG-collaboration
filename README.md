# RPG Collaboration Workspace

This workspace is for a shared browser RPG that kids can build together from different computers. The starter game runs without installing anything: open `game/index.html` in a web browser.

## Quick Start

1. Open `game/index.html`.
2. Choose **New Game**.
3. Name your hero and pick a hero style.
4. Move with arrow keys, WASD, or the direction buttons.
5. Pick a team role from `docs/roles.md`.
6. Edit only your team's files unless everyone agrees.
7. Test the game after every small change.

## Folder Map

| Folder or file | Who usually edits it | What it is for |
| --- | --- | --- |
| `game/data/world.js` | Map team | Rooms, maps, tile symbols, NPC and item positions |
| `game/data/dialogue.js` | Story team | Character lines, signs, and story text |
| `game/data/quests.js` | Quest team | Goals, checklist steps, and win conditions |
| `game/assets/art/` | Art team | SVG art used by the game |
| `game/assets/audio/` | Sound team | Music and sound effects to add later |
| `game/src/main.js` | Code team | Game rules and screen updates |
| `docs/` | Everyone | Planning notes, roles, and session plans |
| `TEAM_BOARD.md` | Everyone | Current task list |

## Working From Different Computers

Use one shared source of truth. The best option is a GitHub repository, because each kid can work on a branch and an adult can review changes before merging them.

Basic Git flow:

```bash
git add .
git commit -m "Describe the change"
git pull
git push
```

Suggested branch names:

```text
story-mia
map-jordan
art-sam
code-riley
quest-team
```

To avoid messy conflicts, each team should usually stay in its own files. For example, the Story team edits `game/data/dialogue.js` while the Map team edits `game/data/world.js`.

## Testing

Open `game/index.html` after every change. If Node.js is installed, you can also run:

```bash
node scripts/validate-game.js
```

That script checks that map rows are the right size and that objects are inside the map.

## Adult Setup Checklist

1. Create a shared GitHub repository or place this folder in a synced class folder.
2. Give each kid or pair a role from `docs/roles.md`.
3. Ask everyone to write their name beside a task in `TEAM_BOARD.md`.
4. Keep changes small: one map, one character, or one quest step at a time.
5. Merge often after testing.
