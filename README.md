# Shared Quest: 3D Island Collaboration

Shared Quest is a browser-based 3D exploration game. The harbor and three kid-designed islands all use one procedural Three.js engine, while each child owns a separate island file. This lets everyone build at the same time without repeatedly changing the same code.

## Play The Game

1. Double-click `start-game.cmd`, or run `node scripts/serve-game.mjs`.
2. Open `http://127.0.0.1:8000/game/`.
3. Choose a hero, then use the island tabs to travel.
4. Move with WASD or the arrow keys. Press E or Space near landmarks.

The game keeps its compact side-panel shape. It does not need npm or an internet connection after the repository has been cloned.

## Island Assignments

| Designer | Branch suggestion | Only island file to edit |
| --- | --- | --- |
| Kid One | `island-one-name` | `game/islands/kid-one-island.js` |
| Kid Two | `island-two-name` | `game/islands/kid-two-island.js` |
| Kid Three | `island-three-name` | `game/islands/kid-three-island.js` |

The registry already loads every assigned file. Kids do not need to edit `island-registry.js`, `main.js`, or the 3D engine.

## Design An Island

Open [the kid island guide](docs/KID-ISLAND-GUIDE.md), then use the matching copy-and-paste prompt in [the kid prompts](docs/KID-ISLAND-PROMPTS.md). A designer can change:

- Island shape, height, roughness, colors, lighting, fog, and wind
- Numbers of trees, rocks, flowers, and crystals
- Landmarks, creatures, names, messages, goals, and secrets

Check all islands before sharing work:

```powershell
node scripts/validate-islands.mjs
```

## Project Map

| Path | Purpose |
| --- | --- |
| `game/islands/kid-*-island.js` | Safe, separate world-design files |
| `game/islands/island-schema.js` | Allowed values and validation limits |
| `game/src/island-engine.js` | Shared procedural 3D world engine |
| `game/src/main.js` | Menus, island tabs, and game wiring |
| `game/vendor/` | Pinned local Three.js module and license |
| `scripts/validate-islands.mjs` | Fast island mistake checker |
| `docs/` | Prompts, roles, rules, and design notes |

## Git Workflow

Each child works on their own branch:

```powershell
git switch -c island-one-name
git add game/islands/kid-one-island.js
git commit -m "Design Kid One island"
git push -u origin island-one-name
```

Replace `one` and the filename with the assigned number. An adult can then review and merge the branch on GitHub.
