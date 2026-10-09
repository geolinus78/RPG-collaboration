(function () {
  var world = window.GAME_WORLD;
  var dialogue = window.GAME_DIALOGUE;
  var quests = window.GAME_QUESTS;

  var state = {
    mapId: world.start.mapId,
    x: world.start.x,
    y: world.start.y,
    inventory: [],
    collected: {},
    flags: {},
    message: "Find Riley and look for the Moon Key."
  };

  var mapEl = document.getElementById("map");
  var locationLabel = document.getElementById("locationLabel");
  var messageEl = document.getElementById("message");
  var inventoryEl = document.getElementById("inventory");
  var questListEl = document.getElementById("questList");
  var interactButton = document.getElementById("interactButton");

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
          cell.appendChild(sprite("player", "Player"));
        }

        mapEl.appendChild(cell);
      }
    }
  }

  function renderInventory() {
    inventoryEl.innerHTML = "";

    state.inventory.forEach(function (itemId) {
      var item = document.createElement("li");
      item.textContent = itemId === "moonKey" ? "Moon Key" : itemId;
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
      var questEl = document.createElement("article");
      questEl.className = "quest";

      var title = document.createElement("div");
      title.className = "quest-title";
      title.textContent = quest.title;
      questEl.appendChild(title);

      quest.steps.forEach(function (step) {
        var stepEl = document.createElement("div");
        stepEl.className = "quest-step";
        if (stepComplete(step.condition)) {
          stepEl.classList.add("done");
        }
        stepEl.textContent = step.text;
        questEl.appendChild(stepEl);
      });

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

  document.querySelectorAll("[data-move]").forEach(function (button) {
    button.addEventListener("click", function () {
      var parts = button.dataset.move.split(",").map(Number);
      tryMove(parts[0], parts[1]);
    });
  });

  interactButton.addEventListener("click", function () {
    interactWith(nearbyFeature());
  });

  document.addEventListener("keydown", function (event) {
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

  render();
})();

