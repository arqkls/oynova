import * as THREE from 'three';

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, ...options });
}

function addBox(parent, w, h, d, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function addWindow(parent, x, y, z, w, h, frameMat, glassMat) {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.32, h + 0.32, 0.16), frameMat);
  frame.position.set(x, y, z);
  const pane = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.2), glassMat);
  pane.position.set(x, y, z + 0.07);
  parent.add(frame, pane);
}

function createCastle() {
  const group = new THREE.Group();
  // Old storm-stone castle: cold grey blocks, slate roofs, iron gate.
  const pink = mat(0x8f949c, { roughness: 0.95 });
  const pinkDeep = mat(0x767c85, { roughness: 0.95 });
  const cream = mat(0xa9a79e, { roughness: 0.92 });
  const lavender = mat(0x4a5059, { roughness: 0.88 });
  const mint = mat(0x555c66, { roughness: 0.88 });
  const gold = mat(0xc9a24a, { metalness: 0.5, roughness: 0.4 });
  const glass = mat(0x9fb9c4, { emissive: 0x274049, emissiveIntensity: 0.35, roughness: 0.4 });
  const doorMat = mat(0x3a3d42, { roughness: 0.55, metalness: 0.35 });

  const apron = new THREE.Mesh(new THREE.CircleGeometry(9.2, 48), mat(0xa9a69d));
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = 0.02;
  group.add(apron);

  addBox(group, 11, 7, 8, 0, 3.5, 0, pink);
  // Horizontal shadow seams so the flat wall reads as stacked stone blocks.
  const seam = mat(0x6e737b, { roughness: 0.95 });
  [1.1, 2.2, 3.3, 4.5, 5.7, 6.6].forEach((y) => {
    addBox(group, 11.02, 0.07, 0.06, 0, y, 4.0, seam);
  });
  addBox(group, 11.5, 0.6, 8.5, 0, 7.05, 0, cream);
  for (let i = -3; i <= 3; i += 1) {
    addBox(group, 0.85, 0.8, 0.6, i * 1.45, 7.7, 3.8, cream);
  }

  const towers = [[-4.6, -3.4], [4.6, -3.4], [-4.6, 3.4], [4.6, 3.4]];
  towers.forEach(([x, z], i) => {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.8, 10, 24), i < 2 ? pinkDeep : pink);
    body.position.set(x, 5, z);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.15, 3.6, 24), i % 2 ? lavender : mint);
    roof.position.set(x, 11.8, z);
    group.add(body, roof);
  });

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.5, 11, 28), pinkDeep);
  tower.position.set(0, 5.5, -1.4);
  const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 4.6, 28), mint);
  towerRoof.position.set(0, 13.2, -1.4);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), cream);
  pole.position.set(0, 16.6, -1.4);
  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(1.5, -0.45);
  flagShape.lineTo(0, -0.9);
  flagShape.lineTo(0, 0);
  const flag = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), new THREE.MeshStandardMaterial({
    color: 0x8e2a32,
    side: THREE.DoubleSide,
    roughness: 0.9,
  }));
  flag.position.set(0, 17.4, -1.4);
  group.add(tower, towerRoof, pole, flag);

  addWindow(group, -2.9, 4.5, 4.03, 1.0, 1.5, cream, glass);
  addWindow(group, 2.9, 4.5, 4.03, 1.0, 1.5, cream, glass);
  addWindow(group, -4.6, 7.6, 5.12, 0.65, 1.1, cream, glass);
  addWindow(group, 4.6, 7.6, 5.12, 0.65, 1.1, cream, glass);
  addWindow(group, 0, 9.2, 0.98, 0.7, 1.2, cream, glass);

  [-1.7, 1.7].forEach((x) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.6, 0.55), cream);
    pillar.position.set(x, 1.3, 4.08);
    group.add(pillar);
  });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.26, 12, 28, Math.PI), cream);
  arch.position.set(0, 2.6, 4.08);
  group.add(arch);

  const doorShape = new THREE.Shape();
  doorShape.moveTo(-1.45, 0);
  doorShape.lineTo(-1.45, 2.55);
  doorShape.absarc(0, 2.55, 1.45, Math.PI, 0, true);
  doorShape.lineTo(1.45, 0);
  doorShape.lineTo(-1.45, 0);
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-1.45, 0, 3.9);
  const door = new THREE.Mesh(new THREE.ExtrudeGeometry(doorShape, { depth: 0.22, bevelEnabled: false }), doorMat);
  door.position.set(1.45, 0, 0);
  doorPivot.add(door);

  // Iron bands, rivets and a heavy ring: the door is a gate, not a fairy door.
  const iron = mat(0x24262a, { metalness: 0.55, roughness: 0.5 });
  [0.7, 1.5, 2.3].forEach((y) => {
    addBox(doorPivot, 2.9, 0.14, 0.07, 1.45, y, 0.25, iron);
    [-1.05, -0.55, 0.55, 1.05].forEach((x) => {
      const rivet = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), iron);
      rivet.position.set(1.45 + x, y, 0.31);
      rivet.scale.z = 0.5;
      doorPivot.add(rivet);
    });
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.028, 8, 24), iron);
  ring.position.set(1.45, 1.15, 0.3);
  doorPivot.add(ring);
  group.add(doorPivot);

  const doorTarget = new THREE.Object3D();
  doorTarget.position.set(0, 0, 5.6);
  group.add(doorTarget);

  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), gold);
  gem.position.set(0, 4.65, 4.2);
  group.add(gem);

  [-4.6, 4.6].forEach((x) => {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.7), new THREE.MeshStandardMaterial({
      color: 0x7a2e35,
      side: THREE.DoubleSide,
      roughness: 0.9,
    }));
    banner.position.set(x, 8.4, 5.13);
    group.add(banner);
  });

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return { group, doorPivot, doorTarget };
}

