import * as THREE from 'three';

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.02, ...options });
}

function add(parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

const ball = (radius, width = 24, height = 18) => new THREE.SphereGeometry(radius, width, height);

// Tier 1, fantasy half: a chunky clay-sculpted snow leopard cub ("Barys").
// Everything is solid geometry: no fur cards, no loose strands.
function buildSnowLeopardCub() {
  const group = new THREE.Group();

  const fur = mat(0xe8dfcb, { roughness: 0.92 });
  const belly = mat(0xf7f0e2, { roughness: 0.94 });
  const spots = mat(0x6e655a, { roughness: 0.9 });
  const dark = mat(0x2f2a26, { roughness: 0.55 });
  const white = mat(0xfffdf7, { roughness: 0.35 });
  const amber = mat(0xffb347, { emissive: 0x8a4d00, emissiveIntensity: 0.45, roughness: 0.3 });
  const pupil = mat(0x1b1410, { roughness: 0.3 });
  const innerEar = mat(0xc98f86, { roughness: 0.9 });
  const teal = mat(0x2f5f63, { roughness: 0.6, metalness: 0.08 });
  const gold = mat(0xd6a33a, { metalness: 0.8, roughness: 0.3 });

  // Body: one big soft egg, wider at the chest than at the hips.
  const body = add(group, ball(0.34, 32, 24), fur, [0, 0.72, 0], [0.95, 1, 0.82]);
  // Cream chest patch, sitting just proud of the fur so it never z-fights.
  add(group, ball(0.2, 24, 18), belly, [0, 0.67, 0.18], [1, 1.06, 0.62]);

  // Back spots: flat clay patches pressed onto the pelt.
  [[-0.2, 0.22, -0.28], [0.16, 0.3, -0.24], [0.02, 0.05, -0.32], [-0.24, -0.1, -0.2], [0.26, 0.02, -0.2]]
    .forEach(([x, y, z]) => {
      add(body, ball(0.055, 12, 8), spots, [x, y, z], [1, 1, 0.28]);
    });

  // Four stubby legs with big round snow paws.
  [-1, 1].forEach((side) => {
    [-0.15, 0.15].forEach((z) => {
      add(group, new THREE.CapsuleGeometry(0.1, 0.16, 6, 12), fur, [side * 0.17, 0.22, z]);
      add(group, ball(0.125, 16, 12), belly, [side * 0.18, 0.07, z + 0.04], [1, 0.6, 1.3]);
    });
  });

  // Arms, kept low and relaxed so the cub reads as a companion, not a teddy.
  const arms = [];
  [-1, 1].forEach((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.31, 0.88, 0.06);
    arm.rotation.z = side * 0.22;
    add(arm, new THREE.CapsuleGeometry(0.078, 0.2, 6, 12), fur, [0, -0.13, 0]);
    add(arm, ball(0.1, 14, 12), belly, [0, -0.26, 0.02], [1, 0.95, 1]);
    group.add(arm);
    arms.push(arm);
  });

  // Cuffs at the shoulders, a hint of Kazakh dress on a wild animal.
  [-1, 1].forEach((side) => {
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.022, 8, 20), teal);
    cuff.position.set(side * 0.31, 0.97, 0.06);
    cuff.rotation.x = Math.PI / 2;
    cuff.rotation.z = side * 0.22;
    group.add(cuff);
  });

  // Tail: a chain of shrinking blobs that curls up behind the hips.
  const tail = new THREE.Group();
  tail.position.set(0, 0.62, -0.24);
  const tailCurve = [
    [0, -0.02, -0.06, 0.115],
    [0.02, -0.08, -0.16, 0.105],
    [0.05, -0.08, -0.28, 0.095],
    [0.08, -0.02, -0.38, 0.085],
    [0.1, 0.08, -0.43, 0.075],
  ];
  tailCurve.forEach(([x, y, z, r], index) => {
    add(tail, ball(r, 16, 12), fur, [x, y, z], [1, 1, 1.15]);
    if (index > 1) add(tail, ball(r * 0.55, 10, 8), spots, [x, y + r * 0.7, z], [1, 0.35, 1]);
  });
  add(tail, ball(0.075, 16, 12), dark, [0.11, 0.16, -0.44], [1, 0.9, 1.2]);
  group.add(tail);

  // Head group, so the whole face can turn and look around.
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.24, 0);
  group.add(headGroup);

  const head = add(headGroup, ball(0.29, 32, 24), fur, [0, 0, 0], [1.02, 0.96, 0.98]);

  [[-0.12, 0.16, 0.18], [0.02, 0.2, 0.16], [0.14, 0.15, 0.17], [-0.18, 0.02, 0.18], [0.18, 0.03, 0.17]]
    .forEach(([x, y, z]) => {
      add(head, ball(0.038, 10, 8), spots, [x, y, z], [1, 1, 0.3]);
    });

  // Muzzle and chin in creamy white, with a soft wedge nose.
  add(headGroup, ball(0.135, 22, 16), belly, [0, -0.1, 0.22], [1.25, 0.72, 0.85]);
  add(headGroup, ball(0.05, 14, 10), belly, [0, -0.175, 0.2], [1.3, 0.7, 0.8]);
  add(headGroup, new THREE.SphereGeometry(0.048, 14, 10), dark, [0, -0.045, 0.32], [1.25, 0.85, 0.75]);

  // Smile: two small arcs, friendly rather than sharp.
  [-1, 1].forEach((side) => {
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.008, 6, 14, Math.PI), dark);
    smile.position.set(side * 0.04, -0.105, 0.305);
    smile.rotation.z = side * -0.5;
    smile.rotation.x = -0.35;
    headGroup.add(smile);
  });

  // Whiskers as thin solid rods, so they never look like hair strands.
  [-1, 1].forEach((side) => {
    [-0.02, 0.015].forEach((y, index) => {
      const whisker = add(headGroup, new THREE.CapsuleGeometry(0.004, 0.16, 4, 6), white,
        [side * 0.19, -0.075 + y, 0.24]);
      whisker.rotation.z = Math.PI / 2 + side * (index === 0 ? -0.18 : 0.05);
    });
  });

  // Big warm amber eyes: the cartoon "Leo & Tig" expression.
  const eyes = new THREE.Group();
  eyes.position.set(0, 0.09, 0);
  headGroup.add(eyes);
  [-1, 1].forEach((side) => {
    add(eyes, ball(0.075, 20, 16), white, [side * 0.115, 0, 0.225], [1, 1.08, 0.62]);
    add(eyes, ball(0.055, 18, 14), amber, [side * 0.118, -0.004, 0.268], [1, 1.05, 0.5]);
    add(eyes, ball(0.027, 12, 10), pupil, [side * 0.118, -0.006, 0.298], [0.85, 1.1, 0.5]);
    add(eyes, ball(0.011, 8, 6), white, [side * 0.128, 0.012, 0.308], [1, 1, 0.6]);
  });

  // Brows: soft dark ridges that keep the face gentle.
  [-1, 1].forEach((side) => {
    const brow = add(headGroup, new THREE.CapsuleGeometry(0.008, 0.044, 4, 8), spots,
      [side * 0.112, 0.163, 0.245]);
    brow.rotation.z = Math.PI / 2 - side * 0.1;
  });

  // Rounded ears, solid clay cups with a pink inside.
  const ears = [];
  [-1, 1].forEach((side) => {
    const ear = new THREE.Group();
    ear.position.set(side * 0.225, 0.21, -0.02);
    ear.rotation.z = side * 0.32;
    ear.rotation.y = side * 0.25;
    add(ear, ball(0.1, 18, 14), fur, [0, 0, 0], [1, 0.92, 0.5]);
    add(ear, ball(0.07, 14, 10), innerEar, [0, -0.005, 0.035], [1, 0.85, 0.3]);
    headGroup.add(ear);
    ears.push(ear);
  });

  // Cheek ruffs: the fluffy round sides of a leopard face.
  [-1, 1].forEach((side) => {
    add(headGroup, ball(0.17, 18, 14), fur, [side * 0.205, -0.075, 0.03], [0.95, 0.85, 0.8]);
  });

  // Collar of the companion rank with three gold oyu studs on the front.
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.038, 10, 32), teal);
  collar.position.set(0, 0.985, 0);
  collar.rotation.x = Math.PI / 2;
  collar.castShadow = true;
  group.add(collar);
  [-0.09, 0, 0.09].forEach((x) => {
    const stud = add(group, new THREE.OctahedronGeometry(0.032), gold, [x, 0.978, 0.222]);
    stud.scale.set(0.8, 1.2, 0.6);
  });

  return {
    group,
    head: headGroup,
    tail,
    ears,
    eyes,
    arms,
  };
}

