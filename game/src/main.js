import { IslandWorld } from "./island-engine.js";
import { getIsland, islands, validateRegistry } from "../islands/island-registry.js";
import { MultiplayerSession } from "./multiplayer.js?v=island-quest-2";
import { IslandEditor } from "./island-editor.js";

const heroStyles = {
  trail: "Trail Scout",
  guard: "Gate Guard",
  star: "Star Mage"
};

let selectedStyle = "trail";
let currentIslandId = islands[0].id;
let world = null;
let editor = null, editingIslandId = null, startedPlay = false, connected = false, finishing = false;
let networkUrls = [];

const menuScreen = document.getElementById("menuScreen");
const creatorScreen = document.getElementById("creatorScreen");
const islandSelectScreen = document.getElementById("islandSelectScreen");
const gameScreen = document.getElementById("gameScreen");
const newGameButton = document.getElementById("newGameButton");
const creatorButton = document.getElementById("creatorButton");
const creatorBackButton = document.getElementById("creatorBackButton");
const islandSelectBackButton = document.getElementById("islandSelectBackButton");
const characterForm = document.getElementById("characterForm");
const heroNameInput = document.getElementById("heroName");
const heroPreview = document.getElementById("heroPreview");
const previewName = document.getElementById("previewName");
const previewStyle = document.getElementById("previewStyle");
const avatarOptions = document.getElementById("avatarOptions");
const startIslandOptions = document.getElementById("startIslandOptions");
const travelPanel = document.getElementById("travelPanel");
const travelIslandOptions = document.getElementById("travelIslandOptions");
const closeTravelButton = document.getElementById("closeTravelButton");
const heroLabel = document.getElementById("heroLabel");
const locationLabel = document.getElementById("locationLabel");
const islandDesigner = document.getElementById("islandDesigner");
const islandName = document.getElementById("islandName");
const islandBiome = document.getElementById("islandBiome");
const islandGoal = document.getElementById("islandGoal");
const messageEl = document.getElementById("message");
const worldCanvas = document.getElementById("worldCanvas");
const worldLoading = document.getElementById("worldLoading");
const mainMenuButton = document.getElementById("mainMenuButton");

function heroNameFromInput() {
  return heroNameInput.value.trim() || "Player One";
}

function showScreen(screen) {
  menuScreen.hidden = screen !== "menu";
  creatorScreen.hidden = screen !== "creator";
  islandSelectScreen.hidden = screen !== "islands";
  gameScreen.hidden = screen !== "game";
  document.getElementById("lobbyScreen").hidden = screen !== "lobby";
  document.getElementById("editorScreen").hidden = screen !== "editor";
  if (editor) editor.world.setActive(screen === "editor");

  if (screen !== "game") {
    travelPanel.hidden = true;
  }

  if (world) {
    world.setActive(screen === "game");
    if (screen === "game") {
      requestAnimationFrame(() => world.resize());
    }
  }
}

function sessionIsland(id) {
  const base = getIsland(id), owner = session.state?.players.find(player => player.islandId === id);
  if (!owner) return base;
  return { ...base, name: `${owner.name}'s Island`, designer: owner.name,
    landmarks: base.landmarks.map(item => item.kind === "boat" ? { ...item, name: `${owner.name}'s Boat` } : item),
    story: { ...base.story, arrival: `Welcome to ${owner.name}'s island. Explore the world they designed.`, goal: "Discover the island's landmarks, then board its shoreline boat to visit your friends." }
  };
}

