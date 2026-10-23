# Game Design Notes

## Game Pitch

Up to four players join a local-network room, choose heroes, and each design an island in a shared timed round. The default is five minutes, editable by the host before the round. Players paint terrain, adjust elevation, and drag miniature features from a library. They then explore the archipelago together, with live player positions.

## World Structure

- Emma, Charlie, Finn, and Neo each own one island.
- Each player is assigned a different starting template and edits only that island.
- The server controls the design deadline. Ready players lock their islands; everyone starts exploring when all are ready or time expires.
- Accepted drafts survive tab reloads. The public server persists rooms on its dedicated volume; local servers can opt in with DATA_DIR.
- Reset to start releases the player's island with its saved design, revokes their login and transfers hosting when needed. A replacement can claim it during any phase.
- Later travel only becomes available by finding and entering a boat.
- WASD or arrow keys move the hero.
- E or Space explores a nearby landmark.
- Water marks the playable boundary of each world.
- Each island has one automatic shoreline mooring: a reachable land tile, a jetty, and a boat in ocean water.
- Boarding starts a departure animation. Destination selection stays hidden until the boat is off screen.
- At the destination the vessel sails in from off screen and moors before the hero can walk ashore.
- Players can see each other's named heroes when visiting the same island.

## Story Thread

The previous expedition disappeared while investigating a connection among the islands. Each child's story and landmarks reveal one part of the mystery. The exact explanation can change as the team combines its ideas.

## Design Promise

Each child controls a whole expressive world without needing to change shared engine code. New shared features should make the islands easier to design, richer to explore, or safer to merge.
