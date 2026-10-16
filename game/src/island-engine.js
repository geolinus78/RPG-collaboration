import * as THREE from "../vendor/three.module.js";

const HERO_COLORS = {
  trail: { body: "#2f6b9a", trim: "#7f4f2a", skin: "#f6d58b" },
  guard: { body: "#b54632", trim: "#3b3f46", skin: "#ffd2a6" },
  star: { body: "#315c8f", trim: "#f5d76e", skin: "#e8c7ff" }
};

export class IslandWorld {
  constructor({ canvas, onMessage }) {
    this.canvas = canvas;
    this.onMessage = onMessage;
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
      if (!this.active || event.target.matches("input, button")) {
        return;
      }

      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright", " ", "e"].includes(key)) {
        event.preventDefault();
      }

      if (key === " " || key === "e") {
        this.interact();
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
    this.buildClouds(island);
    this.buildPlayer(island);

    const playerPosition = this.player.position;
    this.camera.position.set(playerPosition.x + 14, playerPosition.y + 13, playerPosition.z + 18);
    this.camera.lookAt(playerPosition.x, playerPosition.y + 2, playerPosition.z);
    this.onMessage(island.story.arrival);
  }

  clearWorld() {
    this.interactables = [];
    this.animatedObjects = [];
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
    const geometry = new THREE.PlaneGeometry(180, 180, 60, 60);
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
    const segments = 88;
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
    const occupied = island.landmarks.map((landmark) => landmark.position);
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
    this.worldGroup.add(this.player);
  }

  updatePlayer(delta) {
    if (!this.active || !this.player) return;

    const move = new THREE.Vector3();
    if (this.keys.has("w") || this.keys.has("arrowup")) move.z -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) move.z += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) move.x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) move.x += 1;

    if (!move.lengthSq()) return;

    move.normalize();
    const speed = 7.2;
    const nextX = this.player.position.x + move.x * speed * delta;
    const nextZ = this.player.position.z + move.z * speed * delta;
    const nextHeight = this.terrainHeight(nextX, nextZ);

    if (nextHeight > 0.12) {
      this.player.position.x = nextX;
      this.player.position.z = nextZ;
      this.player.position.y = THREE.MathUtils.lerp(this.player.position.y, nextHeight + 0.05, 0.28);
      this.player.rotation.y = Math.atan2(move.x, move.z);
      this.player.userData.walkTime += delta * 10;
      this.player.userData.body.position.y = 1.35 + Math.abs(Math.sin(this.player.userData.walkTime)) * 0.12;
    } else {
      this.onMessage("The water is too deep here. Follow the shoreline.");
    }
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
      }
    });
  }

  interact() {
    if (!this.player) return;
    let nearest = null;
    let nearestDistance = Infinity;

    this.interactables.forEach((object) => {
      const distance = object.position.distanceTo(this.player.position);
      if (distance < nearestDistance) {
        nearest = object;
        nearestDistance = distance;
      }
    });

    if (nearest && nearestDistance < 6) {
      this.onMessage(nearest.userData.message);
    } else {
      this.onMessage(this.currentIsland.story.goal);
    }
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
  group.add(body, head, hat, pack);
  group.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  group.userData = { body, bodyMaterial, trimMaterial, skinMaterial, walkTime: 0 };
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