const session = new MultiplayerSession({
  onState: state => {
    const me = session.me;
    if (!me) {
      session.reset(); connected = false; startedPlay = false; editingIslandId = null;
      document.getElementById("lobbyEntry").hidden = false; document.getElementById("roomDetails").hidden = true;
      document.getElementById("connectionStatus").textContent = "The host removed you from that room. You can join another expedition.";
      showScreen("lobby"); return;
    }
    heroNameInput.value = me.name; selectedStyle = me.style;
    renderRoom(state);
    renderCrew(state.players);
    if (state.phase === "lobby" && startedPlay) {
      startedPlay = false; editingIslandId = null; world?.visited.clear(); showScreen("lobby");
    }
    if (state.phase === "design") {
      if (!editor) editor = new IslandEditor({ onChange: saveIsland, onFinish: finishDesign });
      if (editingIslandId !== me.islandId) {
        showScreen("editor"); editor.load(sessionIsland(me.islandId), state.designs[me.islandId]); editingIslandId = me.islandId;
      }
      editor.setLocked(!connected || me.ready || finishing || session.remaining <= 0);
      document.getElementById("finishDesignButton").textContent = me.ready ? "Island ready" : "Finish my island";
      document.getElementById("editorWaitMessage").textContent = me.ready ? "Your island is locked in. Waiting for the other designers or the timer." : "Your boat will moor automatically along your coastline.";
    } else if (state.phase === "play" && !startedPlay) {
      startedPlay = true;
      startAdventure(me.islandId, true);
    }
    if (state.phase === "play" && world) {
      const island = sessionIsland(currentIslandId);
      if (world.currentIsland.name !== island.name || world.currentIsland.designer !== island.designer) {
        // A late join can claim the island someone is already visiting. Update
        // its owner labels without reloading the world or moving that visitor.
        world.currentIsland = island;
        locationLabel.textContent = island.name;
        islandDesigner.textContent = `Designed by ${island.designer}`;
        islandName.textContent = island.name;
        islandGoal.textContent = island.story.goal;
        world.boat.name = island.landmarks.find(item => item.kind === "boat").name;
        updateJournal(world.visited.get(island.id), world.features);
      }
      world.setPeers(state.players.filter(player => player.id !== session.playerId));
    }
  },
  onPresence: players => { renderCrew(players); world?.setPeers(players.filter(player => player.id !== session.playerId)); },
  onConnection: (online, message) => {
    connected = online;
    document.getElementById("connectionStatus").textContent = message || `Connected to room ${session.code} as ${session.me?.name}.`;
    document.getElementById("editorSaveState").textContent = online ? `Room ${session.code} · connected` : "Reconnecting to room…";
    if (editor && session.state?.phase === "design") editor.setLocked(!online || session.me?.ready || finishing || session.remaining <= 0);
    if (world && session.state?.phase === "play") world.setActive(online && !gameScreen.hidden && travelPanel.hidden);
    if (online && session.pending && session.state?.phase === "design") saveIsland(session.pending);
  }
});

const resetDialog = document.getElementById("resetGameDialog");
document.getElementById("resetGameButton").addEventListener("click", () => {
  resetDialog.showModal();
});
document.getElementById("cancelResetButton").addEventListener("click", () => resetDialog.close());
document.getElementById("confirmResetButton").addEventListener("click", async event => {
  const button = event.currentTarget, cancel = document.getElementById("cancelResetButton");
  button.disabled = true; cancel.disabled = true;
  resetDialog.addEventListener("cancel", preventResetCancel);
  // Cancel unsent edits before disconnecting. Full navigation recreates every
  // screen, animation, timer, and form from its original startup defaults.
  if (editor) {
    clearTimeout(editor.saveTimer); editor.saveTimer = null;
    editor.dirty = false; editor.setLocked(true); editor.world.setActive(false);
  }
  world?.setActive(false);
  try {
    await session.leave();
    location.replace(location.pathname);
  } catch (error) {
    document.getElementById("resetGameDescription").textContent = `Your island could not be released: ${error.message} Check your connection and try Reset to start again.`;
    editor?.setLocked(!connected || session.me?.ready || session.state?.phase !== "design" || session.remaining <= 0);
    if (world) world.setActive(connected && !gameScreen.hidden && travelPanel.hidden);
  } finally {
    button.disabled = false; cancel.disabled = false;
    resetDialog.removeEventListener("cancel", preventResetCancel);
  }
});
function preventResetCancel(event) { event.preventDefault(); }

async function runLobbyAction(task, button) {
  if (button) button.disabled = true;
  try { await task(); } catch (error) { document.getElementById("connectionStatus").textContent = error.message; }
  finally { if (button) button.disabled = false; }
}