function createTree(blossom) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 2.3, 10), mat(0x9a6b4a));
  trunk.position.y = 1.15;
  const leafColor = blossom ? 0xffb3d9 : 0x69c96a;
  const leafDark = blossom ? 0xff9bcc : 0x55b95c;
  const blobs = [
    [0, 2.5, 0, 1.15, leafColor],
    [0.8, 2.1, 0.1, 0.8, leafDark],
    [-0.7, 2.15, -0.15, 0.75, leafColor],
    [0.05, 3.2, -0.05, 0.72, leafDark],
  ];
  group.add(trunk);
  blobs.forEach(([x, y, z, r, color]) => {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(color, { flatShading: true }));
    leaf.position.set(x, y, z);
    group.add(leaf);
  });
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

function createFlower() {
  const colors = [0xff8ec7, 0xffe066, 0xb79ce8, 0xffffff, 0xff9e7a, 0x7fd7c8];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const group = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.4, 6), mat(0x4fa84f));
  stem.position.y = 0.2;
  const petals = new THREE.Group();
  petals.position.y = 0.42;
  const petalMat = mat(color, { roughness: 0.7 });
  for (let i = 0; i < 5; i += 1) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), petalMat);
    const angle = (i / 5) * Math.PI * 2;
    petal.position.set(Math.cos(angle) * 0.09, 0, Math.sin(angle) * 0.09);
    petal.scale.set(1, 0.55, 1);
    petals.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xffd24a));
  petals.add(center);
  group.add(stem, petals);
  group.scale.setScalar(0.8 + Math.random() * 0.6);
  return group;
}

function createMushroom() {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.36, 10), mat(0xfff1dd));
  stem.position.y = 0.18;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf2637e));
  cap.position.y = 0.34;
  cap.scale.y = 0.8;
  group.add(stem, cap);
  for (let i = 0; i < 4; i += 1) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0xffffff));
    const angle = (i / 4) * Math.PI * 2 + 0.4;
    dot.position.set(Math.cos(angle) * 0.19, 0.45, Math.sin(angle) * 0.19);
    group.add(dot);
  }
  group.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  return group;
}

