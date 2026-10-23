import * as THREE from "../vendor/three.module.js";

const HERO_COLORS = {
  trail: { body: "#2f6b9a", trim: "#7f4f2a", skin: "#f6d58b" },
  guard: { body: "#b54632", trim: "#3b3f46", skin: "#ffd2a6" },
  star: { body: "#315c8f", trim: "#f5d76e", skin: "#e8c7ff" }
};

export class IslandWorld {
  constructor({ canvas, onMessage, onTravel, onStatus, onFinale }) {
    this.canvas = canvas;
    this.onMessage = onMessage;
    this.onTravel = onTravel;
    this.onStatus = onStatus;
    this.onFinale = onFinale;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 320);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this.keys = new Set();
    this.active = false;
    this.heroStyle = "trail";
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);
    this.interactables = [];
    this.animatedObjects = [];
    this.rescuedIslands = new Set();
    this.completedChallenges = new Set();
    this.enemies = [];
    this.platforms = [];
    this.puzzleNodes = [];
    this.puzzleStep = 0;
    this.maxHealth = 5;
    this.health = this.maxHealth;
    this.attackCooldown = 0;
    this.attackVisualTime = 0;
    this.damageCooldown = 0;
    this.hitFlashTime = 0;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.water = null;
    this.waterBasePositions = null;
    this.terrainHeight = () => 0;
    this.currentIsland = null;

    this.addPermanentLights();
    this.bindControls();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    this.renderer.setAnimationLoop(() => this.renderFrame());
  }

  addPermanentLights() {
    this.hemisphereLight = new THREE.HemisphereLight(0xd9f2ff, 0x32422f, 1.7);
    this.scene.add(this.hemisphereLight);

    this.sun = new THREE.DirectionalLight(0xfff2cf, 2.1);
    this.sun.position.set(-28, 38, 18);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -50;
    this.sun.shadow.camera.right = 50;
    this.sun.shadow.camera.top = 50;
    this.sun.shadow.camera.bottom = -50;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 120;
    this.scene.add(this.sun);
  }

  bindControls() {
    window.addEventListener("keydown", (event) => {
      const isTyping = event.target instanceof HTMLElement && event.target.matches("input, textarea, select, [contenteditable='true']");
      if (!this.active || isTyping) {
        return;
      }

      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright", " ", "e", "f"].includes(key)) {
        event.preventDefault();
      }

      if (event.repeat && [" ", "e", "f"].includes(key)) {
        return;
      }

      if (key === " ") {
        this.jump();
        return;
      }

      if (key === "e") {
        this.interact();
        return;
      }

      if (key === "f") {
        this.attack();
        return;
      }

      this.keys.add(key);
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.key.toLowerCase());
    });

    window.addEventListener("blur", () => this.keys.clear());
  }

  setActive(active) {
    this.active = active;
    if (!active) {
      this.keys.clear();
    }
  }

  setHeroStyle(style) {
    this.heroStyle = HERO_COLORS[style] ? style : "trail";
    if (this.player) {
      const colors = HERO_COLORS[this.heroStyle];
      this.player.userData.bodyMaterial.color.set(colors.body);
      this.player.userData.trimMaterial.color.set(colors.trim);
      this.player.userData.skinMaterial.color.set(colors.skin);
    }
  }

  resetAdventure() {
    this.rescuedIslands.clear();
    this.completedChallenges.clear();
    this.health = this.maxHealth;
    this.emitStatus();
  }

  emitStatus() {
    this.onStatus({
      health: this.health,
      maxHealth: this.maxHealth,
      rescued: this.rescuedIslands.size,
      total: 4
    });
  }

  loadIsland(island) {
    this.currentIsland = island;
    this.clearWorld();

    const palette = island.palette;
    this.scene.background = new THREE.Color(palette.sky);
    this.scene.fog = new THREE.FogExp2(palette.fog, island.atmosphere.fogDensity);
    this.sun.intensity = island.atmosphere.sunIntensity;
    this.hemisphereLight.color.set(palette.sky);
    this.hemisphereLight.groundColor.set(palette.lowland);

    this.terrainHeight = createTerrainHeightFunction(island);
    this.buildWater(island);
    this.buildTerrain(island);
    this.buildNature(island);
    this.buildLandmarks(island);
    this.buildCreatures(island);
    this.buildChallenge(island);
    this.buildRescue(island);
    this.buildClouds(island);
    this.buildPlayer(island);

    const playerPosition = this.player.position;
    this.camera.position.set(playerPosition.x + 14, playerPosition.y + 13, playerPosition.z + 18);
    this.camera.lookAt(playerPosition.x, playerPosition.y + 2, playerPosition.z);
    this.health = this.maxHealth;
    this.emitStatus();
    this.onMessage(island.story.arrival);
  }

  clearWorld() {
    this.interactables = [];
    this.animatedObjects = [];
    this.enemies = [];
    this.platforms = [];
    this.puzzleNodes = [];
    this.puzzleStep = 0;
    this.attackCooldown = 0;
    this.damageCooldown = 0;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.water = null;
    this.waterBasePositions = null;
    this.player = null;

    while (this.worldGroup.children.length) {
      const child = this.worldGroup.children[0];
      this.worldGroup.remove(child);
      disposeObject(child);
    }
  }

  buildWater(island) {
    const oceanSize = Math.max(260, island.terrain.size * 2.6);
    const geometry = new THREE.PlaneGeometry(oceanSize, oceanSize, 72, 72);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshPhysicalMaterial({
      color: island.palette.deepWater,
      roughness: 0.16,
      metalness: 0.08,
      transmission: 0.08,
      transparent: true,
      opacity: 0.94,
      clearcoat: 0.7,
      clearcoatRoughness: 0.25
    });

    this.water = new THREE.Mesh(geometry, material);
    this.water.position.y = 0;
    this.water.receiveShadow = true;
    this.waterBasePositions = Float32Array.from(geometry.attributes.position.array);
    this.worldGroup.add(this.water);

    const shallowGlow = new THREE.Mesh(
      new THREE.CircleGeometry(island.terrain.size * 0.7, 96),
      new THREE.MeshBasicMaterial({ color: island.palette.shallowWater, transparent: true, opacity: 0.28, depthWrite: false })
    );
    shallowGlow.rotation.x = -Math.PI / 2;
    shallowGlow.position.y = 0.035;
    this.worldGroup.add(shallowGlow);
  }

  buildTerrain(island) {
    const segments = Math.round(THREE.MathUtils.clamp(island.terrain.size * 1.1, 112, 156));
    const geometry = new THREE.PlaneGeometry(island.terrain.size, island.terrain.size, segments, segments);
    const positions = geometry.attributes.position;
    const colors = [];
    const color = new THREE.Color();

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const worldZ = -positions.getY(index);
      const height = this.terrainHeight(x, worldZ);
      positions.setZ(index, height);

      if (height < 0.35) {
        color.set(island.palette.sand);
      } else if (height < island.terrain.height * 0.48) {
        color.set(island.palette.lowland);
      } else if (height < island.terrain.height * 0.78) {
        color.set(island.palette.highland);
      } else {
        color.set(island.palette.rock);
      }

      const shade = 0.9 + hashNoise(x * 0.8, worldZ * 0.8, island.terrain.seed) * 0.13;
      colors.push(color.r * shade, color.g * shade, color.b * shade);
    }

    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.93,
      metalness: 0
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.castShadow = true;
    terrain.receiveShadow = true;
    this.worldGroup.add(terrain);
  }

  buildNature(island) {
    const random = seededRandom(island.terrain.seed + 700);
    const challengePositions = island.challenge.type === "combat"
      ? island.challenge.enemies.map((enemy) => enemy.position)
      : island.challenge.nodes.map((node) => node.position);
    const occupied = [
      island.playerStart,
      island.rescue.position,
      ...island.landmarks.map((landmark) => landmark.position),
      ...challengePositions
    ];
    const treePoints = findScatterPoints(island.nature.trees, island, this.terrainHeight, random, occupied, 2.6);
    const rockPoints = findScatterPoints(island.nature.rocks, island, this.terrainHeight, random, occupied, 1.7);
    const flowerPoints = findScatterPoints(island.nature.flowers, island, this.terrainHeight, random, occupied, 1.1);
    const crystalPoints = findScatterPoints(island.nature.crystals, island, this.terrainHeight, random, occupied, 2.0);

    this.addTrees(treePoints, island, random);
    this.addRocks(rockPoints, island, random);
    this.addFlowers(flowerPoints, island, random);
    this.addCrystals(crystalPoints, island, random);
  }

  addTrees(points, island, random) {
    if (!points.length) return;

    const trunkGeometry = new THREE.CylinderGeometry(0.18, 0.28, 2.2, 6);
    const crownGeometry = new THREE.ConeGeometry(1.05, 3.2, 7);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#5b3e2b", roughness: 1 });
    const crownMaterial = new THREE.MeshStandardMaterial({ color: island.palette.highland, roughness: 0.96 });
    const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, points.length);
    const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, points.length);
    const dummy = new THREE.Object3D();

    points.forEach((point, index) => {
      const scale = 0.72 + random() * 0.82;
      dummy.position.set(point.x, point.y + scale, point.z);
      dummy.rotation.y = random() * Math.PI * 2;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(index, dummy.matrix);

      dummy.position.y = point.y + 2.6 * scale;
      dummy.rotation.y += 0.4;
      dummy.updateMatrix();
      crowns.setMatrixAt(index, dummy.matrix);
    });

    trunks.castShadow = true;
    trunks.receiveShadow = true;
    crowns.castShadow = true;
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    this.worldGroup.add(trunks, crowns);
  }

  addRocks(points, island, random) {
    if (!points.length) return;

    const geometry = new THREE.DodecahedronGeometry(0.72, 0);
    const material = new THREE.MeshStandardMaterial({ color: island.palette.rock, roughness: 0.95 });
    const rocks = new THREE.InstancedMesh(geometry, material, points.length);
    const dummy = new THREE.Object3D();

    points.forEach((point, index) => {
      const scale = 0.45 + random() * 1.2;
      dummy.position.set(point.x, point.y + scale * 0.38, point.z);
      dummy.rotation.set(random(), random() * Math.PI, random());
      dummy.scale.set(scale, scale * (0.55 + random() * 0.45), scale);
      dummy.updateMatrix();
      rocks.setMatrixAt(index, dummy.matrix);
    });

    rocks.castShadow = true;
    rocks.receiveShadow = true;
    rocks.instanceMatrix.needsUpdate = true;
    this.worldGroup.add(rocks);
  }

  addFlowers(points, island, random) {
    if (!points.length) return;

    const positions = [];
    const colors = [];
    const colorChoices = ["#ffcf67", "#fff5dd", "#e78eb3", island.palette.shallowWater];
    points.forEach((point) => {
      positions.push(point.x, point.y + 0.25, point.z);
      const color = new THREE.Color(colorChoices[Math.floor(random() * colorChoices.length)]);
      colors.push(color.r, color.g, color.b);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 0.36, vertexColors: true, sizeAttenuation: true });
    this.worldGroup.add(new THREE.Points(geometry, material));
  }

  addCrystals(points, island, random) {
    if (!points.length) return;

    const geometry = new THREE.OctahedronGeometry(0.48, 0);
    const material = new THREE.MeshStandardMaterial({
      color: island.palette.shallowWater,
      emissive: island.palette.shallowWater,
      emissiveIntensity: 0.7,
      roughness: 0.18,
      metalness: 0.12
    });
    const crystals = new THREE.InstancedMesh(geometry, material, points.length);
    const dummy = new THREE.Object3D();

    points.forEach((point, index) => {
      const scale = 0.65 + random() * 1.2;
      dummy.position.set(point.x, point.y + 0.5 * scale, point.z);
      dummy.rotation.y = random() * Math.PI;
      dummy.scale.set(scale * 0.58, scale, scale * 0.58);
      dummy.updateMatrix();
      crystals.setMatrixAt(index, dummy.matrix);
    });

    crystals.castShadow = true;
    crystals.instanceMatrix.needsUpdate = true;
    this.worldGroup.add(crystals);
    this.animatedObjects.push({ object: crystals, kind: "pulse", offset: random() * 10 });
  }

  buildLandmarks(island) {
    island.landmarks.forEach((landmark) => {
      const group = createLandmark(landmark);
      const [x, z] = landmark.position;
      group.position.set(x, this.terrainHeight(x, z), z);
      group.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      group.userData.message = `${landmark.name}: ${landmark.message}`;
      group.userData.name = landmark.name;
      group.userData.kind = landmark.kind;
      this.interactables.push(group);
      this.worldGroup.add(group);
    });
  }

  buildCreatures(island) {
    island.creatures.forEach((creature, index) => {
      const group = createCreature(creature);
      const [x, z] = creature.position;
      group.position.set(x, this.terrainHeight(x, z) + 0.55, z);
      group.userData.message = `${creature.name} watches you carefully.`;
      group.userData.name = creature.name;
      group.userData.home = group.position.clone();
      this.interactables.push(group);
      this.animatedObjects.push({ object: group, kind: "creature", offset: index * 1.7 });
      this.worldGroup.add(group);
    });
  }

  buildChallenge(island) {
    const challenge = island.challenge;
    const completed = this.completedChallenges.has(island.id);

    if (challenge.type === "combat") {
      challenge.enemies.forEach((enemy, index) => {
        const group = createEnemy(enemy);
        const [x, z] = enemy.position;
        group.position.set(x, this.terrainHeight(x, z), z);
        group.userData.home = group.position.clone();
        group.userData.index = index;
        group.visible = !completed;
        this.enemies.push(group);
        this.worldGroup.add(group);
      });
      return;
    }

    challenge.nodes.forEach((node, index) => {
      const group = createRuneNode(node);
      const [x, z] = node.position;
      const baseY = this.terrainHeight(x, z);
      const platformHeight = node.height || 0;
      const platformTop = baseY + platformHeight;
      group.position.set(x, baseY, z);
      group.userData.kind = "rune";
      group.userData.index = index;
      group.userData.symbol = node.symbol;
      group.userData.name = node.name;
      group.userData.baseColor = node.color;
      group.userData.interactionPoint = new THREE.Vector3(x, platformTop + 1, z);
      group.userData.message = `${node.name} bears the ${node.symbol} symbol.`;
      setRuneSolved(group, completed);
      this.puzzleNodes.push(group);
      this.interactables.push(group);
      this.worldGroup.add(group);

      if (platformHeight > 0) {
        this.platforms.push({ x, z, radius: 2.7, top: platformTop });
      }
    });
  }

  buildRescue(island) {
    const rescue = island.rescue;
    const rescued = this.rescuedIslands.has(island.id);
    const group = createRescuePerson(rescue, rescued);
    if (!rescued && this.completedChallenges.has(island.id)) {
      group.userData.marker.material.color.set("#ffd75e");
    }
    const [x, z] = rescue.position;
    group.position.set(x, this.terrainHeight(x, z), z);
    group.userData.kind = "rescue";
    group.userData.islandId = island.id;
    group.userData.name = rescue.name;
    group.userData.trappedMessage = rescue.trappedMessage;
    group.userData.rescuedMessage = rescue.rescuedMessage;
    group.userData.challengeLocked = !this.completedChallenges.has(island.id);
    group.userData.message = rescued
      ? `${rescue.name} is safe and ready to help other explorers.`
      : `${rescue.name}: ${rescue.trappedMessage}`;
    group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.interactables.push(group);
    this.worldGroup.add(group);
  }

  buildClouds(island) {
    const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, roughness: 1 });
    const random = seededRandom(island.terrain.seed + 3000);
    const cloudGroup = new THREE.Group();

    for (let cloudIndex = 0; cloudIndex < 8; cloudIndex += 1) {
      const cloud = new THREE.Group();
      const pieces = 3 + Math.floor(random() * 4);
      for (let piece = 0; piece < pieces; piece += 1) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.4 + random(), 10, 8), cloudMaterial);
        puff.position.set(piece * 1.4, random() * 0.8, random() * 1.4);
        puff.scale.y = 0.58;
        cloud.add(puff);
      }
      cloud.position.set((random() - 0.5) * 95, 20 + random() * 12, (random() - 0.5) * 95);
      cloudGroup.add(cloud);
    }

    this.worldGroup.add(cloudGroup);
    this.animatedObjects.push({ object: cloudGroup, kind: "clouds", speed: island.atmosphere.windSpeed });
  }

  buildPlayer(island) {
    this.player = createPlayer(this.heroStyle);
    const [x, z] = island.playerStart;
    this.player.position.set(x, this.terrainHeight(x, z) + 0.05, z);
    this.player.userData.start = this.player.position.clone();
    this.worldGroup.add(this.player);
  }

  updatePlayer(delta) {
    if (!this.active || !this.player) return;

    const move = new THREE.Vector3();
    if (this.keys.has("w") || this.keys.has("arrowup")) move.z -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) move.z += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) move.x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) move.x += 1;

    if (move.lengthSq()) {
      move.normalize();
      const speed = 11;
      const nextX = this.player.position.x + move.x * speed * delta;
      const nextZ = this.player.position.z + move.z * speed * delta;
      const nextHeight = this.terrainHeight(nextX, nextZ);

      if (nextHeight > 0.12) {
        this.player.position.x = nextX;
        this.player.position.z = nextZ;
        this.player.rotation.y = Math.atan2(move.x, move.z);
        this.player.userData.walkTime += delta * 10;
        this.player.userData.body.position.y = 1.35 + Math.abs(Math.sin(this.player.userData.walkTime)) * 0.12;
      }
    } else {
      this.player.userData.body.position.y = THREE.MathUtils.lerp(this.player.userData.body.position.y, 1.35, 0.24);
    }

    const support = this.getSupportHeight(
      this.player.position.x,
      this.player.position.z,
      this.player.position.y + 0.45
    );

    if (this.grounded) {
      if (this.player.position.y > support + 0.6) {
        this.grounded = false;
        this.verticalVelocity = 0;
      } else {
        this.player.position.y = THREE.MathUtils.lerp(this.player.position.y, support + 0.05, 0.35);
      }
    } else {
      const previousY = this.player.position.y;
      this.verticalVelocity -= 26 * delta;
      this.player.position.y += this.verticalVelocity * delta;
      const landingHeight = this.getSupportHeight(
        this.player.position.x,
        this.player.position.z,
        previousY + 0.15
      );

      if (this.verticalVelocity <= 0 && this.player.position.y <= landingHeight + 0.05) {
        this.player.position.y = landingHeight + 0.05;
        this.verticalVelocity = 0;
        this.grounded = true;
      }
    }
  }

  getSupportHeight(x, z, maxY) {
    let height = this.terrainHeight(x, z);
    this.platforms.forEach((platform) => {
      const onPlatform = Math.hypot(x - platform.x, z - platform.z) <= platform.radius;
      if (onPlatform && platform.top <= maxY && platform.top > height) {
        height = platform.top;
      }
    });
    return height;
  }

  jump() {
    if (!this.player || !this.grounded) return;
    this.grounded = false;
    this.verticalVelocity = 11.5;
  }

  updateCamera(delta) {
    if (!this.player) return;
    const targetPosition = new THREE.Vector3(
      this.player.position.x + 14,
      this.player.position.y + 13,
      this.player.position.z + 18
    );
    const smoothing = 1 - Math.pow(0.001, delta);
    this.camera.position.lerp(targetPosition, smoothing);
    this.camera.lookAt(this.player.position.x, this.player.position.y + 2.1, this.player.position.z);
  }

  updateWater(time) {
    if (!this.water || !this.waterBasePositions) return;
    const positions = this.water.geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const baseIndex = index * 3;
      const x = this.waterBasePositions[baseIndex];
      const z = this.waterBasePositions[baseIndex + 2];
      const wave = Math.sin(x * 0.13 + time * 0.9) * 0.12 + Math.cos(z * 0.11 - time * 0.7) * 0.09;
      positions.setY(index, wave);
    }
    positions.needsUpdate = true;
    this.water.geometry.computeVertexNormals();
  }

  updateAnimatedObjects(time, delta) {
    this.animatedObjects.forEach((entry) => {
      if (entry.kind === "clouds") {
        entry.object.rotation.y += delta * 0.006 * entry.speed;
      } else if (entry.kind === "creature") {
        entry.object.position.y = entry.object.userData.home.y + Math.sin(time * 2 + entry.offset) * 0.12;
        entry.object.rotation.y += delta * 0.22;
      } else if (entry.kind === "pulse") {
        entry.object.material.emissiveIntensity = 0.55 + Math.sin(time * 2 + entry.offset) * 0.22;
      } else if (entry.kind === "victory") {
        entry.object.rotation.y += delta * 0.9;
        entry.object.scale.setScalar(1 + Math.sin(time * 3) * 0.05);
      }
    });
  }

  updateEnemies(time, delta) {
    if (!this.active || !this.player || this.completedChallenges.has(this.currentIsland.id)) return;

    this.enemies.forEach((enemy) => {
      if (!enemy.userData.active) return;
      const toPlayer = new THREE.Vector3().subVectors(this.player.position, enemy.position);
      toPlayer.y = 0;
      const distance = toPlayer.length();

      enemy.userData.body.position.y = 1.25 + Math.sin(time * 5 + enemy.userData.index) * 0.08;
      if (distance < 18 && distance > 2.1) {
        toPlayer.normalize();
        const nextX = enemy.position.x + toPlayer.x * 3.4 * delta;
        const nextZ = enemy.position.z + toPlayer.z * 3.4 * delta;
        const nextHeight = this.terrainHeight(nextX, nextZ);
        if (nextHeight > 0.25) {
          enemy.position.set(nextX, nextHeight, nextZ);
          enemy.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
        }
      } else if (distance <= 2.1 && this.damageCooldown <= 0) {
        this.damagePlayer(enemy.userData.name);
      }
    });
  }

  updateCombatEffects(delta) {
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.damageCooldown = Math.max(0, this.damageCooldown - delta);
    this.attackVisualTime = Math.max(0, this.attackVisualTime - delta);
    this.hitFlashTime = Math.max(0, this.hitFlashTime - delta);

    if (this.player) {
      this.player.userData.attackRing.visible = this.attackVisualTime > 0;
      this.player.userData.bodyMaterial.emissive.set(this.hitFlashTime > 0 ? "#8b1717" : "#000000");
      this.player.userData.bodyMaterial.emissiveIntensity = this.hitFlashTime > 0 ? 0.9 : 0;
    }
  }

  attack() {
    if (!this.player || this.attackCooldown > 0) return;
    this.attackCooldown = 0.45;
    this.attackVisualTime = 0.18;
    let hitCount = 0;

    this.enemies.forEach((enemy) => {
      if (!enemy.userData.active || enemy.position.distanceTo(this.player.position) > 4.2) return;
      hitCount += 1;
      enemy.userData.health -= 1;
      updateEnemyHealth(enemy);

      const knockback = new THREE.Vector3().subVectors(enemy.position, this.player.position).setY(0);
      if (knockback.lengthSq()) {
        knockback.normalize().multiplyScalar(1.4);
        enemy.position.add(knockback);
      }

      if (enemy.userData.health <= 0) {
        enemy.userData.active = false;
        enemy.visible = false;
        this.onMessage(`${enemy.userData.name} is defeated!`);
      }
    });

    if (hitCount && this.enemies.every((enemy) => !enemy.userData.active)) {
      this.completeChallenge();
    }
  }

  damagePlayer(enemyName) {
    this.damageCooldown = 1;
    this.hitFlashTime = 0.28;
    this.health -= 1;
    this.emitStatus();

    if (this.health > 0) {
      this.onMessage(`${enemyName} hits you! Press F nearby to fight back.`);
      return;
    }

    this.health = this.maxHealth;
    this.player.position.copy(this.player.userData.start);
    this.verticalVelocity = 0;
    this.grounded = true;
    this.enemies.forEach((enemy) => {
      enemy.userData.health = enemy.userData.maxHealth;
      enemy.userData.active = true;
      enemy.position.copy(enemy.userData.home);
      enemy.visible = true;
      updateEnemyHealth(enemy);
    });
    this.emitStatus();
    this.onMessage("The guards knocked you back to shore. You recovered, but they regrouped!");
  }

  interact() {
    if (!this.player) return;
    let nearest = null;
    let nearestDistance = Infinity;

    this.interactables.forEach((object) => {
      const target = object.userData.interactionPoint || object.position;
      const distance = target.distanceTo(this.player.position);
      if (distance < nearestDistance) {
        nearest = object;
        nearestDistance = distance;
      }
    });

    const interactionRange = nearest?.userData.kind === "rune" ? 3.3 : 6;
    if (nearest && nearestDistance < interactionRange) {
      if (nearest.userData.kind === "boat") {
        this.keys.clear();
        this.onTravel();
      } else if (nearest.userData.kind === "rune") {
        this.activateRune(nearest);
      } else if (nearest.userData.kind === "rescue") {
        this.rescuePerson(nearest);
      } else {
        this.onMessage(nearest.userData.message);
      }
    } else {
      this.onMessage(this.currentIsland.story.goal);
    }
  }

  rescuePerson(person) {
    if (this.rescuedIslands.has(person.userData.islandId)) {
      this.onMessage(`${person.userData.name} is already safe.`);
      return;
    }

    if (!this.completedChallenges.has(person.userData.islandId)) {
      this.onMessage(`The cage is still sealed. ${this.currentIsland.challenge.hint}`);
      return;
    }

    this.rescuedIslands.add(person.userData.islandId);
    person.userData.cage.visible = false;
    person.userData.marker.material.color.set("#77e08b");
    person.userData.message = `${person.userData.name} is safe and ready to help other explorers.`;
    this.emitStatus();
    this.onMessage(person.userData.rescuedMessage);

    if (this.rescuedIslands.size === 4) {
      this.activateFinale();
    }
  }

  activateRune(rune) {
    if (this.completedChallenges.has(this.currentIsland.id)) {
      this.onMessage(`${rune.userData.name} shines steadily. This puzzle is complete.`);
      return;
    }

    const sequence = this.currentIsland.challenge.sequence;
    const expectedSymbol = sequence[this.puzzleStep];
    if (rune.userData.symbol !== expectedSymbol) {
      this.puzzleStep = 0;
      this.puzzleNodes.forEach((node) => setRuneSolved(node, false));
      this.onMessage(`The runes go dark. Start again with the ${sequence[0]} symbol.`);
      return;
    }

    setRuneSolved(rune, true);
    this.puzzleStep += 1;
    if (this.puzzleStep === sequence.length) {
      this.completeChallenge();
      return;
    }

    this.onMessage(`${rune.userData.name} lights up. Now find the ${sequence[this.puzzleStep]} symbol.`);
  }

  completeChallenge() {
    if (this.completedChallenges.has(this.currentIsland.id)) return;
    this.completedChallenges.add(this.currentIsland.id);
    this.puzzleNodes.forEach((node) => setRuneSolved(node, true));
    const rescue = this.interactables.find((object) => object.userData.kind === "rescue");
    if (rescue) {
      rescue.userData.challengeLocked = false;
      rescue.userData.marker.material.color.set("#ffd75e");
    }
    this.onMessage(this.currentIsland.challenge.completeMessage);
  }

  activateFinale() {
    const beacon = createVictoryBeacon();
    beacon.position.copy(this.player.position);
    beacon.position.y = this.terrainHeight(beacon.position.x, beacon.position.z) + 0.2;
    this.worldGroup.add(beacon);
    this.animatedObjects.push({ object: beacon, kind: "victory" });
    this.onFinale();
  }

  resize() {
    const parent = this.canvas.parentElement;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  renderFrame() {
    this.timer.update();
    const delta = Math.min(this.timer.getDelta(), 0.05);
    const time = this.timer.getElapsed();
    this.updatePlayer(delta);
    this.updateEnemies(time, delta);
    this.updateCombatEffects(delta);
    this.updateCamera(delta);
    this.updateWater(time);
    this.updateAnimatedObjects(time, delta);
    this.renderer.render(this.scene, this.camera);
  }
}

