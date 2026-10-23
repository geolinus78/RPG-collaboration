# Shared Quest: 3D Island Collaboration

Shared Quest is a browser-based 3D exploration game. Four kid-designed islands use one procedural Three.js engine, while Emma, Charlie, Finn, and Neo each own a separate island file. This lets everyone build at the same time without repeatedly changing the same code.

## Play The Game

1. Double-click `start-game.cmd`, or run `node scripts/serve-game.mjs`.
2. Open `http://127.0.0.1:8000/game/`.
3. Choose a hero, then choose the island where the adventure starts.
4. Move with WASD or the arrow keys, jump with Space, attack with F, and interact with E.
5. Find an island's boat and explore it to choose a sailing destination.

The game keeps its compact side-panel shape. It does not need npm or an internet connection after the repository has been cloned.

## Island Assignments

| Designer | Branch suggestion | Only island file to edit |
| --- | --- | --- |
| Emma | `island-emma` | `game/islands/emma-island.js` |
| Charlie | `island-charlie` | `game/islands/charlie-island.js` |
| Finn | `island-finn` | `game/islands/finn-island.js` |
| Neo | `island-neo` | `game/islands/neo-island.js` |

The registry already loads every assigned file. Kids do not need to edit `island-registry.js`, `main.js`, or the 3D engine.

## Design An Island

Open [the kid island guide](docs/KID-ISLAND-GUIDE.md), then use the matching copy-and-paste prompt in [the kid prompts](docs/KID-ISLAND-PROMPTS.md). A designer can change:

- Island shape, height, roughness, colors, lighting, fog, and wind
- Numbers of trees, rocks, flowers, and crystals
- Landmarks, creatures, names, messages, goals, and secrets
- A named trapped person, their cage location, and their rescue message
- A working combat or rune challenge that unlocks the rescue cage

Check all islands before sharing work:

```powershell
node scripts/validate-islands.mjs
```

## Project Map

| Path | Purpose |
| --- | --- |
| `game/islands/*-island.js` | Safe, separately named world-design files |
| `game/islands/island-schema.js` | Allowed values and validation limits |
| `game/src/island-engine.js` | Shared procedural 3D world engine |
| `game/src/main.js` | Menus, starting island choice, boat travel, and game wiring |
| `game/vendor/` | Pinned local Three.js module and license |
| `scripts/validate-islands.mjs` | Fast island mistake checker |
| `docs/` | Prompts, roles, rules, and design notes |

## Git Workflow

Each child works on their own branch:

```powershell
git switch -c island-emma
git add game/islands/emma-island.js
git commit -m "Design Emma Island"
git push -u origin island-emma
```

Replace `emma` and the filename with the assigned child's name. An adult can then review and merge the branch on GitHub.
