# Collaboration Rules

## One Island, One Owner

Each child edits only their assigned `game/islands/kid-*-island.js` file. The shared engine, registry, HTML, and CSS belong to the adult integration branch unless the group agrees otherwise.

## Before Sharing

1. Pull `main` before creating a new branch.
2. Make a small change and save it.
3. Run `node scripts/validate-islands.mjs`.
4. Run the game and visit the changed island.
5. Commit only the assigned island file.
6. Push the branch and tell the adult its name.

Good commit messages describe the visible result:

```text
Turn Windcurve into a giant flower forest
Add the Cloud Bell mystery
Build Emberpeak crystal village
```

## Conflict Rule

If Git reports a conflict, stop and ask the adult integrating the islands. Do not remove another person's work to make the warning disappear.