function createTerrainHeightFunction(island) {
  const { seed, size, height, roughness, coastWobble } = island.terrain;
  const half = size / 2;

  return (x, z) => {
    const normalizedX = x / (half * 0.94);
    const normalizedZ = z / (half * 0.78);
    const angle = Math.atan2(normalizedZ, normalizedX);
    const radius = Math.sqrt(normalizedX * normalizedX + normalizedZ * normalizedZ);
    const wobble =
      Math.sin(angle * 3 + seed * 0.13) * 0.1 * coastWobble +
      Math.cos(angle * 5 - seed * 0.08) * 0.055 * coastWobble +
      Math.sin(angle * 7 + 1.7) * 0.025 * coastWobble;
    const land = THREE.MathUtils.clamp(1 - radius - wobble, 0, 1);
    const broadNoise =
      Math.sin((x + seed) * 0.17) * Math.cos((z - seed) * 0.15) * 0.68 +
      Math.sin((x - z) * 0.31 + seed) * 0.26 +
      hashNoise(x * 0.42, z * 0.42, seed) * 0.32;

    if (land <= 0) {
      return -1.4 - Math.min(radius - 1, 1) * 0.8;
    }

    return -0.52 + Math.pow(land, 0.58) * height + broadNoise * roughness * 1.7 * land;
  };
}

