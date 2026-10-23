# Island Quest: Island Atlas

Island Quest is a local-network multiplayer island-building and exploration game for one to four players. A timed design round comes first: paint an isometric map, drag miniature objects into place, and then sail around the archipelago together. The map uses Canvas 2D and does not require WebGL, an npm install, or an internet connection.

## Play The Game

1. With Node.js 20 or newer installed, double-click `start-game.cmd`, or run `node scripts/serve-game.mjs`.
2. Open `http://127.0.0.1:8000/game/`.
3. Make a hero and create a room. Other players open the **local network address shown in the lobby** on the same Wi-Fi, make a hero, and join using the room code. Share the join link to prefill the code. `localhost` only works on the computer running the server.
4. The host can edit **Design time per player** before starting. The default is **5 minutes**; all players design simultaneously against the same server-controlled deadline.
5. Paint terrain squares using 12 surfaces, raise or lower the ground, and choose from 42 miniature objects. Drag an object onto a free tile or select it and click. Use Move object, Remove object, Undo, and Redo to refine the island. Land stays connected, and the boat's mooring follows the shoreline automatically.
6. Finish your island early to lock it in. Exploration starts when everyone finishes or the timer runs out. Fewer than four players can play; unassigned islands retain their template designs.
7. Click a tile to walk, or move with WASD / arrow keys. Click a landmark or its field-journal entry to explore it; E or Space explores nearby. Other connected explorers appear by name when visiting the same island.
8. Board the boat at the shoreline. It sails off screen **before** destination selection opens. At the destination it sails in from the side, moors, and puts your hero ashore. You can also choose to sail back to the island you just left.

Use the map's − / Fit / + buttons to change scale, and drag to pan around the chart. Fit resets the view. The field journal tracks explored landmarks during your session.

The Raise tool has no gameplay height cap. Keep raising tiles to build taller peaks; Lower stops at sea level. The chart fits the full height of the terrain, and tall mountains use a bounded rendering cache.

The host can use Menu → Plan another design round to return everyone to the lobby and set another timer. Existing designs are retained for the next round.

Players can join a room after the round starts if one of its four islands is unclaimed. Joining during design gives the new player the remaining shared design time without resetting anyone else's timer. Joining during exploration claims an available island with its existing design and starts the boat's arrival sequence there. Existing players keep exploring without being moved or reset. A disconnected player's claimed island remains reserved for their reconnect; it is not an unclaimed slot.

**Reset to start** is available at the top of every screen, including the editor and boat destination menu. Confirm to leave the room, release your island for a new player, clear this browser's saved room login, and return to the opening menu. The island keeps its saved design. Other players stay in their room; if the host leaves, the next player becomes host. A failed connection keeps your login so you can retry releasing the island. Create a new room to get the original island templates and the default five-minute timer again.

## Local Network And Reconnection

The server listens on `0.0.0.0:8000` and prints available IPv4 join addresses, such as `http://192.168.1.20:8000/game/`. All devices must be on the same network; guest Wi-Fi or client isolation can prevent connections. If Windows Firewall prompts for Node.js access, allow it on your private network. No router port forwarding is needed.

Reloading the same browser tab reconnects to your player, restores your saved design, and keeps the original deadline. Locally, rooms live in server memory unless `DATA_DIR` is configured. The public Railway service uses a dedicated volume so rooms and designs survive service restarts. This version does not provide accounts or public matchmaking. A dropped connection pauses editing while the browser reconnects; the design clock continues on the server.

Optional environment variables: `PORT` changes the port; `HOST=127.0.0.1` restricts the server to this computer. In that mode the printed LAN links cannot accept other devices.

## Template Island Assignments

| Designer | Branch suggestion | Only island file to edit |
| --- | --- | --- |
| Emma | `island-emma` | `game/islands/emma-island.js` |
| Charlie | `island-charlie` | `game/islands/charlie-island.js` |
| Finn | `island-finn` | `game/islands/finn-island.js` |
| Neo | `island-neo` | `game/islands/neo-island.js` |

The registry already loads every assigned file. Kids do not need to edit `island-registry.js`, `main.js`, or the shared map engine.

## Edit A Starting Template In Code

Open [the kid island guide](docs/KID-ISLAND-GUIDE.md), then use the matching copy-and-paste prompt in [the kid prompts](docs/KID-ISLAND-PROMPTS.md). A designer can change:

- Island shape, height, roughness, colors, lighting, fog, and wind
- Numbers of trees, rocks, flowers, and crystals
- Landmarks, creatures, names, messages, goals, and secrets

The in-browser editor operates on a room's copies of these templates; it never changes a child's source file. Check source templates and multiplayer behavior before sharing work:

```powershell
node scripts/validate-islands.mjs
node scripts/validate-map.mjs
node --test scripts/multiplayer.test.mjs
```

## Project Map

Public hosting and deployment isolation are documented in [docs/HOSTING.md](docs/HOSTING.md).

| Path | Purpose |
| --- | --- |
| `game/islands/*-island.js` | Safe, separately named world-design files |
| `game/islands/island-schema.js` | Allowed values and validation limits |
| `game/src/tiled-engine.js` | Isometric tile terrain, walking routes, interaction, and rendering |
| `game/src/map-art.js` | Shaded miniature artwork for terrain features, buildings, heroes, and creatures |
| `game/src/main.js` | Menus, field journal, starting island choice, boat travel, and game wiring |
| `game/src/island-editor.js` | Tile painting, object library, dragging, undo/redo, and saved editor drafts |
| `game/src/multiplayer.js` | Room connection, live events, autosave queue, and reconnection |
| `game/shared/` | Shared terrain / object catalogs, template generation, shoreline mooring, and design validation |
| `scripts/room-server.mjs` | Room ownership, authoritative timer, draft validation, and live player state |
| `game/vendor/` | Archived Three.js module and license from the original renderer; not loaded by the map |
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
