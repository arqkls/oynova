// Round 2 and Round 3: the dark stone hall with the neon portal, and the
// Mysterious Kazakh Forest with the red and blue paths. Both sit far from the
// outdoor garden so the two worlds never touch.
import * as THREE from 'three';

const HALL_Z = 200;
const FOREST_Z = 400;

function stone(color, emissive = 0x0b1220, intensity = 0.45) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.05, emissive, emissiveIntensity: intensity });
}

function neon(color) {
  return new THREE.MeshBasicMaterial({ color });
}

function add(parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  parent.add(mesh);
  return mesh;
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

export function createLevel2(scene) {
  const hall = new THREE.Group();
  hall.position.set(0, 0, HALL_Z);
  scene.add(hall);

  const wall = stone(0x4c525b);
  const floorMat = stone(0x2f333a, 0x05080f, 0.25);

  const floor = add(hall, new THREE.BoxGeometry(16, 0.3, 44), floorMat, [0, -0.15, -6]);
  floor.receiveShadow = true;
  add(hall, new THREE.BoxGeometry(0.8, 9, 44), wall, [-8.2, 4.5, -6]);
  add(hall, new THREE.BoxGeometry(0.8, 9, 44), wall, [8.2, 4.5, -6]);
  add(hall, new THREE.BoxGeometry(17, 9, 0.8), wall, [0, 4.5, -28.2]);
  add(hall, new THREE.BoxGeometry(17, 0.6, 44), wall, [0, 9.3, -6]);
  add(hall, new THREE.BoxGeometry(6.2, 9, 0.8), wall, [-5.6, 4.5, 15.8]);
  add(hall, new THREE.BoxGeometry(6.2, 9, 0.8), wall, [5.6, 4.5, 15.8]);
  add(hall, new THREE.BoxGeometry(17, 2.6, 0.8), wall, [0, 7.9, 15.8]);

  // Pillars and torches down both sides.
  const pillarMat = stone(0x565d67, 0x0b1220, 0.3);
  const flameMat = neon(0xffb053);
  const torchPositions = [];
  [-22, -12, -2, 8].forEach((z) => {
    [-6.4, 6.4].forEach((x) => {
      add(hall, new THREE.CylinderGeometry(0.55, 0.7, 9, 12), pillarMat, [x, 4.5, z]);
      const bracket = add(hall, new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6), neon(0x2a2d33), [x - Math.sign(x) * 0.55, 3.4, z]);
      bracket.rotation.z = Math.PI / 2;
      const flame = add(hall, new THREE.SphereGeometry(0.17, 10, 8), flameMat, [x - Math.sign(x) * 0.95, 3.45, z], [1, 1.5, 1]);
      torchPositions.push(flame);
    });
  });
  [-22, -2].forEach((z) => {
    [-6.4, 6.4].forEach((x) => {
      const light = new THREE.PointLight(0xff9a3c, 5.5, 15, 2);
      light.position.set(x - Math.sign(x) * 1.0, 3.6, z);
      hall.add(light);
    });
  });

  // The entrance door: starts lifted, slams down behind the child.
  const doorPanel = add(hall, new THREE.BoxGeometry(5.4, 7.2, 0.4), stone(0x23262c, 0x0a0a0d, 0.2), [0, 8.6, 15.4]);
  [-1.6, 0, 1.6].forEach((x) => {
    add(doorPanel, new THREE.BoxGeometry(0.12, 6.4, 0.1), neon(0x5b6470), [x, 0, 0.22]);
  });
  let doorDrop = 0;
  let doorSlammed = false;

  // Portal at the far end of the hall.
  const portal = new THREE.Group();
  portal.position.set(0, 2.5, -14);
  hall.add(portal);
  const ring = add(portal, new THREE.TorusGeometry(2.4, 0.18, 12, 48), neon(0x9a4dff));
  add(portal, new THREE.TorusGeometry(2.62, 0.06, 8, 48), neon(0x54e8ff));
  const membrane = add(portal, new THREE.CircleGeometry(2.28, 40), new THREE.MeshBasicMaterial({
    color: 0x6a24d6, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const portalSparks = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(
      Array.from({ length: 210 }, () => {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 2.2;
        return [Math.cos(angle) * radius, Math.sin(angle) * radius, (Math.random() - 0.5) * 0.4];
      }).flat(), 3,
    )),
    new THREE.PointsMaterial({ color: 0xa9f4ff, size: 0.13, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  portal.add(portalSparks);
  const portalLight = new THREE.PointLight(0x9a5cff, 14, 22, 2);
  portalLight.position.set(0, 2.5, -14);
  hall.add(portalLight);
  add(hall, new THREE.BoxGeometry(1.8, 0.03, 26), stone(0x24303c, 0x1f5f6e, 0.9), [0, 0.02, 2]);

  // ---------- Forest ----------
  const forest = new THREE.Group();
  forest.position.set(0, 0, FOREST_Z);
  scene.add(forest);

  const ground = add(forest, new THREE.CircleGeometry(28, 40), stone(0x102a24, 0x06120f, 0.6), [0, -0.05, 0]);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;

  const sky = add(forest, new THREE.SphereGeometry(80, 24, 16), new THREE.MeshBasicMaterial({ color: 0x06111c, side: THREE.BackSide, fog: false }));
  globeHint(sky);

  const treeSpots = [
    [-11, -4, 0x25e0b8], [11, -4, 0x5a6bff], [-14, 6, 0x25e0b8], [14, 6, 0xff5ba8],
    [-8, -15, 0x5a6bff], [8, -15, 0x25e0b8], [-18, -10, 0xff5ba8], [18, -10, 0x2f8f4a],
    [-3, -18, 0x25e0b8], [3, -18, 0x5a6bff], [-18, 13, 0x2f8f4a], [18, 13, 0x25e0b8],
  ];
  treeSpots.forEach(([x, z, color]) => {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    add(tree, new THREE.CylinderGeometry(0.16, 0.3, 3.1, 7), stone(0x1b2b2a, 0x050d0c, 0.3), [0, 1.55, 0]);
    const leafMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.85, roughness: 0.7 });
    add(tree, new THREE.IcosahedronGeometry(1.25, 1), leafMat, [0, 3.4, 0], [1, 0.95, 1]);
    add(tree, new THREE.IcosahedronGeometry(0.85, 1), leafMat, [0.8, 4.2, 0.2]);
    add(tree, new THREE.IcosahedronGeometry(0.7, 1), leafMat, [-0.7, 4.0, -0.2]);
    forest.add(tree);
  });

  const plantColors = [0x54e8ff, 0xff6bd6, 0x9dff6b, 0x9a4dff];
  const plants = new THREE.Group();
  forest.add(plants);
  for (let i = 0; i < 34; i += 1) {
    const angle = (i / 34) * Math.PI * 2 + Math.sin(i * 2.7) * 0.5;
    const radius = 3 + ((i * 13) % 19);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 2.4 && z > -12 && z < 14) continue;
    const height = 0.4 + ((i * 7) % 10) / 10;
    const stem = add(plants, new THREE.CylinderGeometry(0.02, 0.03, height, 5), stone(0x1d3b32, 0x0a1a14, 0.4), [x, height / 2, z]);
    stem.receiveShadow = false;
    add(plants, new THREE.SphereGeometry(0.13, 8, 6), neon(plantColors[i % plantColors.length]), [x, height + 0.08, z]);
  }

  const fireflies = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(
      Array.from({ length: 90 }, () => [
        (Math.random() - 0.5) * 34, 0.6 + Math.random() * 4.5, (Math.random() - 0.5) * 30,
      ]).flat(), 3,
    )),
    new THREE.PointsMaterial({ color: 0x9dffd8, size: 0.11, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  forest.add(fireflies);

  function makeGate(x, color, hexColor) {
    const gate = new THREE.Group();
    gate.position.set(x, 0, -8);
    add(gate, new THREE.CylinderGeometry(0.13, 0.18, 3.4, 8), stone(0x243b3a, 0x0a1816, 0.4), [-1.6, 1.7, 0]);
    add(gate, new THREE.CylinderGeometry(0.13, 0.18, 3.4, 8), stone(0x243b3a, 0x0a1816, 0.4), [1.6, 1.7, 0]);
    add(gate, new THREE.TorusGeometry(1.5, 0.16, 10, 40), neon(color), [0, 1.95, 0]);
    const membrane = add(gate, new THREE.CircleGeometry(1.4, 32), new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.28, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }), [0, 1.95, 0]);
    const light = new THREE.PointLight(hexColor, 6, 10, 2);
    light.position.set(0, 2, 0.4);
    gate.add(light);
    forest.add(gate);
    return { group: gate, membrane };
  }

  const redGate = makeGate(-4.4, 0xff3b5c, 0xff3b5c);
  const blueGate = makeGate(4.4, 0x3b8cff, 0x3b8cff);

  const redPathMat = stone(0x3a1219, 0xff3b5c, 0.5);
  const bluePathMat = stone(0x101a30, 0x3b8cff, 0.5);
  add(forest, new THREE.BoxGeometry(1.4, 0.03, 9), redPathMat, [-2.1, 0.02, 6.6]).rotation.y = 0.3;
  add(forest, new THREE.BoxGeometry(1.4, 0.03, 7), redPathMat, [-3.8, 0.02, -2.6]).rotation.y = 0.15;
  add(forest, new THREE.BoxGeometry(1.4, 0.03, 9), bluePathMat, [2.1, 0.02, 6.6]).rotation.y = -0.3;
  add(forest, new THREE.BoxGeometry(1.4, 0.03, 7), bluePathMat, [3.8, 0.02, -2.6]).rotation.y = -0.15;

  function globeHint(object) {
    object.frustumCulled = false;
  }

  function slamDoor() {
    if (doorSlammed) return;
    doorSlammed = true;
  }

  function update(dt, time) {
    if (doorSlammed && doorDrop < 1) {
      doorDrop = Math.min(1, doorDrop + dt * 2.8);
      const eased = 1 - Math.pow(1 - doorDrop, 3);
      doorPanel.position.y = 8.6 - eased * 5.1;
    }
    portalSparks.rotation.z += dt * 0.9;
    const pulse = 1 + Math.sin(time * 3.2) * 0.035;
    ring.scale.set(pulse, pulse, 1);
    membrane.material.opacity = 0.45 + Math.sin(time * 2.4) * 0.12;
    portalLight.intensity = 12 + Math.sin(time * 3.2) * 3;
    torchPositions.forEach((flame, index) => {
      const flicker = 1 + Math.sin(time * 7 + index * 1.7) * 0.12;
      flame.scale.set(flicker, 1.5 * flicker, flicker);
    });
    redGate.membrane.material.opacity = 0.22 + Math.sin(time * 2.1) * 0.1;
    blueGate.membrane.material.opacity = 0.22 + Math.sin(time * 2.1 + 1.6) * 0.1;
    fireflies.rotation.y = Math.sin(time * 0.12) * 0.06;
    plantGlow(time);
  }

  function plantGlow(time) {
    plants.children.forEach((child, index) => {
      if (child.material && child.material.type === 'MeshBasicMaterial') {
        child.scale.setScalar(0.85 + Math.sin(time * 2 + index) * 0.18);
      }
    });
  }

  function keepInside(position, area) {
    if (area === 'forest') {
      const dx = position.x;
      const dz = position.z - FOREST_Z;
      const distance = Math.hypot(dx, dz);
      if (distance > 23) {
        position.x = (dx / distance) * 23;
        position.z = FOREST_Z + (dz / distance) * 23;
      }
      return;
    }
    position.x = clamp(position.x, -6.9, 6.9);
    position.z = clamp(position.z, HALL_Z - 11.2, HALL_Z + 14.4);
  }

  return {
    hall,
    forest,
    update,
    keepInside,
    slamDoor,
    hallStart: new THREE.Vector3(0, 0, HALL_Z + 14),
    hallCompanion: new THREE.Vector3(2.7, 0, HALL_Z - 6.5),
    portalCenter: new THREE.Vector3(0, 2.4, HALL_Z - 14),
    forestStart: new THREE.Vector3(0, 0, FOREST_Z + 12.2),
    forestCompanion: new THREE.Vector3(-4.8, 0, FOREST_Z + 5.2),
    redGate: new THREE.Vector3(-4.4, 0, FOREST_Z - 8),
    blueGate: new THREE.Vector3(4.4, 0, FOREST_Z - 8),
  };
}