function findScatterPoints(count, island, heightAt, random, occupied, spacing) {
  const points = [];
  const half = island.terrain.size * 0.47;
  let attempts = 0;

  while (points.length < count && attempts < count * 30 + 100) {
    attempts += 1;
    const x = (random() - 0.5) * half * 2;
    const z = (random() - 0.5) * half * 2;
    const y = heightAt(x, z);
    const blocked = occupied.some(([occupiedX, occupiedZ]) => Math.hypot(x - occupiedX, z - occupiedZ) < spacing + 2.4);
    const crowded = points.some((point) => Math.hypot(x - point.x, z - point.z) < spacing);

    if (y > 0.65 && !blocked && !crowded) {
      points.push({ x, y, z });
    }
  }

  return points;
}

function createLandmark(landmark) {
  const group = new THREE.Group();
  const color = landmark.color || "#c7b48c";
  const stone = new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
  const dark = new THREE.MeshStandardMaterial({ color: "#4f473f", roughness: 0.9 });
  const glow = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, roughness: 0.25 });

  if (landmark.kind === "tower") {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 6.5, 10), stone);
    base.position.y = 3.25;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 2.4, 10), dark);
    roof.position.y = 7.7;
    group.add(base, roof);
  } else if (landmark.kind === "ruins") {
    for (let column = 0; column < 4; column += 1) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3 + (column % 2), 0.8), stone);
      pillar.position.set((column - 1.5) * 1.7, pillar.geometry.parameters.height / 2, column % 2 ? -1 : 1);
      pillar.rotation.z = (column - 1.5) * 0.04;
      group.add(pillar);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.65, 1), stone);
    lintel.position.y = 4.1;
    lintel.rotation.z = 0.12;
    group.add(lintel);
  } else if (landmark.kind === "crystal") {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(2.3, 0), glow);
    crystal.scale.set(0.75, 1.8, 0.75);
    crystal.position.y = 3.6;
    group.add(crystal);
  } else if (landmark.kind === "gate") {
    const left = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6, 1.6), stone);
    const right = left.clone();
    left.position.set(-2.4, 3, 0);
    right.position.set(2.4, 3, 0);
    const top = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 1.8), stone);
    top.position.y = 6.2;
    group.add(left, right, top);
  } else if (landmark.kind === "boat") {
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2.4, 8, 10, 1, false, 0, Math.PI), dark);
    hull.rotation.z = Math.PI / 2;
    hull.rotation.x = Math.PI / 2;
    hull.position.y = 1.15;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.18, 6, 24, Math.PI), stone);
    rim.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    rim.scale.x = 1.8;
    rim.position.y = 1.55;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 6.5, 8), dark);
    mast.position.y = 4.1;
    const sail = new THREE.Mesh(new THREE.ConeGeometry(2.3, 4.4, 3), stone);
    sail.position.set(1.35, 4.3, 0);
    sail.rotation.z = -Math.PI / 2;
    sail.scale.z = 0.08;
    group.add(hull, rim, mast, sail);
  } else if (landmark.kind === "shipwreck") {
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 2.2, 7, 7, 1, false, 0, Math.PI), dark);
    hull.rotation.z = Math.PI / 2;
    hull.rotation.x = Math.PI / 2;
    hull.position.y = 1.2;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 6, 7), dark);
    mast.position.set(-1, 3, 0);
    mast.rotation.z = -0.3;
    group.add(hull, mast);
  } else if (landmark.kind === "village") {
    for (let houseIndex = 0; houseIndex < 3; houseIndex += 1) {
      const house = new THREE.Group();
      const walls = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.4), stone);
      walls.position.y = 1.1;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.6, 4), dark);
      roof.position.y = 3;
      roof.rotation.y = Math.PI / 4;
      house.position.set((houseIndex - 1) * 3.2, 0, houseIndex % 2 ? 1.6 : -0.6);
      house.add(walls, roof);
      group.add(house);
    }
  } else {
    const tent = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.8, 4), stone);
    tent.position.y = 1.4;
    tent.rotation.y = Math.PI / 4;
    const fire = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), glow);
    fire.position.set(2.7, 0.5, 0);
    group.add(tent, fire);
  }

  const marker = new THREE.Mesh(
    new THREE.TorusGeometry(3.5, 0.08, 6, 48),
    new THREE.MeshBasicMaterial({ color: 0xffef9c, transparent: true, opacity: 0.72 })
  );
  marker.rotation.x = Math.PI / 2;
  marker.position.y = 0.12;
  group.add(marker);
  return group;
}

