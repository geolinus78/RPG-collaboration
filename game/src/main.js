(function () {
  var world = window.GAME_WORLD;
  var dialogue = window.GAME_DIALOGUE;
  var quests = window.GAME_QUESTS;

  var heroStyles = {
    trail: "Trail Scout",
    guard: "Gate Guard",
    star: "Star Mage"
  };

  var selectedStyle = "trail";

  function createInitialState(hero) {
    var heroName = hero && hero.name ? hero.name : "Player One";
    var heroStyle = hero && hero.style ? hero.style : "trail";

    return {
      mapId: world.start.mapId,
      x: world.start.x,
      y: world.start.y,
      inventory: [],
      collected: {},
      flags: {},
      hero: {
        name: heroName,
        style: heroStyle
      },
      message: "Welcome, " + heroName + ". Start from the harbor and map the islands."
    };
  }

  var state = createInitialState();

  var menuScreen = document.getElementById("menuScreen");
  var creatorScreen = document.getElementById("creatorScreen");
  var gameScreen = document.getElementById("gameScreen");
  var newGameButton = document.getElementById("newGameButton");
  var creatorButton = document.getElementById("creatorButton");
  var creatorBackButton = document.getElementById("creatorBackButton");
  var characterForm = document.getElementById("characterForm");
  var heroNameInput = document.getElementById("heroName");
  var heroPreview = document.getElementById("heroPreview");
  var previewName = document.getElementById("previewName");
  var previewStyle = document.getElementById("previewStyle");
  var avatarOptions = document.getElementById("avatarOptions");
  var mapEl = document.getElementById("map");
  var heroLabel = document.getElementById("heroLabel");
  var locationLabel = document.getElementById("locationLabel");
  var messageEl = document.getElementById("message");
  var inventoryEl = document.getElementById("inventory");
  var questListEl = document.getElementById("questList");
  var mainMenuButton = document.getElementById("mainMenuButton");

  function showScreen(screen) {
    menuScreen.hidden = screen !== "menu";
    creatorScreen.hidden = screen !== "creator";
    gameScreen.hidden = screen !== "game";
  }

  function heroNameFromInput() {
    var name = heroNameInput.value.trim();
    return name || "Player One";
  }

  function updateCreatorPreview() {
    var styleName = heroStyles[selectedStyle] || heroStyles.trail;

    previewName.textContent = heroNameFromInput();
    previewStyle.textContent = styleName;
    heroPreview.className = "avatar-token avatar-" + selectedStyle + " avatar-large";
  }

  function createHeroToken(label) {
    var token = document.createElement("div");
    var head = document.createElement("span");
    var body = document.createElement("span");

    token.className = "avatar-token avatar-" + state.hero.style;
    token.setAttribute("aria-label", label || state.hero.name);
    head.className = "avatar-head";
    body.className = "avatar-body";
    token.appendChild(head);
    token.appendChild(body);

    return token;
  }

  function currentMap() {
    return world.maps[state.mapId];
  }

  function tileAt(x, y) {
    var map = currentMap();
    var symbol = map.rows[y] && map.rows[y][x];
    return world.tiles[symbol] || world.tiles["."];
  }

  function visibleFeatures() {
    return currentMap().features.filter(function (feature) {
      return feature.type !== "item" || !state.collected[feature.id];
    });
  }

  function featureAt(x, y) {
    return visibleFeatures().find(function (feature) {
      return feature.x === x && feature.y === y;
    });
  }

  function nearbyFeature() {
    var spots = [
      [state.x, state.y],
      [state.x, state.y - 1],
      [state.x + 1, state.y],
      [state.x, state.y + 1],
      [state.x - 1, state.y]
    ];

    for (var index = 0; index < spots.length; index += 1) {
      var found = featureAt(spots[index][0], spots[index][1]);
      if (found) {
        return found;
      }
    }

    return null;
  }

  function hasItem(itemId) {
    return state.inventory.indexOf(itemId) !== -1;
  }

  function itemName(itemId) {
    var names = {
      oldCompass: "Old Compass"
    };

    return names[itemId] || itemId;
  }

  function setMessage(text) {
    state.message = text;
    messageEl.textContent = text;
  }

  function sprite(name, label) {
    var img = document.createElement("img");
    img.className = "sprite";
    img.src = "assets/art/" + name + ".svg";
    img.alt = label || name;
    img.draggable = false;
    return img;
  }

  function renderMap() {
    var map = currentMap();
    mapEl.innerHTML = "";
    mapEl.style.gridTemplateColumns = "repeat(" + map.rows[0].length + ", 1fr)";
    mapEl.style.gridTemplateRows = "repeat(" + map.rows.length + ", 1fr)";
    heroLabel.textContent = state.hero.name + " - " + (heroStyles[state.hero.style] || heroStyles.trail);
    locationLabel.textContent = map.name;

    for (var y = 0; y < map.rows.length; y += 1) {
      for (var x = 0; x < map.rows[y].length; x += 1) {
        var tile = tileAt(x, y);
        var feature = featureAt(x, y);
        var cell = document.createElement("div");
        cell.className = "tile tile-" + tile.sprite;
        cell.setAttribute("role", "img");
        cell.setAttribute("aria-label", tile.name);

        if (feature) {
          cell.appendChild(sprite(feature.sprite, feature.name));
        }

        if (state.x === x && state.y === y) {
          cell.classList.add("player-here");
          cell.innerHTML = "";
          cell.setAttribute("aria-label", state.hero.name);
          cell.appendChild(createHeroToken(state.hero.name));
        }

        mapEl.appendChild(cell);
      }
    }
  }

  function renderInventory() {
    inventoryEl.innerHTML = "";

    state.inventory.forEach(function (itemId) {
      var item = document.createElement("li");
      item.textContent = itemName(itemId);
      inventoryEl.appendChild(item);
    });
  }

  function stepComplete(condition) {
    if (condition.inventoryIncludes) {
      return hasItem(condition.inventoryIncludes);
    }

    if (condition.flag) {
      return Boolean(state.flags[condition.flag]);
    }

    return false;
  }

  function renderQuests() {
    questListEl.innerHTML = "";

    quests.forEach(function (quest) {
      var questEl = document.createElement("div");
      var currentStep = quest.steps.find(function (step) {
        return !stepComplete(step.condition);
      });
      var title = document.createElement("span");
      var stepEl = document.createElement("span");

      questEl.className = "quest";

      title.className = "quest-title";
      title.textContent = quest.title;
      questEl.appendChild(title);

      stepEl.className = "quest-step";
      stepEl.textContent = currentStep ? currentStep.text : "Complete.";
      if (!currentStep) {
        stepEl.classList.add("done");
      }
      questEl.appendChild(stepEl);

      questListEl.appendChild(questEl);
    });
  }

  function render() {
    renderMap();
    renderInventory();
    renderQuests();
    setMessage(state.message);
  }

  function collect(feature) {
    if (!hasItem(feature.itemId)) {
      state.inventory.push(feature.itemId);
    }
    state.collected[feature.id] = true;
    setMessage(feature.pickupText);
  }

  function speak(feature) {
    var lines = dialogue[feature.dialogueId] || [feature.name + " has nothing to say yet."];
    setMessage(lines.join(" "));
  }

  function openGate(feature) {
    if (!hasItem(feature.requiresItem)) {
      setMessage(feature.lockedText);
      return false;
    }

    state.flags[feature.flag] = true;
    setMessage(feature.openText);
    return true;
  }

  function interactWith(feature) {
    if (!feature) {
      setMessage("There is nothing to interact with nearby.");
      return;
    }

    if (feature.type === "item") {
      collect(feature);
      render();
      return;
    }

    if (feature.type === "npc" || feature.type === "sign") {
      speak(feature);
      return;
    }

    if (feature.type === "gate") {
      openGate(feature);
      render();
    }
  }

  function startAdventure() {
    state = createInitialState({
      name: heroNameFromInput(),
      style: selectedStyle
    });
    render();
    showScreen("game");
  }

  function tryMove(dx, dy) {
    var nextX = state.x + dx;
    var nextY = state.y + dy;
    var map = currentMap();

    if (nextY < 0 || nextY >= map.rows.length || nextX < 0 || nextX >= map.rows[0].length) {
      setMessage("You cannot walk off the map.");
      return;
    }

    var tile = tileAt(nextX, nextY);
    if (tile.blocked) {
      setMessage(tile.bumpMessage || "Something blocks the way.");
      return;
    }

    var feature = featureAt(nextX, nextY);
    if (feature && feature.type === "gate" && !state.flags[feature.flag]) {
      if (!openGate(feature)) {
        return;
      }
    }

    state.x = nextX;
    state.y = nextY;

    feature = featureAt(state.x, state.y);
    if (feature && feature.type === "item") {
      collect(feature);
    } else if (!feature) {
      setMessage("You step forward.");
    }

    render();
  }

  newGameButton.addEventListener("click", function () {
    heroNameInput.value = "Player One";
    selectedStyle = "trail";
    selectAvatarOption(selectedStyle);
    updateCreatorPreview();
    showScreen("creator");
  });

  creatorButton.addEventListener("click", function () {
    updateCreatorPreview();
    showScreen("creator");
  });

  creatorBackButton.addEventListener("click", function () {
    showScreen("menu");
  });

  mainMenuButton.addEventListener("click", function () {
    showScreen("menu");
  });

  characterForm.addEventListener("submit", function (event) {
    event.preventDefault();
    startAdventure();
  });

  heroNameInput.addEventListener("input", updateCreatorPreview);

  function selectAvatarOption(style) {
    selectedStyle = style;

    avatarOptions.querySelectorAll(".avatar-option").forEach(function (button) {
      var isSelected = button.dataset.style === selectedStyle;
      button.classList.toggle("selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
  }

  avatarOptions.querySelectorAll(".avatar-option").forEach(function (button) {
    button.addEventListener("click", function () {
      selectAvatarOption(button.dataset.style);
      updateCreatorPreview();
    });
  });

  document.addEventListener("keydown", function (event) {
    if (gameScreen.hidden) {
      return;
    }

    if (event.target.tagName === "BUTTON" || event.target.tagName === "INPUT") {
      return;
    }

    var moves = {
      ArrowUp: [0, -1],
      w: [0, -1],
      W: [0, -1],
      ArrowLeft: [-1, 0],
      a: [-1, 0],
      A: [-1, 0],
      ArrowDown: [0, 1],
      s: [0, 1],
      S: [0, 1],
      ArrowRight: [1, 0],
      d: [1, 0],
      D: [1, 0]
    };

    if (moves[event.key]) {
      event.preventDefault();
      tryMove(moves[event.key][0], moves[event.key][1]);
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      interactWith(nearbyFeature());
    }
  });

  updateCreatorPreview();
  render();
})();
