import test from "node:test";
import assert from "node:assert/strict";
import { MultiplayerSession } from "../game/src/multiplayer.js";

const state = () => ({ code: "ABC123", phase: "design", serverTime: Date.now(), durationSeconds: 300, deadline: Date.now() + 300000, players: [{ id: "player", islandId: "emma-island", ready: false }], designs: { "emma-island": { revision: 0 } } });
const credentials = () => ({ token: "test-token", playerId: "player", state: state() });

test("a static upload uses its configured HTTPS backend for requests and live events", async t => {
  const { session } = setup(t);
  const oldApi = globalThis.SHARED_QUEST_API, OriginalEvents = globalThis.EventSource;
  t.after(() => { globalThis.SHARED_QUEST_API = oldApi; });
  globalThis.SHARED_QUEST_API = "https://quest.example";
  let requested, eventUrl;
  globalThis.fetch = async url => { requested = url; return new Response(JSON.stringify(credentials()), { status: 201 }); };
  globalThis.EventSource = class extends OriginalEvents { constructor(url) { super(); eventUrl = url; } };
  await session.create({ name: "Explorer" });
  assert.equal(requested, "https://quest.example/api/rooms");
  assert.equal(eventUrl, "https://quest.example/api/rooms/ABC123/events?token=test-token");
});
function setup(t) {
  const old = { fetch: globalThis.fetch, storage: globalThis.sessionStorage, EventSource: globalThis.EventSource };
  t.after(() => { globalThis.fetch = old.fetch; globalThis.sessionStorage = old.storage; globalThis.EventSource = old.EventSource; });
  const storage = new Map(), notifications = [];
  globalThis.sessionStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  globalThis.EventSource = class {
    listeners = {};
    addEventListener(name, callback) { this.listeners[name] = callback; }
    close() { this.closed = true; this.onerror?.(); }
    emit(name, value) { this.listeners[name]?.({ data: JSON.stringify(value) }); }
  };
  const session = new MultiplayerSession({ onState: value => notifications.push(value), onPresence: value => notifications.push(value), onConnection: value => notifications.push(value) });
  return { session, storage, notifications };
}

test("reset disconnects the player and ignores buffered room events", t => {
  const { session, storage, notifications } = setup(t);
  session.attach(credentials());
  const stream = session.events;
  session.pending = { tiles: [] }; session.clockOffset = 1000;
  session.reset();
  stream.emit("state", state()); stream.emit("presence", { players: [] }); stream.onopen();
  assert.equal(stream.closed, true);
  assert.equal(storage.size, 0);
  assert.equal(session.state, null); assert.equal(session.code, null);
  assert.equal(session.token, null); assert.equal(session.playerId, null);
  assert.equal(session.pending, null); assert.equal(session.clockOffset, 0);
  assert.equal(notifications.length, 1, "Old callbacks must not restore the room after reset");
});

test("reset during a create, join, or reconnect cannot sign the player back in", async t => {
  for (const operation of ["create", "join", "restore"]) {
    const { session, storage } = setup(t);
    let reply;
    globalThis.fetch = () => new Promise(resolve => { reply = resolve; });
    storage.set("shared-quest-session", JSON.stringify({ token: "test-token", playerId: "player", code: "ABC123" }));
    const pending = operation === "create" ? session.create({ name: "Player" }) : operation === "join" ? session.join("ABC123", { name: "Player" }) : session.restore();
    session.reset(); reply(new Response(JSON.stringify(credentials()), { status: 200 }));
    await pending;
    assert.equal(session.state, null); assert.equal(session.events, null); assert.equal(storage.size, 0);
  }
});

test("an interrupted save cannot restore discarded edits after reset", async t => {
  const { session, storage } = setup(t);
  session.attach(credentials());
  let reply;
  globalThis.fetch = () => new Promise(resolve => { reply = resolve; });
  const pending = session.save({ tiles: [], objects: [] });
  session.reset(); reply(new Response(JSON.stringify({ error: "Connection interrupted" }), { status: 503 }));
  await assert.rejects(pending, /Connection interrupted/);
  assert.equal(session.pending, null); assert.equal(session.saving, null);
  assert.equal(session.state, null); assert.equal(storage.size, 0);
});