function createCreature(creature) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: creature.color || "#f1d379", roughness: 0.78 });
  const dark = new THREE.MeshStandardMaterial({ color: "#273138", roughness: 0.9 });

  if (creature.kind === "bird") {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), material);
    body.scale.set(1.2, 0.7, 0.8);
    const leftWing = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.8, 3), material);
    const rightWing = leftWing.clone();
    leftWing.rotation.z = Math.PI / 2;
    rightWing.rotation.z = -Math.PI / 2;
    leftWing.position.x = -1;
    rightWing.position.x = 1;
    group.add(body, leftWing, rightWing);
  } else if (creature.kind === "spirit") {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 14, 10),
      new THREE.MeshStandardMaterial({ color: creature.color, emissive: creature.color, emissiveIntensity: 1.1, transparent: true, opacity: 0.82 })
    );
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.8, 10), body.material);
    tail.position.y = -1.1;
    group.add(body, tail);
  } else {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), material);
    body.scale.set(1.25, 0.72, 0.78);
    body.position.y = 0.6;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), material);
    head.position.set(0, 0.85, -0.9);
    const ears = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 5), dark);
    const earsTwo = ears.clone();
    ears.position.set(-0.24, 1.35, -0.92);
    earsTwo.position.set(0.24, 1.35, -0.92);
    group.add(body, head, ears, earsTwo);
  }

  group.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  return group;
}