function renderRoom(state) {
  document.getElementById("lobbyEntry").hidden = true;
  document.getElementById("roomDetails").hidden = false;
  document.getElementById("roomCodeLabel").textContent = state.code;
  const slots = document.getElementById("playerSlots"); slots.replaceChildren();
  islands.forEach((island, index) => {
    const player = state.players.find(p => p.islandId === island.id), card = document.createElement("div"); card.className = `player-slot${player ? " occupied" : ""}`;
    const number = document.createElement("span"); number.className = "slot-number"; number.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("strong"); name.textContent = player ? `${player.name}${player.id === state.hostId ? " · host" : ""}` : "Waiting for an explorer";
    const biome = document.createElement("span"); biome.textContent = island.biome;
    const status = document.createElement("small"); status.textContent = !player ? "Starting island available" : player.ready ? "Island ready" : state.phase === "design" ? "Designing" : player.online ? "Connected" : "Reconnecting";
    card.append(number, name, biome, status); slots.append(card);
    if (player && player.id !== state.hostId && session.playerId === state.hostId && state.phase === "lobby") {
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "secondary-button compact-button"; remove.textContent = `Remove ${player.name}`;
      remove.addEventListener("click", () => runLobbyAction(() => session.action({ type: "remove", playerId: player.id }), remove)); card.append(remove);
    }
  });
  const isHost = state.hostId === session.playerId;
  document.getElementById("designMinutes").disabled = !isHost || state.phase !== "lobby";
  if (document.activeElement !== document.getElementById("designMinutes")) document.getElementById("designMinutes").value = state.durationSeconds / 60;
  document.getElementById("startDesignButton").hidden = !isHost || state.phase !== "lobby";
  document.getElementById("resumeGameButton").hidden = state.phase !== "play";
  document.getElementById("restartRoundButton").hidden = !isHost || state.phase !== "play";
  const links = document.getElementById("joinLinks"); links.replaceChildren();
  const urls = networkUrls.length ? networkUrls : [location.origin + location.pathname];
  for (const url of urls) { const link = document.createElement("a"); link.href = `${url}?room=${state.code}`; link.textContent = link.href; links.append(link); }
}

function renderCrew(players) {
  const online = players.filter(player => player.online).length;
  document.getElementById("crewLabel").textContent = `Room ${session.code || ""} · ${online} explorer${online === 1 ? "" : "s"} online`;
  const list = document.getElementById("editorCrew"); list.replaceChildren();
  players.forEach(player => { const tag = document.createElement("span"); tag.className = player.ready ? "crew-ready" : ""; tag.textContent = `${player.ready ? "✓" : "◌"} ${player.name}${player.id === session.playerId ? " (you)" : ""} · ${player.ready ? "ready" : player.online ? "designing" : "offline"}`; list.append(tag); });
}

async function saveIsland(design) {
  try {
    await session.save(design);
    if (editor) editor.status.textContent = "Island saved to the room. Undo and redo are available while the clock runs.";
  } catch (error) {
    if (editor) editor.status.textContent = `Not saved: ${error.message}`;
  }
}

async function finishDesign() {
  if (finishing || !connected || session.me?.ready) return;
  finishing = true; editor.setLocked(true);
  try { await editor.flushChanges(); await session.flush(); await session.action({ type: "ready" }); }
  catch (error) { editor.status.textContent = error.message; }
  finally { finishing = false; editor.setLocked(!connected || session.me?.ready || session.state?.phase !== "design" || session.remaining <= 0); }
}

document.getElementById("hostRoomButton").addEventListener("click", event => runLobbyAction(() => session.create({ name: heroNameFromInput(), style: selectedStyle }), event.currentTarget));
document.getElementById("joinRoomForm").addEventListener("submit", event => { event.preventDefault(); runLobbyAction(() => session.join(document.getElementById("roomCodeInput").value, { name: heroNameFromInput(), style: selectedStyle }), event.submitter); });
document.getElementById("startDesignButton").addEventListener("click", event => runLobbyAction(async () => {
  await session.action({ type: "settings", durationSeconds: Math.round(Number(document.getElementById("designMinutes").value) * 60) });
  await session.action({ type: "start" });
}, event.currentTarget));
document.getElementById("designMinutes").addEventListener("change", () => runLobbyAction(() => session.action({ type: "settings", durationSeconds: Math.round(Number(document.getElementById("designMinutes").value) * 60) })));
document.getElementById("lobbyBackButton").addEventListener("click", () => showScreen("menu"));
document.getElementById("resumeGameButton").addEventListener("click", () => showScreen("game"));
document.getElementById("restartRoundButton").addEventListener("click", event => runLobbyAction(() => session.action({ type: "restart" }), event.currentTarget));
document.getElementById("copyJoinButton").addEventListener("click", async event => {
  const url = document.querySelector("#joinLinks a")?.href;
  try { await navigator.clipboard.writeText(url); event.currentTarget.textContent = "Join link copied"; }
  catch { document.getElementById("connectionStatus").textContent = `Copy this join link: ${url}`; }
});

