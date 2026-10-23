# Shared Quest on navgame.net

Public game: https://navgame.net/wp-content/uploads/2026/shared-quest/index.html

Launcher: https://navgame.net/app-launcher/

The frontend is static files in WordPress uploads, matching the other games. Its
deployment-only `config.js` sets `SHARED_QUEST_API` to
`https://shared-quest-production.up.railway.app`. The repository default is empty
so local development continues using the same Node server for pages and APIs.

## Isolated Railway service

- Project: navgame (`120dde92-569b-40f5-bc7d-5f9f36bbddae`)
- Environment: production (`b9533875-d0a9-428f-bb73-ff2357e73a6f`)
- Service: shared-quest (`78f06e1b-ca3e-4305-869d-00216048ca3e`)
- Volume: shared-quest-volume (`37f8ae2b-f413-4dd8-92c7-cbc3d784a1e6`), mounted `/data`
- One replica, Node 22 Docker image, `/health` status endpoint.
- `PORT=8000`, `DATA_DIR=/data`.
- `ALLOWED_ORIGINS=https://navgame.net,https://www.navgame.net,https://shared-quest-production.up.railway.app`
- `PUBLIC_GAME_URL=https://navgame.net/wp-content/uploads/2026/shared-quest/index.html`

Room state, player credentials, deadlines and designs are written atomically to
`/data/rooms.json` after room changes. This file is private; never publish it in
uploads or Git. Idle rooms expire after 12 hours. Browser credentials live in
session storage, so players should keep their original tab to resume an island.
Do not scale to multiple replicas: each process owns its own room map.

Deploy only this service, using explicit IDs to avoid touching other services:

```powershell
railway up -p 120dde92-569b-40f5-bc7d-5f9f36bbddae -e b9533875-d0a9-428f-bb73-ff2357e73a6f -s 78f06e1b-ca3e-4305-869d-00216048ca3e --detach
```

For frontend updates, upload only `game/` contents to its own
`wp-content/uploads/2026/shared-quest/` folder. Keep the deployed API URL in
`config.js`. The unused archived `vendor/` directory can be excluded. Upload no
server scripts, room state, credentials or Git files. Check Cloudflare caching
when replacing existing files. WordPress itself needs no redeploy.

## Launcher and rollback

The only WordPress option changed was `navgame_app_launcher_cards`: one
`dir-shared-quest` entry was appended. All 29 existing entries were preserved
exactly; no scan or regeneration was run. The original array is backed up at
`wp-content/navgame-app-launcher-backups/before-shared-quest-20261023.json` on
the WordPress volume. Do not restore the whole array after subsequent launcher
edits; remove just the Shared Quest card instead.

To withdraw the game, unpublish its card in App Launcher admin. Existing games,
WordPress plugins, DNS, scoring services and other Railway projects do not need
any changes. Future deployments should continue targeting only the IDs above.

Verified on 2026-10-23: two public browser players created and joined a room,
shared the timed editor, saved a terrain edit and entered exploration. After a
service replacement, both reconnected and the saved terrain edit survived.
All 29 original launcher cards and all 13 other production service deployment
IDs were unchanged. The Node server also passes 13 automated tests plus map
and island validation.