function createEnemy(enemy) {
  const group = new THREE.Group();
  const armor = new THREE.MeshStandardMaterial({ color: enemy.color, roughness: 0.6, metalness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: "#272c32", roughness: 0.82 });
  const glow = new THREE.MeshStandardMaterial({
    color: enemy.glowColor || "#ff7a55",
    emissive: enemy.glowColor || "#ff7a55",
    emissiveIntensity: 1.1,
    roughness: 0.25
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 1.25, 5, 10), armor);
  body.position.y = 1.25;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.58, 12, 9), dark);
  head.position.y = 2.65;
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.12), glow);
  eye.position.set(0, 2.7, -0.55);
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.18, 8), armor);
  shield.rotation.x = Math.PI / 2;
  shield.position.set(-0.95, 1.35, -0.15);
  group.add(body, head, eye, shield);

  const healthPips = [];
  for (let index = 0; index < enemy.health; index += 1) {
    const pip = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.18, 0.18),
      new THREE.MeshBasicMaterial({ color: "#ff5b4d" })
    );
    pip.position.set((index - (enemy.health - 1) / 2) * 0.5, 3.65, 0);
    healthPips.push(pip);
    group.add(pip);
  }

  group.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  group.userData = {
    name: enemy.name,
    body,
    health: enemy.health,
    maxHealth: enemy.health,
    healthPips,
    active: true
  };
  return group;
}

