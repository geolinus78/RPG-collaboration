import { randomBytes } from "node:crypto";
import { islands } from "../game/islands/island-registry.js";
import { initialDesign, validateDesign, nearestTile, tileKey } from "../game/shared/island-map.js";
import { ALLOWED_KINDS } from "../game/shared/object-library.js";

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const duration = value => {
  if (!Number.isInteger(value) || value < 15 || value > 3600) fail("Choose a design time between 15 seconds and 60 minutes.");
  return value;
};
const identity = input => {
  if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 18) fail("Enter a player name (up to 18 characters).");
  return { name: input.name.trim(), style: ["trail", "guard", "star"].includes(input.style) ? input.style : "trail" };
};

export function createRoomStore({ now = Date.now, savedRooms = [], persist = () => {} } = {}) {
  const rooms = new Map(savedRooms.map(room => [room.code, { ...room, streams: new Map() }]));
  function save() { persist([...rooms.values()].map(({ streams, ...room }) => room)); }
  function snapshot(room) {
    return {
      code: room.code, phase: room.phase, hostId: room.hostId, durationSeconds: room.durationSeconds,
      deadline: room.deadline, serverTime: now(), designs: room.designs,
      players: room.players.map(({ token, ...player }) => ({ ...player, online: room.streams.has(player.id) }))
    };
  }
  function broadcast(room, event = "state", payload) {
    if (event === "state") save();
    const data = JSON.stringify(payload || snapshot(room));
    for (const streams of room.streams.values()) for (const response of streams) response.write(`event: ${event}\ndata: ${data}\n\n`);
  }
  function advance(room) {
    if (room.phase === "design" && (now() >= room.deadline || room.players.every(player => player.ready))) {
      room.phase = "play";
      for (const player of room.players) player.ready = true;
      broadcast(room);
    }
  }
  function getRoom(code) {
    const room = rooms.get(code.toUpperCase());
    if (!room) fail("Room not found. Check the code or create a new room.", 404);
    advance(room); return room;
  }
  function authenticate(room, token) {
    const player = room.players.find(player => player.token === token);
    if (!player) fail("Please rejoin this room.", 401);
    player.lastSeen = now(); return player;
  }
  function join(room, input) {
    advance(room);
    if (room.players.length >= islands.length) fail("This room already has four players.", 409);
    const islandId = islands.find(island => !room.players.some(player => player.islandId === island.id)).id;
    const player = { ...identity(input), id: randomBytes(8).toString("hex"), token: randomBytes(24).toString("hex"), islandId, ready: room.phase === "play", lastSeen: now(), presence: null };
    room.players.push(player);
    if (!room.hostId) room.hostId = player.id;
    broadcast(room);
    return { token: player.token, playerId: player.id, state: snapshot(room) };
  }
  function create(input) {
    identity(input);
    if (rooms.size >= 64) fail("This server is full. Reuse an existing room or restart the server.", 503);
    let code;
    do { code = randomBytes(3).toString("hex").toUpperCase(); } while (rooms.has(code));
    const room = { code, phase: "lobby", hostId: null, durationSeconds: duration(input.durationSeconds ?? 300), deadline: null, players: [], designs: Object.fromEntries(islands.map(island => [island.id, initialDesign(island)])), streams: new Map(), createdAt: now() };
    rooms.set(code, room);
    return join(room, input);
  }
  function action(room, player, input) {
    let removedStreams = [];
    const host = () => { if (player.id !== room.hostId) fail("Only the host can change the room settings.", 403); };
    if (input.type === "settings") {
      host();
      if (room.phase !== "lobby") fail("Set the time before starting the design round.", 409);
      room.durationSeconds = duration(input.durationSeconds);
    } else if (input.type === "start") {
      host();
      if (room.phase !== "lobby") fail("The round has already started.", 409);
      room.phase = "design"; room.deadline = now() + room.durationSeconds * 1000;
    } else if (input.type === "design") {
      if (room.phase !== "design" || player.ready) fail("The design round is finished. Your saved island is ready to explore.", 409);
      if (input.islandId !== player.islandId) fail("You can only edit your own island.", 403);
      const current = room.designs[player.islandId];
      if (input.revision !== current.revision) fail("This island changed in another tab. Reload its saved design before editing again.", 409);
      const error = validateDesign(input.design, ALLOWED_KINDS);
      if (error) fail(error);
      // Store only known fields. Neither client properties nor other islands can
      // change ownership, the deadline, or another player's design.
      room.designs[player.islandId] = {
        revision: current.revision + 1,
        tiles: input.design.tiles.map(({ x, z, level, terrain }) => ({ x, z, level, terrain })),
        objects: input.design.objects.map(({ id, kind, name, x, z, variant, color, landmark, message }) => ({ id, kind, name, x, z, variant, color, landmark: Boolean(landmark), message: message || "A discovery placed here by the island's designer." }))
      };
    } else if (input.type === "ready") {
      if (room.phase !== "design") fail("The design round is not open.", 409);
      player.ready = true;
      advance(room);
    } else if (input.type === "remove") {
      host();
      if (room.phase !== "lobby") fail("Players can be removed before a design round starts.", 409);
      if (input.playerId === room.hostId || !room.players.some(member => member.id === input.playerId)) fail("Choose another player to remove.");
      removedStreams = [...(room.streams.get(input.playerId) || [])];
      room.players = room.players.filter(member => member.id !== input.playerId);
    } else if (input.type === "restart") {
      host();
      if (room.phase !== "play") fail("Finish this round before planning another.", 409);
      room.phase = "lobby"; room.deadline = null;
      for (const member of room.players) { member.ready = false; member.presence = null; }
    } else if (input.type === "presence") {
      if (room.phase !== "play") fail("Exploration has not started.", 409);
      const { islandId, x, z, sailing } = input;
      if (!room.designs[islandId] || !Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 20 || Math.abs(z) > 20) fail("Invalid player position.");
      const tile = nearestTile(room.designs[islandId].tiles, x, z);
      if (Math.hypot(tile.x - x, tile.z - z) > 1.5) fail("Players must stay on the island.");
      player.presence = { islandId, x, z, level: tile.level, sailing: Boolean(sailing), style: player.style, name: player.name };
      broadcast(room, "presence", { players: snapshot(room).players });
      return { ok: true };
    } else fail("Unknown room action.");
    broadcast(room);
    for (const response of removedStreams) response.end();
    return { state: snapshot(room) };
  }
  function subscribe(room, player, response) {
    response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no" });
    if (!room.streams.has(player.id)) room.streams.set(player.id, new Set());
    room.streams.get(player.id).add(response);
    broadcast(room);
    const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), 15000);
    response.on("close", () => {
      clearInterval(heartbeat);
      room.streams.get(player.id)?.delete(response);
      if (!room.streams.get(player.id)?.size) room.streams.delete(player.id);
      broadcast(room);
    });
  }
  return {
    create, join, getRoom, authenticate, action, snapshot, subscribe,
    tick() {
      for (const [code, room] of rooms) {
        advance(room);
        if (!room.streams.size && now() - Math.max(...room.players.map(p => p.lastSeen), room.createdAt) > 12 * 3600000) { rooms.delete(code); save(); }
      }
    },
    close() { for (const room of rooms.values()) for (const streams of room.streams.values()) for (const response of streams) response.end(); }
  };
}
