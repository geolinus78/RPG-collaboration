import test from "node:test";
import assert from "node:assert/strict";
import { createRoomStore } from "./room-server.mjs";
import { createGameServer } from "./serve-game.mjs";
import { OBJECTS } from "../game/shared/object-library.js";
import { roomPersistence } from "./persistence.mjs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

test("rooms, credentials, designs and deadlines survive a server restart", t => {
  const directory = mkdtempSync(path.join(tmpdir(), "quest-rooms-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const before = createRoomStore(roomPersistence(directory));
  const host = before.create({ name: "Saved explorer" });
  const room = before.getRoom(host.state.code), player = before.authenticate(room, host.token);
  before.action(room, player, { type: "start" });
  const design = structuredClone(room.designs[player.islandId]);
  design.tiles[0].level = 42;
  before.action(room, player, { type: "design", islandId: player.islandId, revision: 0, design });
  const after = createRoomStore(roomPersistence(directory));
  const restored = after.getRoom(room.code);
  assert.equal(after.authenticate(restored, host.token).id, player.id);
  assert.equal(restored.designs[player.islandId].tiles[0].level, 42);
  assert.equal(restored.deadline, room.deadline);
  assert.equal(restored.phase, "design");
  assert.equal(after.snapshot(restored).players[0].online, false);
});

test("WordPress frontend can use HTTPS APIs and SSE without exposing other origins", async t => {
  const origin = "https://navgame.net", publicGameUrl = `${origin}/wp-content/uploads/2026/shared-quest/index.html`;
  const server = createGameServer({ allowedOrigins: [origin], publicGameUrl });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Origin: origin, "Content-Type": "application/json" };
  const preflight = await fetch(`${base}/api/rooms`, { method: "OPTIONS", headers });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
  assert.match(preflight.headers.get("access-control-allow-headers"), /Authorization/);
  const created = await fetch(`${base}/api/rooms`, { method: "POST", headers, body: JSON.stringify({ name: "WordPress player" }) });
  assert.equal(created.status, 201);
  const host = await created.json();
  const stream = await fetch(`${base}/api/rooms/${host.state.code}/events?token=${host.token}`, { headers: { Origin: origin } });
  assert.equal(stream.headers.get("access-control-allow-origin"), origin);
  const reader = stream.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: state/);
  await reader.cancel();
  assert.deepEqual(await (await fetch(`${base}/api/network`, { headers })).json(), { urls: [publicGameUrl] });
  assert.equal((await fetch(`${base}/api/rooms`, { method: "POST", headers: { ...headers, Origin: "https://unrelated.example" }, body: "{}" })).status, 403);
  assert.equal((await fetch(`${base}/health`)).status, 200);
});

const fixture = () => {
  let clock = 1000000;
  const store = createRoomStore({ now: () => clock });
  const host = store.create({ name: "Alice", style: "trail" });
  const room = store.getRoom(host.state.code);
  const guest = store.join(room, { name: "Bob", style: "star" });
  const a = store.authenticate(room, host.token), b = store.authenticate(room, guest.token);
  return { store, host, guest, room, a, b, advance: ms => { clock += ms; store.tick(); } };
};

test("room ownership, host settings, capacity, and non-public credentials", () => {
  const { store, room, a, b } = fixture();
  assert.equal(room.durationSeconds, 300);
  assert.notEqual(a.islandId, b.islandId);
  assert.throws(() => store.action(room, b, { type: "start" }), { status: 403 });
  assert.throws(() => store.action(room, b, { type: "settings", durationSeconds: 60 }), { status: 403 });
  store.action(room, a, { type: "settings", durationSeconds: 90 });
  assert.equal(store.snapshot(room).durationSeconds, 90);
  assert.ok(store.snapshot(room).players.every(p => !Object.hasOwn(p, "token")));
  store.join(room, { name: "Charlie" }); store.join(room, { name: "Dana" });
  assert.throws(() => store.join(room, { name: "Extra" }), { status: 409 });
  assert.throws(() => store.authenticate(room, "wrong-token"), { status: 401 });
});