setInterval(() => {
  if (session.state?.phase !== "design") return;
  const seconds = Math.ceil(session.remaining / 1000);
  document.getElementById("designClock").textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  document.getElementById("designClock").classList.toggle("time-low", seconds <= 30);
  if (!seconds) editor?.setLocked(true);
}, 200);

let lastPresence = "", lastPresenceAt = 0, presenceBusy = false;
setInterval(async () => {
  if (!connected || !world?.player || session.state?.phase !== "play" || presenceBusy) return;
  const position = { type: "presence", islandId: currentIslandId, x: Math.round(world.player.x * 100) / 100, z: Math.round(world.player.z * 100) / 100, sailing: Boolean(world.sailing) };
  const serialized = JSON.stringify(position);
  if (serialized === lastPresence && Date.now() - lastPresenceAt < 5000) return;
  presenceBusy = true;
  try { await session.action(position); lastPresence = serialized; lastPresenceAt = Date.now(); } catch { /* EventSource shows connection state and reconnects. */ }
  finally { presenceBusy = false; }
}, 180);

fetch(`${globalThis.SHARED_QUEST_API || ""}/api/network`).then(response => response.json()).then(result => { networkUrls = result.urls; if (session.state) renderRoom(session.state); }).catch(() => {});
const requestedRoom = new URLSearchParams(location.search).get("room");
if (requestedRoom) document.getElementById("roomCodeInput").value = requestedRoom.toUpperCase();
session.restore().then(restored => { if (restored && session.state.phase === "lobby") showScreen("lobby"); });

function updateCreatorPreview() {
  previewName.textContent = heroNameFromInput();
  previewStyle.textContent = heroStyles[selectedStyle];
  heroPreview.className = `avatar-token avatar-${selectedStyle} avatar-large`;
}