function updateEnemyHealth(enemy) {
  enemy.userData.healthPips.forEach((pip, index) => {
    pip.visible = index < enemy.userData.health;
  });
}

function createRuneNode(node) {
  const group = new THREE.Group();
  const platformHeight = node.height || 0;
  const stone = new THREE.MeshStandardMaterial({ color: "#5d6670", roughness: 0.88 });
  const runeMaterial = new THREE.MeshStandardMaterial({
    color: node.color,
    emissive: node.color,
    emissiveIntensity: 0.7,
    roughness: 0.25
  });

  if (platformHeight > 0) {
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(2.7, 3.15, platformHeight + 0.35, 10),
      stone
    );
    platform.position.y = platformHeight / 2 - 0.12;
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);
  }

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.05, 0.75, 8), stone);
  pedestal.position.y = platformHeight + 0.38;
  const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), runeMaterial);
  rune.position.y = platformHeight + 1.35;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.08, 6, 36),
    new THREE.MeshBasicMaterial({ color: node.color, transparent: true, opacity: 0.8 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = platformHeight + 0.08;
  group.add(pedestal, rune, ring);
  group.userData.rune = rune;
  group.userData.ring = ring;
  return group;
}

function setRuneSolved(group, solved) {
  const color = solved ? "#69e68c" : group.userData.baseColor;
  group.userData.rune.material.color.set(color);
  group.userData.rune.material.emissive.set(color);
  group.userData.ring.material.color.set(color);
  group.userData.solved = solved;
}

function createVictoryBeacon() {
  const group = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({
    color: "#ffd75e",
    emissive: "#f5a623",
    emissiveIntensity: 1.25,
    roughness: 0.22,
    metalness: 0.3
  });
  const blue = new THREE.MeshStandardMaterial({
    color: "#74d9ff",
    emissive: "#2f93c4",
    emissiveIntensity: 1,
    transparent: true,
    opacity: 0.82
  });

  const compass = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.28, 10, 64), gold);
  compass.position.y = 4.8;
  const north = new THREE.Mesh(new THREE.ConeGeometry(0.65, 3.8, 4), gold);
  north.position.y = 4.8;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.8, 12, 16, 1, true), blue);
  beam.position.y = 6;
  group.add(compass, north, beam);
  return group;
}