function createRock() {
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), mat(0xb9b4c9, { flatShading: true }));
  rock.scale.set(1 + Math.random() * 0.5, 0.6, 1 + Math.random() * 0.4);
  rock.position.y = 0.15;
  rock.rotation.y = Math.random() * Math.PI;
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

function createPond() {
  const group = new THREE.Group();
  const water = new THREE.Mesh(new THREE.CircleGeometry(4.2, 40), new THREE.MeshStandardMaterial({
    color: 0x7fd7f2,
    roughness: 0.2,
    metalness: 0.1,
  }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.04;
  const inner = new THREE.Mesh(new THREE.CircleGeometry(3.5, 40), new THREE.MeshStandardMaterial({
    color: 0xa8e9fb,
    roughness: 0.15,
    transparent: true,
    opacity: 0.75,
  }));
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.06;
  group.add(water, inner);

  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), mat(0xc9c3d6, { flatShading: true }));
    stone.position.set(Math.cos(angle) * 4.25, 0.1, Math.sin(angle) * 4.25);
    stone.scale.set(1, 0.55, 0.85);
    stone.rotation.y = angle;
    stone.castShadow = true;
    group.add(stone);
  }

  for (let i = 0; i < 3; i += 1) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 16), mat(0x6fc46a));
    pad.position.set(Math.cos(i * 2.1) * 1.9, 0.09, Math.sin(i * 2.1) * 1.9);
    group.add(pad);
  }
  const lily = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(0xffa8d4));
  lily.position.set(1.2, 0.16, -1.4);
  lily.scale.y = 0.6;
  group.add(lily);

  return group;
}

function createCloud() {
  const group = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const puffs = [[0, 0, 0, 1.6], [1.6, -0.15, 0.1, 1.15], [-1.5, -0.2, -0.1, 1.05], [0.5, 0.55, 0, 0.95]];
  puffs.forEach(([x, y, z, r]) => {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), cloudMat);
    puff.position.set(x, y, z);
    group.add(puff);
  });
  group.scale.setScalar(1.2 + Math.random() * 1.2);
  return group;
}

function createButterfly(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.16, 4, 8), mat(0x5b3a55));
  body.rotation.x = Math.PI / 2;
  const wingMat = new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
    roughness: 0.65,
    emissive: color,
    emissiveIntensity: 0.18,
  });
  const wingGeo = new THREE.CircleGeometry(0.17, 14);
  const left = new THREE.Mesh(wingGeo, wingMat);
  left.position.set(-0.16, 0, 0);
  const right = new THREE.Mesh(wingGeo, wingMat);
  right.position.set(0.16, 0, 0);
  group.add(body, left, right);
  return { group, left, right };
}

// A Kazakh yurt for the camp: felt walls, a red patterned band, a dome roof
// and a small wooden door. It gives the island a lived-in village edge.
function createYurt() {
  const group = new THREE.Group();
  const felt = mat(0xf4eddc, { roughness: 0.95 });
  const wood = mat(0x8b4a2f, { roughness: 0.8 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.55, 1.9, 24), felt);
  body.position.y = 0.95;
  group.add(body);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.52, 2.52, 0.3, 24), mat(0xc8402f, { roughness: 0.7 }));
  band.position.y = 1.42;
  group.add(band);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.85, 1.6, 24), mat(0xf8f2e4, { roughness: 0.95 }));
  roof.position.y = 2.7;
  group.add(roof);

  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 16), mat(0xc8402f, { roughness: 0.7 }));
  ring.position.y = 3.42;
  group.add(ring);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.5, 0.14), wood);
  door.position.set(0, 0.75, 2.5);
  group.add(door);

  // Two bright wall hangings by the door, so the yurt reads as decorated.
  [-0.85, 0.85].forEach((x) => {
    const hanging = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.08), mat(0x2f7fb5, { roughness: 0.75 }));
    hanging.position.set(x, 1.1, 2.4);
    hanging.rotation.y = Math.sign(x) * 0.32;
    group.add(hanging);
  });

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