// Tier 1, sci-fi half: a floating spherical scout droid on the same rig.
function buildScoutDroid() {
  const group = new THREE.Group();
  const hover = new THREE.Group();
  group.add(hover);

  const steel = mat(0xc7ced6, { metalness: 0.75, roughness: 0.28 });
  const darkSteel = mat(0x3b424b, { metalness: 0.7, roughness: 0.4 });
  const gold = mat(0xd6a33a, { metalness: 0.85, roughness: 0.25 });
  const glow = mat(0x59e0ff, { emissive: 0x2ea8d8, emissiveIntensity: 1.6, roughness: 0.2 });
  const visor = mat(0x141b22, { metalness: 0.5, roughness: 0.18 });

  // Main sphere, with a gold equator ring that hides the seam.
  const body = add(hover, ball(0.34, 32, 24), steel, [0, 0.72, 0]);
  const equator = new THREE.Mesh(new THREE.TorusGeometry(0.342, 0.028, 10, 40), gold);
  equator.position.set(0, 0.72, 0);
  equator.rotation.x = Math.PI / 2;
  equator.castShadow = true;
  hover.add(equator);
  [-1, 1].forEach((side) => {
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.012, 8, 36), darkSteel);
    seam.position.set(0, 0.72, 0);
    seam.rotation.y = side * Math.PI / 3;
    hover.add(seam);
  });

  // Hover ring below the ball: the droid never touches the ground.
  const hoverRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 10, 36), glow);
  hoverRing.position.set(0, 0.3, 0);
  hoverRing.rotation.x = Math.PI / 2;
  hover.add(hoverRing);
  const thruster = add(hover, new THREE.ConeGeometry(0.16, 0.18, 16, 1, true), glow, [0, 0.4, 0]);
  thruster.rotation.x = Math.PI;
  thruster.material = thruster.material.clone();
  thruster.material.transparent = true;
  thruster.material.opacity = 0.35;

  // Dome head with a dark visor band and two glowing eyes.
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.06, 0);
  hover.add(headGroup);
  add(headGroup, ball(0.24, 28, 20), steel, [0, 0.06, 0], [1, 0.92, 1]);
  add(headGroup, ball(0.2, 24, 18), visor, [0, 0.04, 0.09], [1, 0.62, 0.82]);
  add(headGroup, new THREE.CylinderGeometry(0.2, 0.235, 0.06, 28), gold, [0, -0.12, 0]);

  const eyes = new THREE.Group();
  eyes.position.set(0, 0.06, 0);
  headGroup.add(eyes);
  [-1, 1].forEach((side) => {
    add(eyes, new THREE.CapsuleGeometry(0.028, 0.03, 4, 10), glow, [side * 0.082, 0, 0.262], [1, 1, 0.55]);
  });

  // Antenna with a pulsing tip.
  const antenna = add(headGroup, new THREE.CylinderGeometry(0.008, 0.012, 0.2, 8), darkSteel, [0, 0.32, 0]);
  antenna.rotation.z = 0.12;
  add(headGroup, ball(0.035, 12, 10), glow, [0.024, 0.42, 0]);

  // Floating arm pods, not connected to the body.
  const arms = [];
  [-1, 1].forEach((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.42, 0.8, 0.04);
    add(arm, ball(0.09, 16, 12), steel, [0, 0, 0], [1, 0.9, 1]);
    add(arm, ball(0.045, 12, 10), glow, [0, 0, 0.075], [1, 1, 0.7]);
    hover.add(arm);
    arms.push(arm);
  });

  // Three oyu studs on the chest, matching the cub's collar.
  [-0.1, 0, 0.1].forEach((x) => {
    const stud = add(hover, new THREE.OctahedronGeometry(0.03), gold, [x, 0.9, 0.3]);
    stud.scale.set(0.8, 1.2, 0.7);
  });

  // Ground shadow stand-in so the droid still feels attached to the world.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 28),
    new THREE.MeshBasicMaterial({ color: 0x2a2f36, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  group.add(shadow);

  return { group, hover, head: headGroup, tail: null, ears: [], eyes, arms, hoverRing };
}

export function createCompanion({ variant = 'fantasy' } = {}) {
  const built = variant === 'scifi' ? buildScoutDroid() : buildSnowLeopardCub();
  const { group, head, arms, eyes } = built;
  const tail = built.tail;
  const ears = built.ears;
  const hover = built.hover;
  const hoverRing = built.hoverRing;

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = false;
    }
  });

  const baseY = group.position.y;
  let phase = 0;
  let blinkTimer = 2.2;

  function update(dt, moving, time) {
    phase += dt * (moving ? 5.4 : 1.6);

    if (hover) {
      // The droid breathes by floating, not by squashing its shell.
      hover.position.y = Math.sin(time * 1.7) * 0.05;
      hover.rotation.z = Math.sin(time * 0.9) * 0.03;
      hoverRing.scale.setScalar(1 + Math.sin(time * 3.2) * 0.05);
    } else {
      group.position.y = baseY + Math.sin(time * 1.5) * 0.008;
    }

    // Head follows the player a little, then drifts back.
    head.rotation.y = Math.sin(time * 0.7) * 0.22 + Math.sin(phase * 0.4) * 0.05;
    head.rotation.x = Math.sin(time * 0.5) * 0.05;

    arms.forEach((arm, index) => {
      const side = index === 0 ? -1 : 1;
      const swing = moving ? 0.3 : 0.05;
      arm.rotation.x = Math.sin(phase + index * Math.PI) * swing;
      if (hover) arm.rotation.z = side * 0.12 + Math.sin(time * 1.3 + index) * 0.06;
    });

    if (tail) {
      tail.rotation.y = Math.sin(time * 1.1) * 0.22;
      tail.rotation.x = Math.sin(time * 0.8 + 1) * 0.06;
    }

    ears.forEach((ear, index) => {
      const side = index === 0 ? -1 : 1;
      ear.rotation.z = side * 0.32 + Math.sin(time * 2.1 + index) * 0.05;
    });

    // A soft blink every few seconds keeps the face alive.
    blinkTimer -= dt;
    if (blinkTimer <= 0) blinkTimer = 2.4 + Math.random() * 2.6;
    const blink = blinkTimer < 0.12 ? 0.12 : 1;
    eyes.scale.y += (blink - eyes.scale.y) * Math.min(1, dt * 22);
  }

  return { group, head, update };
}
