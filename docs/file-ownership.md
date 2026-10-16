# File Ownership

| Person | Their editable file |
| --- | --- |
| Kid One | `game/islands/kid-one-island.js` |
| Kid Two | `game/islands/kid-two-island.js` |
| Kid Three | `game/islands/kid-three-island.js` |

The adult integrator owns shared files including `game/islands/island-registry.js`, `game/islands/island-schema.js`, `game/src/`, `game/index.html`, and `game/styles.css`.

The three kid files are already imported by the registry. A child should never need to edit a shared file to make their island appear.