// A stone balbal: a tall weathered steppe statue watching the path.
function createBalbal() {
  const group = new THREE.Group();
  const stone = mat(0xbdb6a8, { flatShading: true, roughness: 0.95 });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, 0.55), mat(0xa9a294, { flatShading: true }));
  plinth.position.y = 0.14;
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.02, 8), stone);
  torso.position.y = 0.8;
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.3), stone);
  shoulders.position.y = 1.36;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 1), stone);
  head.position.y = 1.58;
  head.scale.set(0.9, 1.1, 0.9);
  head.rotation.y = 0.4;

  group.add(plinth, torso, shoulders, head);
  group.rotation.y = (Math.random() - 0.5) * 0.5;
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

// A wooden fence run: posts and two rails, length along local x.
function createFence(length) {
  const group = new THREE.Group();
  const postMat = mat(0x9a6b45, { roughness: 0.9 });
  const railMat = mat(0x855a3a, { roughness: 0.9 });
  const posts = Math.max(2, Math.round(length / 1.7));
  for (let i = 0; i < posts; i += 1) {
    const x = -length / 2 + (i * length) / (posts - 1);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), postMat);
    post.position.set(x, 0.55, 0);
    post.rotation.z = (Math.random() - 0.5) * 0.06;
    group.add(post);
  }
  [0.48, 0.88].forEach((y) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.1, 0.08), railMat);
    rail.position.set(0, y, 0);
    group.add(rail);
  });
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

// A tuft of steppe grass: three leaning blades, cheap and large in number.
function createGrassTuft() {
  const group = new THREE.Group();
  const bladeMat = mat(Math.random() > 0.5 ? 0x5aa84f : 0x4c9546, { flatShading: true, roughness: 0.9 });
  for (let i = 0; i < 3; i += 1) {
    const height = 0.35 + Math.random() * 0.3;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.055, height, 5), bladeMat);
    const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.6;
    blade.position.set(Math.cos(angle) * 0.09, height / 2, Math.sin(angle) * 0.09);
    blade.rotation.z = Math.cos(angle) * 0.45;
    blade.rotation.x = Math.sin(angle) * 0.45;
    group.add(blade);
    blade.castShadow = true;
  }
  return group;
}