test("shared designs respect ownership, validation, and edit revisions", () => {
  const { store, room, a, b } = fixture();
  store.action(room, a, { type: "start" });
  const design = structuredClone(room.designs[a.islandId]);
  design.tiles[0].terrain = "snow";
  design.tiles[0].level = 1000;
  store.action(room, a, { type: "design", islandId: a.islandId, revision: 0, design });
  assert.equal(store.snapshot(room).designs[a.islandId].tiles[0].terrain, "snow");
  assert.equal(store.snapshot(room).designs[a.islandId].tiles[0].level, 1000, "The server must save elevations beyond the original height cap");
  assert.equal(room.designs[a.islandId].revision, 1);
  assert.throws(() => store.action(room, b, { type: "design", islandId: a.islandId, revision: 1, design }), { status: 403 });
  assert.throws(() => store.action(room, a, { type: "design", islandId: a.islandId, revision: 0, design }), { status: 409 });
  const invalid = structuredClone(design); invalid.tiles.push({ x: 18, z: 18, terrain: "grass", level: 0 });
  assert.throws(() => store.action(room, a, { type: "design", islandId: a.islandId, revision: 1, design: invalid }), /connected/);
  invalid.tiles = design.tiles; invalid.objects[0].kind = "unknown";
  assert.throws(() => store.action(room, a, { type: "design", islandId: a.islandId, revision: 1, design: invalid }), /invalid/);
  assert.equal(OBJECTS.length, 42);
  const invalidHeight = structuredClone(design); invalidHeight.tiles[0].level = -1;
  assert.throws(() => store.action(room, a, { type: "design", islandId: a.islandId, revision: 1, design: invalidHeight }), /invalid/);
  invalidHeight.tiles[0].level = 1.5;
  assert.throws(() => store.action(room, a, { type: "design", islandId: a.islandId, revision: 1, design: invalidHeight }), /invalid/);
});

test("the server ends design at the shared deadline even when players disconnect", () => {
  const { store, room, a, b, advance } = fixture();
  store.action(room, a, { type: "settings", durationSeconds: 15 });
  store.action(room, a, { type: "start" });
  advance(14999); assert.equal(room.phase, "design");
  advance(1); assert.equal(room.phase, "play");
  assert.throws(() => store.action(room, a, { type: "design", islandId: a.islandId, revision: 0, design: room.designs[a.islandId] }), { status: 409 });
  const late = store.join(room, { name: "Late" });
  assert.equal(late.state.phase, "play");
  assert.equal(late.state.players.find(p => p.id === late.playerId).ready, true);
  assert.equal(store.authenticate(room, b.token).id, b.id, "Existing players must reconnect after the deadline");
});

test("late designers claim a unique island and share the existing deadline", () => {
  const { store, room, a, b, advance } = fixture();
  store.action(room, a, { type: "start" });
  const deadline = room.deadline, existingDesign = structuredClone(room.designs[a.islandId]);
  advance(120000);
  const late = store.join(room, { name: "Late designer" });
  const player = store.authenticate(room, late.token);
  assert.equal(late.state.phase, "design");
  assert.equal(late.state.deadline, deadline);
  assert.equal(late.state.deadline - late.state.serverTime, 180000);
  assert.equal(player.ready, false);
  assert.ok(![a.islandId, b.islandId].includes(player.islandId));
  const design = structuredClone(room.designs[player.islandId]); design.tiles[0].terrain = "snow";
  store.action(room, player, { type: "design", islandId: player.islandId, revision: 0, design });
  assert.equal(room.designs[player.islandId].tiles[0].terrain, "snow");
  assert.deepEqual(room.designs[a.islandId], existingDesign);
  store.action(room, a, { type: "ready" }); store.action(room, b, { type: "ready" });
  assert.equal(room.phase, "design", "A late designer participates in the ready check");
  store.action(room, player, { type: "ready" }); assert.equal(room.phase, "play");
});

test("joining at the deadline enters exploration without resetting existing players", () => {
  const { store, room, a, b, advance } = fixture();
  store.action(room, a, { type: "start" });
  advance(300000);
  const tile = room.designs[a.islandId].tiles[20];
  store.action(room, a, { type: "presence", islandId: a.islandId, x: tile.x, z: tile.z });
  const position = structuredClone(a.presence), saved = structuredClone(room.designs);
  const third = store.join(room, { name: "Third" });
  assert.equal(third.state.phase, "play");
  assert.deepEqual(a.presence, position); assert.deepEqual(room.designs, saved);
  assert.equal(store.authenticate(room, b.token).id, b.id);
  store.join(room, { name: "Fourth" });
  assert.equal(new Set(room.players.map(p => p.islandId)).size, 4);
  assert.throws(() => store.join(room, { name: "Fifth" }), { status: 409 });
});

