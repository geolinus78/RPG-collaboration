# Kid Island Builder Guide

You can create a complete 3D world by editing one JavaScript object. The engine turns your choices into shaped land, moving water, clouds, plants, rocks, glowing crystals, creatures, buildings, and stories.

## Start

1. Open a terminal in the repository.
2. Create your assigned branch from current `main`.
3. Open only your assigned island file.
4. Run `start-game.cmd`, choose your island at the start, and test it after each few changes.

## The Controls You Can Change

### Identity and story

Change `name`, `designer`, `tagline`, `biome`, and all text inside `story`. Keep `id` unchanged because the game uses it as the island's permanent address.

### Colors

Every palette value is a six-digit hex color such as `"#49b8c8"`. The palette controls deep and shallow water, sand, lowlands, highlands, rock, sky, and fog.

### Terrain and weather

| Setting | Allowed value | Effect |
| --- | --- | --- |
| `seed` | Any whole number | Makes a different land shape |
| `size` | 70 to 140 | Width of the island |
| `height` | 3 to 14 | Mountain height |
| `roughness` | 0 to 1 | Smooth hills to sharp terrain |
| `coastWobble` | 0 to 1 | Round coast to twisty coast |
| `sunIntensity` | 0.5 to 4 | Brightness |
| `fogDensity` | 0 to 0.05 | Clear air to thick fog |
| `windSpeed` | 0 to 3 | Cloud speed |

### Nature

Set `trees`, `rocks`, `flowers`, and `crystals` from 0 to 400. High numbers create a dense world but can make landmarks harder to see.

### Landmarks and creatures

Allowed landmark kinds are `boat`, `camp`, `crystal`, `gate`, `ruins`, `shipwreck`, `tower`, and `village`. Every island must keep one `boat`, because that is the only way players can travel after the game starts.

Allowed creature kinds are `bird`, `crawler`, `fox`, and `spirit`.

A position is `[x, z]`. Use values roughly from -20 to 20, with zero near the center. Keep `playerStart` and important places away from the extreme edge.

## Check Your Work

Run:

```powershell
node scripts/validate-islands.mjs
```

Then play your island. Walk to each landmark and press E, and make sure the boat opens the destination chooser. When it looks right, commit only your assigned island file and push your branch.
