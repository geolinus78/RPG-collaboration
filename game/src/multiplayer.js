export const apiUrl = path => `${globalThis.SHARED_QUEST_API || ""}${path}`;

export class MultiplayerSession {
  constructor({ onState, onPresence, onConnection }) {
    Object.assign(this, { onState, onPresence, onConnection });
    this.pending = null;
    this.clockOffset = 0;
    this.generation = 0;
  }
  async request(path, data) {
    const response = await fetch(apiUrl(path), {
      method: data === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
      ...(data === undefined ? {} : { body: JSON.stringify(data) })
    });
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error || "Could not connect to the game server."), { status: response.status });
    return result;
  }
  accept(state) {
    if (this.leaving) return;
    if (state.phase !== "design") this.pending = null;
    this.clockOffset = state.serverTime - Date.now();
    this.state = state;
    this.onState(state);
  }
  async create(identity) {
    const generation = this.generation, result = await this.request("/api/rooms", identity);
    if (generation === this.generation) this.attach(result);
  }
  async join(code, identity) {
    const generation = this.generation, result = await this.request(`/api/rooms/${encodeURIComponent(code.trim().toUpperCase())}/join`, identity);
    if (generation === this.generation) this.attach(result);
  }
  attach(result) {
    this.events?.close();
    this.token = result.token;
    this.playerId = result.playerId;
    this.code = result.state.code;
    sessionStorage.setItem("shared-quest-session", JSON.stringify({ token: this.token, playerId: this.playerId, code: this.code }));
    this.accept(result.state);
    this.listen();
  }
  async restore() {
    const generation = this.generation;
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem("shared-quest-session")); } catch { return false; }
    if (!saved) return false;
    Object.assign(this, saved);
    try {
      const result = await this.request(`/api/rooms/${this.code}`);
      if (generation !== this.generation) return false;
      this.accept(result.state); this.listen(); return true;
    } catch (error) {
      if (generation !== this.generation) return false;
      sessionStorage.removeItem("shared-quest-session");
      this.token = null; this.playerId = null; this.code = null;
      this.onConnection(false, error.status === 404 ? "The previous room has closed. Create or join a room." : error.message);
      return false;
    }
  }
  listen() {
    const events = new EventSource(apiUrl(`/api/rooms/${this.code}/events?token=${encodeURIComponent(this.token)}`));
    this.events = events;
    events.onopen = () => { if (this.events === events && !this.leaving) this.onConnection(true); };
    events.onerror = () => { if (this.events === events && !this.leaving) this.onConnection(false, "Connection interrupted. Reconnecting; editing is paused until the room reconnects."); };
    events.addEventListener("state", event => { if (this.events === events) this.accept(JSON.parse(event.data)); });
    events.addEventListener("presence", event => {
      if (this.events !== events || this.leaving) return;
      const { players } = JSON.parse(event.data);
      if (this.state) this.state.players = players;
      this.onPresence(players);
    });
  }
  get me() { return this.state?.players.find(player => player.id === this.playerId); }
  async leave() {
    if (this.token && this.code) {
      this.leaving = true;
      this.pending = null;
      try { await this.request(`/api/rooms/${this.code}/action`, { type: "leave" }); }
      catch (error) {
        if (![401, 404].includes(error.status)) { this.leaving = false; throw error; }
      }
    }
    this.reset();
  }
  reset() {
    this.leaving = false;
    this.generation++;
    const events = this.events; this.events = null; events?.close();
    sessionStorage.removeItem("shared-quest-session");
    this.token = null; this.playerId = null; this.code = null; this.state = null; this.pending = null; this.saving = null; this.clockOffset = 0;
  }
  get remaining() { return this.state?.deadline ? Math.max(0, this.state.deadline - (Date.now() + this.clockOffset)) : this.state?.durationSeconds * 1000 || 300000; }
  async action(input) {
    const generation = this.generation;
    const result = await this.request(`/api/rooms/${this.code}/action`, input);
    if (generation === this.generation && result.state) this.accept(result.state);
    return result;
  }
  save(design) {
    if (this.leaving || this.state?.phase !== "design" || this.me?.ready) return Promise.resolve();
    this.pending = structuredClone(design);
    if (!this.saving) {
      const saving = this.drain().finally(() => { if (this.saving === saving) this.saving = null; });
      this.saving = saving;
    }
    return this.saving;
  }
  async drain() {
    const generation = this.generation;
    while (generation === this.generation && !this.leaving && this.pending && this.state?.phase === "design" && !this.me?.ready) {
      const design = this.pending;
      this.pending = null;
      try {
        await this.action({ type: "design", islandId: this.me.islandId, revision: this.state.designs[this.me.islandId].revision, design });
      } catch (error) { if (generation === this.generation && !this.leaving && !this.pending) this.pending = design; throw error; }
    }
  }
  async flush() { if (this.saving) await this.saving; if (this.pending) await this.save(this.pending); }
}