test("finishing early locks each island and starts exploration when all players are ready", () => {
  const { store, room, a, b } = fixture();
  store.action(room, a, { type: "start" });
  store.action(room, a, { type: "ready" }); assert.equal(room.phase, "design");
  assert.throws(() => store.action(room, a, { type: "design", islandId: a.islandId, revision: 0, design: room.designs[a.islandId] }), { status: 409 });
  store.action(room, b, { type: "ready" }); assert.equal(room.phase, "play");
  const tile = room.designs[b.islandId].tiles[20];
  store.action(room, b, { type: "presence", islandId: b.islandId, x: tile.x, z: tile.z, sailing: false });
  assert.equal(store.snapshot(room).players[1].presence.islandId, b.islandId);
  assert.throws(() => store.action(room, b, { type: "presence", islandId: b.islandId, x: 100, z: 100 }), /Invalid/);
  const saved = structuredClone(room.designs[a.islandId]);
  assert.throws(() => store.action(room, b, { type: "restart" }), { status: 403 });
  store.action(room, a, { type: "restart" });
  assert.equal(room.phase, "lobby"); assert.equal(room.deadline, null);
  assert.ok(room.players.every(player => !player.ready && !player.presence));
  assert.deepEqual(room.designs[a.islandId], saved, "Another round must retain the designed islands");
  const vacated = b.islandId;
  store.action(room, a, { type: "remove", playerId: b.id });
  assert.throws(() => store.authenticate(room, b.token), { status: 401 });
  const replacement = store.join(room, { name: "Replacement" });
  assert.equal(replacement.state.players.find(p => p.id === replacement.playerId).islandId, vacated);
});

test("HTTP clients receive live room changes and the server serves only game files", { timeout: 10000 }, async () => {
  const server = createGameServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const abort = new AbortController();
  try {
    const post = async (url, data, token) => fetch(base + url, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(data) });
    const host = await (await post("/api/rooms", { name: "Host" })).json();
    const roomUrl = `/api/rooms/${host.state.code}`;
    const stream = await fetch(base + roomUrl + `/events?token=${host.token}`, { signal: abort.signal });
    assert.equal(stream.headers.get("content-type"), "text/event-stream");
    const reader = stream.body.getReader(), decoder = new TextDecoder();
    let initial = "";
    while (!initial.includes("\n\n")) initial += decoder.decode((await reader.read()).value);
    assert.match(initial.slice(0, 20), /event: state/);
    assert.equal(JSON.parse(initial.split("\ndata: ")[1].split("\n\n")[0]).players[0].online, true);
    const guest = await (await post(roomUrl + "/join", { name: "Guest" })).json();
    let update = "";
    while (!update.includes('"name":"Guest"')) update += decoder.decode((await reader.read()).value);
    assert.ok(update.includes('"name":"Guest"'));
    const denied = await post(roomUrl + "/action", { type: "start" }, guest.token); assert.equal(denied.status, 403);
    assert.equal((await post(roomUrl + "/action", { type: "start" }, host.token)).status, 200);
    const third = await (await post(roomUrl + "/join", { name: "Late designer" })).json();
    assert.equal(third.state.phase, "design");
    for (const token of [host.token, guest.token, third.token]) assert.equal((await post(roomUrl + "/action", { type: "ready" }, token)).status, 200);
    const fourthResponse = await post(roomUrl + "/join", { name: "Late explorer" });
    assert.equal(fourthResponse.status, 200);
    const fourth = await fourthResponse.json();
    assert.equal(fourth.state.phase, "play");
    assert.equal(fourth.state.players.find(player => player.id === fourth.playerId).ready, true);
    assert.equal((await post(roomUrl + "/join", { name: "Extra" })).status, 409);
    assert.equal((await fetch(base + "/game/")).status, 200);
    assert.equal((await fetch(base + "/.git/config")).status, 404);
    assert.equal((await fetch(base + "/scripts/room-server.mjs")).status, 404);
    assert.equal((await fetch(base + roomUrl)).status, 401);
    const network = await (await fetch(base + "/api/network")).json(); assert.ok(Array.isArray(network.urls));
  } finally { abort.abort(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