function createRescuePerson(rescue, rescued) {
  const group = new THREE.Group();
  const cage = new THREE.Group();
  const clothing = new THREE.MeshStandardMaterial({ color: rescue.color, roughness: 0.76 });
  const skin = new THREE.MeshStandardMaterial({ color: "#f2c894", roughness: 0.82 });
  const hair = new THREE.MeshStandardMaterial({ color: "#493426", roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: "#535d63", roughness: 0.38, metalness: 0.72 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.1, 5, 10), clothing);
  body.position.y = 1.35;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 10), skin);
  head.position.y = 2.55;
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairCap.position.y = 2.72;
  group.add(body, head, hairCap);

  const barGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4.4, 8);
  [-1.45, -0.5, 0.5, 1.45].forEach((x) => {
    [-1.15, 1.15].forEach((z) => {
      const bar = new THREE.Mesh(barGeometry, metal);
      bar.position.set(x, 2.2, z);
      cage.add(bar);
    });
  });
  [-1.15, 1.15].forEach((z) => {
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.16, 0.16), metal);
    topRail.position.set(0, 4.32, z);
    cage.add(topRail);
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.16, 2.6), metal);
  roof.position.y = 4.38;
  cage.add(roof);
  cage.visible = !rescued;
  group.add(cage);

  const marker = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.1, 6, 48),
    new THREE.MeshBasicMaterial({ color: rescued ? "#77e08b" : "#ff6b55", transparent: true, opacity: 0.9 })
  );
  marker.rotation.x = Math.PI / 2;
  marker.position.y = 0.12;
  group.add(marker);
  group.userData.cage = cage;
  group.userData.marker = marker;
  return group;
}

function createPlayer(style) {
  const colors = HERO_COLORS[style] || HERO_COLORS.trail;
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.72 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: colors.trim, roughness: 0.8 });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: colors.skin, roughness: 0.84 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.15, 5, 10), bodyMaterial);
  body.position.y = 1.35;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 10), skinMaterial);
  head.position.y = 2.55;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.8, 10), trimMaterial);
  hat.position.y = 3.15;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.38), trimMaterial);
  pack.position.set(0, 1.55, 0.55);
  const attackRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.7, 0.15, 6, 36),
    new THREE.MeshBasicMaterial({ color: "#fff2a6", transparent: true, opacity: 0.9 })
  );
  attackRing.rotation.x = Math.PI / 2;
  attackRing.position.y = 1;
  attackRing.visible = false;
  group.add(body, head, hat, pack, attackRing);
  group.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  group.userData = { body, bodyMaterial, trimMaterial, skinMaterial, attackRing, walkTime: 0 };
  return group;
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function hashNoise(x, z, seed) {
  const value = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}