function selectAvatarOption(style) {
  selectedStyle = style;
  avatarOptions.querySelectorAll(".avatar-option").forEach((button) => {
    const isSelected = button.dataset.style === selectedStyle;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function ensureWorld() {
  if (!world) {
    world = new IslandWorld({
      canvas: worldCanvas,
      onMessage: (message) => {
        messageEl.textContent = message;
      },
      onTravel: openTravelPanel,
      onDiscovery: updateJournal
    });
  }
  return world;
}

function updateJournal(visited, features) {
  document.getElementById("discoveryCount").textContent = `${visited.size} / ${features.length} explored`;
  document.getElementById("discoveryProgress").value = visited.size;
  document.getElementById("discoveryProgress").max = features.length;
  const list = document.getElementById("landmarkList");
  list.replaceChildren();
  features.forEach(feature => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `journal-feature${visited.has(feature.index) ? " explored" : ""}`;
    const number = document.createElement("span");
    number.className = "feature-number";
    number.textContent = visited.has(feature.index) ? "✓" : String(feature.index + 1).padStart(2, "0");
    const title = document.createElement("span");
    title.textContent = feature.name;
    const kind = document.createElement("small");
    kind.textContent = feature.kind === "boat" ? "Set sail" : feature.kind;
    title.appendChild(kind);
    button.append(number, title);
    button.addEventListener("click", () => { world.walkTo(feature); worldCanvas.focus({ preventScroll: true }); });
    list.appendChild(button);
  });
}

document.querySelectorAll("[data-zoom]").forEach(button => {
  button.addEventListener("click", () => {
    if (world) world.setZoom(button.dataset.zoom === "reset" ? 1 : world.zoom + Number(button.dataset.zoom));
    worldCanvas.focus({ preventScroll: true });
  });
});
document.getElementById("exploreButton").addEventListener("click", () => world?.interact());

function createIslandChoice(island, onChoose) {
  const button = document.createElement("button");
  const name = document.createElement("span");
  const biome = document.createElement("span");
  const tagline = document.createElement("span");

  button.type = "button";
  button.className = "island-choice";
  button.dataset.island = island.id;
  name.className = "island-choice-name";
  biome.className = "island-choice-biome";
  tagline.className = "island-choice-tagline";
  name.textContent = island.name;
  biome.textContent = island.biome;
  tagline.textContent = island.tagline;
  button.append(name, biome, tagline);
  button.addEventListener("click", () => onChoose(island.id));
  return button;
}

function buildStartIslandOptions() {
  startIslandOptions.replaceChildren();
  islands.forEach((island) => {
    startIslandOptions.appendChild(createIslandChoice(island, startAdventure));
  });
}

function buildTravelIslandOptions() {
  travelIslandOptions.replaceChildren();
  islands
    .filter((island) => island.id !== currentIslandId)
    .forEach((island) => {
      travelIslandOptions.appendChild(
        createIslandChoice(sessionIsland(island.id), (islandId) => {
          travelPanel.hidden = true;
          loadIsland(islandId, true);
        })
      );
    });
}

function openTravelPanel() {
  buildTravelIslandOptions();
  travelPanel.hidden = false;
  world.setActive(false);
  closeTravelButton.focus();
}

function closeTravelPanel() {
  travelPanel.hidden = true;
  world.arrive(() => worldCanvas.focus({ preventScroll: true }));
  worldCanvas.focus({ preventScroll: true });
}

function loadIsland(islandId, arrival = false) {
  const island = sessionIsland(islandId);
  currentIslandId = island.id;
  worldLoading.hidden = false;

  const islandWorld = ensureWorld();
  islandWorld.setActive(!gameScreen.hidden);
  islandWorld.setHeroStyle(selectedStyle);
  islandWorld.loadIsland(island, session.state?.designs[islandId]);
  islandWorld.setPeers((session.state?.players || []).filter(player => player.id !== session.playerId));
  if (arrival) islandWorld.arrive();

  locationLabel.textContent = island.name;
  islandDesigner.textContent = `Designed by ${island.designer}`;
  islandName.textContent = island.name;
  islandBiome.textContent = island.biome;
  islandGoal.textContent = island.story.goal;
  if (!arrival) messageEl.textContent = island.story.arrival;

  requestAnimationFrame(() => {
    world.resize();
    worldLoading.hidden = true;
    worldCanvas.focus({ preventScroll: true });
  });
}

function startAdventure(islandId, arrival = false) {
  heroLabel.textContent = `${heroNameFromInput()} - ${heroStyles[selectedStyle]}`;
  currentIslandId = islandId;
  showScreen("game");
  loadIsland(islandId, arrival);
}

const registryErrors = validateRegistry();
if (registryErrors.length > 0) {
  worldLoading.hidden = false;
  worldLoading.textContent = "The island files need fixing. Run the island validator.";
  console.error("Island validation errors:", registryErrors);
} else {
  buildStartIslandOptions();
}

newGameButton.addEventListener("click", () => {
  if (session.state) { showScreen("lobby"); return; }
  heroNameInput.value = "Player One";
  selectAvatarOption("trail");
  updateCreatorPreview();
  showScreen("creator");
});

creatorButton.addEventListener("click", () => {
  updateCreatorPreview();
  showScreen("creator");
});

creatorBackButton.addEventListener("click", () => showScreen("menu"));
islandSelectBackButton.addEventListener("click", () => showScreen("creator"));
mainMenuButton.addEventListener("click", () => showScreen(session.state ? "lobby" : "menu"));
closeTravelButton.addEventListener("click", closeTravelPanel);

characterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  showScreen("lobby");
});

heroNameInput.addEventListener("input", updateCreatorPreview);

avatarOptions.querySelectorAll(".avatar-option").forEach((button) => {
  button.addEventListener("click", () => {
    selectAvatarOption(button.dataset.style);
    updateCreatorPreview();
  });
});

selectAvatarOption(selectedStyle);
updateCreatorPreview();
