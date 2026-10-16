import { IslandWorld } from "./island-engine.js";
import { getIsland, islands, validateRegistry } from "../islands/island-registry.js";

const heroStyles = {
  trail: "Trail Scout",
  guard: "Gate Guard",
  star: "Star Mage"
};

let selectedStyle = "trail";
let currentIslandId = islands[0].id;
let world = null;

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
      onTravel: openTravelPanel
    });
  }
  return world;
}

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
        createIslandChoice(island, (islandId) => {
          travelPanel.hidden = true;
          loadIsland(islandId);
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
  world.setActive(true);
  worldCanvas.focus({ preventScroll: true });
}

function loadIsland(islandId) {
  const island = getIsland(islandId);
  currentIslandId = island.id;
  worldLoading.hidden = false;

  const islandWorld = ensureWorld();
  islandWorld.setActive(!gameScreen.hidden);
  islandWorld.setHeroStyle(selectedStyle);
  islandWorld.loadIsland(island);

  locationLabel.textContent = island.name;
  islandDesigner.textContent = `Designed by ${island.designer}`;
  islandName.textContent = island.name;
  islandBiome.textContent = island.biome;
  islandGoal.textContent = island.story.goal;
  messageEl.textContent = island.story.arrival;

  requestAnimationFrame(() => {
    world.resize();
    worldLoading.hidden = true;
    worldCanvas.focus({ preventScroll: true });
  });
}

function startAdventure(islandId) {
  heroLabel.textContent = `${heroNameFromInput()} - ${heroStyles[selectedStyle]}`;
  currentIslandId = islandId;
  showScreen("game");
  loadIsland(islandId);
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
mainMenuButton.addEventListener("click", () => showScreen("menu"));
closeTravelButton.addEventListener("click", closeTravelPanel);

characterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  showScreen("islands");
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
