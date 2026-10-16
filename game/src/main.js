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
const gameScreen = document.getElementById("gameScreen");
const newGameButton = document.getElementById("newGameButton");
const creatorButton = document.getElementById("creatorButton");
const creatorBackButton = document.getElementById("creatorBackButton");
const characterForm = document.getElementById("characterForm");
const heroNameInput = document.getElementById("heroName");
const heroPreview = document.getElementById("heroPreview");
const previewName = document.getElementById("previewName");
const previewStyle = document.getElementById("previewStyle");
const avatarOptions = document.getElementById("avatarOptions");
const heroLabel = document.getElementById("heroLabel");
const locationLabel = document.getElementById("locationLabel");
const islandDesigner = document.getElementById("islandDesigner");
const islandTabs = document.getElementById("islandTabs");
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
  gameScreen.hidden = screen !== "game";

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
      }
    });
  }
  return world;
}

function buildIslandTabs() {
  islandTabs.replaceChildren();

  islands.forEach((island, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "island-tab";
    button.dataset.island = island.id;
    button.textContent = index === 0 ? "Harbor" : `Island ${index}`;
    button.title = `${island.name}, designed by ${island.designer}`;
    button.addEventListener("click", () => loadIsland(island.id));
    islandTabs.appendChild(button);
  });
}

function loadIsland(islandId) {
  const island = getIsland(islandId);
  if (!island) {
    messageEl.textContent = "That island could not be found.";
    return;
  }

  currentIslandId = island.id;
  worldLoading.hidden = false;
  ensureWorld().setHeroStyle(selectedStyle);
  world.loadIsland(island);

  locationLabel.textContent = island.name;
  islandDesigner.textContent = `Designed by ${island.designer}`;
  islandName.textContent = island.name;
  islandBiome.textContent = island.biome;
  islandGoal.textContent = island.story.goal;
  messageEl.textContent = island.story.arrival;

  islandTabs.querySelectorAll(".island-tab").forEach((button) => {
    const isSelected = button.dataset.island === island.id;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-current", isSelected ? "page" : "false");
  });

  requestAnimationFrame(() => {
    world.resize();
    worldLoading.hidden = true;
  });
}

function startAdventure() {
  heroLabel.textContent = `${heroNameFromInput()} - ${heroStyles[selectedStyle]}`;
  showScreen("game");
  loadIsland(currentIslandId);
}

const registryErrors = validateRegistry();
if (registryErrors.length > 0) {
  worldLoading.hidden = false;
  worldLoading.textContent = "The island files need fixing. Run the island validator.";
  console.error("Island validation errors:", registryErrors);
} else {
  buildIslandTabs();
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
mainMenuButton.addEventListener("click", () => showScreen("menu"));

characterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  startAdventure();
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