function createMagicKey() {
  const group = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffcf4d,
    metalness: 0.75,
    roughness: 0.25,
    emissive: 0x6b3f00,
    emissiveIntensity: 0.3,
  });
  const floater = new THREE.Group();
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.08, 10, 22), gold);
  bow.position.y = 1.3;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.85, 10), gold);
  shaft.position.y = 0.72;
  const toothTop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.1), gold);
  toothTop.position.set(0.18, 0.48, 0);
  const toothBottom = toothTop.clone();
  toothBottom.position.y = 0.32;
  floater.add(bow, shaft, toothTop, toothBottom);
  floater.position.y = 0.55;

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 0.32, 18), mat(0xfff1dd));
  pedestal.position.y = 0.16;
  pedestal.receiveShadow = true;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 8, 28), new THREE.MeshStandardMaterial({
    color: 0xffd24a,
    emissive: 0xffb300,
    emissiveIntensity: 0.9,
  }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.34;

  const glow = new THREE.PointLight(0xffc94a, 4.5, 5, 2);
  glow.position.y = 1.2;

  const sparkles = new THREE.Group();
  const sparkleMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffd54a, emissiveIntensity: 1 });
  for (let i = 0; i < 12; i += 1) {
    sparkles.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.055), sparkleMat));
  }

  group.add(pedestal, ring, floater, glow, sparkles);
  group.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });

  let collected = false;
  let collectTime = 0;
  let hidden = false;
  let revealTime = -1;
  let hoverY = 0.55;
  let ghost = false;
  let ghostMaterials = [];

  function update(dt, time) {
    if (hidden) return;
    if (ghost) {
      // Look, but do not touch: the key is only a pale target until the child answers.
      const pulse = 0.2 + (Math.sin(time * 2.2) + 1) * 0.06;
      ghostMaterials.forEach((material) => {
        material.opacity = pulse;
      });
    }
    if (revealTime >= 0 && revealTime < 1) {
      // The key drops out of the air and settles high above its pedestal.
      revealTime = Math.min(1, revealTime + dt * 1.7);
      const eased = 1 - Math.pow(1 - revealTime, 3);
      group.scale.setScalar(0.001 + eased * 0.999);
      hoverY = 2.6 - eased * 1.25;
    }
    if (collected) {
      collectTime += dt;
      floater.position.y = hoverY + collectTime * 2.5;
      floater.scale.setScalar(Math.max(0.001, 1 - collectTime * 1.8));
      sparkles.visible = false;
      glow.intensity = Math.max(0, 4.5 - collectTime * 9);
      if (collectTime > 0.6) group.visible = false;
      return;
    }
    floater.position.y = hoverY + Math.sin(time * 2) * 0.12;
    floater.rotation.y += dt * 1.6;
    sparkles.children.forEach((sparkle, i) => {
      const angle = time * 1.4 + (i / 12) * Math.PI * 2;
      const radius = 0.6 + Math.sin(time * 2 + i) * 0.1;
      sparkle.position.set(
        Math.cos(angle) * radius,
        1.15 + Math.sin(time * 2.4 + i * 1.7) * 0.35,
        Math.sin(angle) * radius,
      );
      sparkle.rotation.y += dt * 2;
    });
  }

  function collect() {
    collected = true;
  }

  // The key waits out of sight until the child says the word for it.
  function hide() {
    hidden = true;
    group.visible = false;
  }

  // It rises out of the ground and floats in the air where the child can see it.
  function reveal() {
    if (!hidden || revealTime >= 0) return;
    hidden = false;
    revealTime = 0;
    group.scale.setScalar(0.001);
    hoverY = 2.6;
    floater.position.y = 2.6;
    group.visible = true;
  }

  // The key waits in the leaves of a tree: the child sees it only after walking there.
  function hangAt(x, y, z) {
    hidden = false;
    group.visible = true;
    group.position.set(x, y, z);
    pedestal.visible = false;
    ring.visible = false;
    group.scale.setScalar(1);
    hoverY = 0.55;
    floater.position.y = 0.55;
  }

  // After the right answer it comes down beside the companion, on its gold ring.
  function arriveAt(x, z) {
    group.position.set(x, 0, z);
    pedestal.visible = true;
    ring.visible = true;
  }

  function isHidden() {
    return hidden;
  }

  // Ghost mode: see-through and fading, with no pickup possible (the hunt gate in
  // main.js keeps keyReady false until the child names the key's place).
  function setGhost(on) {
    ghost = on;
    ghostMaterials = [];
    if (on) {
      const seen = new Set();
      group.traverse((child) => {
        if (!child.isMesh) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (seen.has(material)) return;
          seen.add(material);
          material.transparent = true;
          material.opacity = 0.25;
          material.depthWrite = false;
          material.needsUpdate = true;
          ghostMaterials.push(material);
        });
      });
      glow.intensity = 1.1;
    } else {
      group.traverse((child) => {
        if (!child.isMesh) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (material.transparent !== true || material.opacity === 1) return;
          material.transparent = false;
          material.opacity = 1;
          material.depthWrite = true;
          material.needsUpdate = true;
        });
      });
      glow.intensity = 4.5;
    }
  }

  return { group, update, collect, hide, reveal, hangAt, arriveAt, isHidden, setGhost };
}

function skyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#7fd3ff');
  gradient.addColorStop(0.5, '#cdeeff');
  gradient.addColorStop(1, '#ffdff2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 8, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createWorld(scene) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(160, 32, 20),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);
  scene.fog = new THREE.Fog(0xd6efff, 42, 120);

  // Less fill light and a stronger sun: the shadows stay read as shadows instead
  // of being washed out, which is what made the island look like a flat drawing.
  scene.add(new THREE.HemisphereLight(0xffeaf7, 0x6fcf6f, 1.25));
  const ambient = new THREE.AmbientLight(0xffffff, 0.18);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff3dd, 3.1);
  sun.position.set(16, 26, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -32;
  sun.shadow.camera.right = 32;
  sun.shadow.camera.top = 32;
  sun.shadow.camera.bottom = -32;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0006;
  sun.target.position.set(0, 0, -6);
  scene.add(sun, sun.target);

  const grass = new THREE.Mesh(new THREE.CircleGeometry(44, 64), mat(0x86d97c));
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);

  for (let i = 0; i < 14; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 6 + Math.random() * 18;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(1.5 + Math.random() * 2.6, 20), mat(0x79cc6d));
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(Math.cos(angle) * radius, 0.012, Math.sin(angle) * radius);
    scene.add(patch);
  }

  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), mat(i % 2 ? 0x79cc6d : 0x8fd98a));
    hill.position.set(Math.cos(angle) * 36, 0, Math.sin(angle) * 36);
    hill.scale.set(8 + Math.random() * 3, 3 + Math.random() * 2, 6 + Math.random() * 2);
    hill.rotation.y = angle;
    scene.add(hill);
  }

  let stoneIndex = 0;
  for (let z = 10; z > -9.4; z -= 1.15) {
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.05, 0.12, 12),
      mat(stoneIndex % 2 ? 0xb9bcc2 : 0xa7abb2),
    );
    stone.position.set(Math.sin(z * 0.35) * 1.5, 0.06, z);
    stone.rotation.y = Math.random() * Math.PI;
    stone.receiveShadow = true;
    scene.add(stone);
    stoneIndex += 1;
  }

  const castle = createCastle();
  castle.group.position.set(0, 0, -20);
  scene.add(castle.group);

  const key = createMagicKey();
  key.group.position.set(6.5, 0, -1);
  scene.add(key.group);

  // Round 1 is a hunt: a tall bush on the path hides the key from the child.
  const bush = new THREE.Group();
  bush.position.set(3.8, 0, 2.6);
  [
    [0, 0.85, 0, 1.35, 1.05, 1.25],
    [-0.9, 1.15, 0.2, 1.0, 0.85, 0.95],
    [0.85, 1.05, -0.1, 1.05, 0.9, 1.0],
    [0.1, 1.7, 0.1, 0.95, 0.8, 0.9],
  ].forEach(([x, y, z, sx, sy, sz], index) => {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat(index % 2 ? 0x3f8f4a : 0x2f7a3a));
    blob.position.set(x, y, z);
    blob.scale.set(sx, sy, sz);
    blob.castShadow = true;
    bush.add(blob);
  });
  scene.add(bush);

  let doorOpening = false;
  let doorAngle = 0;

  function openDoor() {
    doorOpening = true;
  }

  const colliders = [];
  colliders.push({ x: 3.8, z: 2.6, r: 1.5 });
  const treeSpots = [
    [-16, -9, 0], [16, -9, 1], [-19, 3, 0], [19, 5, 0],
    [-9, 13, 1], [10, 14, 0], [-21, -3, 0], [21, -2, 1],
    [-5, 17, 0], [6, 18, 1], [-15, 16, 0], [16, 16, 1],
    [-22, 11, 0], [22, 12, 0], [-7, 6, 1], [8, 5, 0],
  ];
  treeSpots.forEach(([x, z, blossom]) => {
    const tree = createTree(blossom === 1);
    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * Math.PI;
    tree.scale.setScalar(0.9 + Math.random() * 0.3);
    scene.add(tree);
    colliders.push({ x, z, r: 0.85 });
  });

  for (let i = 0; i < 55; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 4 + Math.random() * 21;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (z < -9.5) continue;
    if (Math.abs(x) < 2.6 && z < 11) continue;
    if (Math.hypot(x + 12, z - 2) < 5.3) continue;
    const flower = createFlower();
    flower.position.set(x, 0, z);
    flower.rotation.y = Math.random() * Math.PI;
    scene.add(flower);
  }

  const pond = createPond();
  pond.position.set(-12, 0, 2);
  scene.add(pond);
  colliders.push({ x: -12, z: 2, r: 4.3 });

  const mushroomSpots = [[-4.5, 3.5], [4.2, 2.2], [-9, -1.5], [12, 8.5]];
  mushroomSpots.forEach(([x, z]) => {
    const mushroom = createMushroom();
    mushroom.position.set(x, 0, z);
    mushroom.scale.setScalar(0.9 + Math.random() * 0.5);
    scene.add(mushroom);
  });

  for (let i = 0; i < 8; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 8 + Math.random() * 16;
    const rock = createRock();
    rock.position.set(Math.cos(angle) * radius, rock.position.y, Math.sin(angle) * radius);
    scene.add(rock);
  }

  // The steppe camp: two yurts behind the castle on either side, so the island
  // stops at a lived-in village instead of an empty lawn.
  const yurtSpots = [[-17, -15.5], [20, -15]];
  yurtSpots.forEach(([x, z]) => {
    const yurt = createYurt();
    yurt.position.set(x, 0, z);
    // The door (local +z) turns to face the middle of the island.
    yurt.rotation.y = Math.atan2(-x, -z);
    scene.add(yurt);
    colliders.push({ x, z, r: 2.9 });
  });

  const fence = createFence(8.4);
  fence.position.set(12.6, 0, -18.6);
  scene.add(fence);
  [9.4, 12.6, 15.8].forEach((x) => colliders.push({ x, z: -18.6, r: 1.6 }));

  // Weather-worn balbals on both sides of the walk to the castle.
  const pathX = (z) => Math.sin(z * 0.35) * 1.5;
  [8, 3, -2, -7, -10.4].forEach((z, index) => {
    const side = index % 2 === 0 ? 1 : -1;
    const x = pathX(z) + side * 2.75;
    const balbal = createBalbal();
    balbal.position.set(x, 0, z);
    // They look down the path, towards the castle.
    balbal.rotation.y = Math.PI + (Math.random() - 0.5) * 0.3;
    scene.add(balbal);
    colliders.push({ x, z, r: 0.45 });
  });

  // Small pebbles scattered along the path edges.
  for (let i = 0; i < 14; i += 1) {
    const z = 10 - (i / 13) * 19.6;
    const side = i % 2 === 0 ? 1 : -1;
    const pebble = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.1 + Math.random() * 0.08, 0),
      mat(i % 3 ? 0xc4bfb3 : 0xb1aa9c, { flatShading: true }),
    );
    pebble.position.set(pathX(z) + side * (1.5 + Math.random() * 0.8), 0.05, z);
    pebble.scale.y = 0.5;
    pebble.rotation.y = Math.random() * Math.PI;
    pebble.castShadow = true;
    pebble.receiveShadow = true;
    scene.add(pebble);
  }

  // Grass tufts fill the middle distance, so no part of the island is bare.
  let tufts = 0;
  for (let attempt = 0; attempt < 240 && tufts < 48; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * 25;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (z > -12 && z < 12 && Math.abs(x - pathX(z)) < 2.3) continue;
    if (Math.hypot(x + 12, z - 2) < 5.4) continue;
    if (Math.abs(x) < 8.6 && z < -13.2) continue;
    if (Math.hypot(x + 17, z + 15.5) < 4) continue;
    if (Math.hypot(x - 20, z + 15) < 4) continue;
    const tuft = createGrassTuft();
    tuft.position.set(x, 0, z);
    tuft.rotation.y = Math.random() * Math.PI;
    tuft.scale.setScalar(0.85 + Math.random() * 0.7);
    scene.add(tuft);
    tufts += 1;
  }

  const clouds = [];
  for (let i = 0; i < 7; i += 1) {
    const cloud = createCloud();
    cloud.position.set(-34 + Math.random() * 68, 17 + Math.random() * 8, -42 + Math.random() * 36);
    scene.add(cloud);
    clouds.push({ mesh: cloud, speed: 0.25 + Math.random() * 0.35 });
  }

  const butterflies = [];
  const wingColors = [0xffb3d9, 0xfff0a8, 0xc9a8ff, 0xa8f0e0];
  for (let i = 0; i < 6; i += 1) {
    const butterfly = createButterfly(wingColors[i % wingColors.length]);
    scene.add(butterfly.group);
    butterflies.push({
      ...butterfly,
      centerX: -10 + Math.random() * 20,
      centerZ: -6 + Math.random() * 16,
      radius: 1.6 + Math.random() * 2.4,
      speed: 0.35 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      height: 1.4 + Math.random() * 1.2,
    });
  }

  const castleBounds = { minX: -6.4, maxX: 6.4, minZ: -24.4, maxZ: -14.6 };

  function keepInside(position, radius) {
    colliders.forEach((collider) => {
      const dx = position.x - collider.x;
      const dz = position.z - collider.z;
      const distance = Math.hypot(dx, dz);
      const minDistance = collider.r + radius;
      if (distance < minDistance && distance > 0.001) {
        position.x = collider.x + (dx / distance) * minDistance;
        position.z = collider.z + (dz / distance) * minDistance;
      }
    });

    const minX = castleBounds.minX - radius;
    const maxX = castleBounds.maxX + radius;
    const minZ = castleBounds.minZ - radius;
    const maxZ = castleBounds.maxZ + radius;
    if (position.x > minX && position.x < maxX && position.z > minZ && position.z < maxZ) {
      const toLeft = position.x - minX;
      const toRight = maxX - position.x;
      const toFront = maxZ - position.z;
      const toBack = position.z - minZ;
      const smallest = Math.min(toLeft, toRight, toFront, toBack);
      if (smallest === toLeft) position.x = minX;
      else if (smallest === toRight) position.x = maxX;
      else if (smallest === toFront) position.z = maxZ;
      else position.z = minZ;
    }

    const distanceFromCenter = Math.hypot(position.x, position.z);
    if (distanceFromCenter > 24) {
      position.x = (position.x / distanceFromCenter) * 24;
      position.z = (position.z / distanceFromCenter) * 24;
    }
  }

  function update(dt, time) {
    key.update(dt, time);

    if (doorOpening && doorAngle < 1.9) {
      doorAngle = Math.min(1.9, doorAngle + dt * 1.4);
      castle.doorPivot.rotation.y = Math.pow(doorAngle / 1.9, 0.6) * 1.9;
    }

    clouds.forEach((cloud) => {
      cloud.mesh.position.x += cloud.speed * dt;
      if (cloud.mesh.position.x > 40) cloud.mesh.position.x = -40;
    });

    butterflies.forEach((butterfly) => {
      const angle = time * butterfly.speed + butterfly.phase;
      butterfly.group.position.set(
        butterfly.centerX + Math.cos(angle) * butterfly.radius,
        butterfly.height + Math.sin(time * 2 + butterfly.phase) * 0.22,
        butterfly.centerZ + Math.sin(angle) * butterfly.radius,
      );
      butterfly.group.rotation.y = -angle + Math.PI / 2;
      const flap = 0.35 + Math.sin(time * 16 + butterfly.phase) * 0.55;
      butterfly.left.rotation.y = flap;
      butterfly.right.rotation.y = -flap;
    });
  }

  return { update, keepInside, key, openDoor, doorTarget: castle.doorTarget, trees: treeSpots };
}
