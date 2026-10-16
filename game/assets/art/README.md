# Art Notes

The main menu uses `gate.svg`, `key.svg`, and `tree.svg`. The playable islands are generated as 3D geometry by `game/src/island-engine.js`, so island designers normally change their palette and world settings instead of drawing replacement map tiles.

The other SVG files are retained as a small library for future menus, signs, or interface art. Keep replacement files lightweight and preserve the filename when existing HTML already refers to it.
