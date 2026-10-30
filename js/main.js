import * as THREE from 'three';
import { createWorld } from './world.js';
import { createCompanion } from './companion.js';
import { createLevel2 } from './level2.js';
import { playLine, repeatLine, unlockAudio, onVoiceLine, isLinePlaying } from './kazakh.js';
import { canListen, listen, pickOption } from './listen.js';
import { createColourRound } from './colours.js';
import { readSticks } from './vr-sticks.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true;

// The island's sky and ground are painted into a small equirectangular picture and
// turned into an environment map, so every glossy surface (gold, wet stone, water)
// reflects the scene around it instead of looking painted.
function makeSkyEnvironment() {
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512;
  skyCanvas.height = 256;
  const context = skyCanvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#5fa9e6');
  gradient.addColorStop(0.4, '#a9d7f5');
  gradient.addColorStop(0.5, '#eaf5ff');
  gradient.addColorStop(0.57, '#a3d18c');
  gradient.addColorStop(1, '#5e9a4c');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 256);

  // The sun sits in the sky where the directional light comes from.
  const sun = context.createRadialGradient(352, 58, 2, 352, 58, 44);
  sun.addColorStop(0, '#ffffff');
  sun.addColorStop(1, 'rgba(255, 250, 220, 0)');
  context.fillStyle = sun;
  context.fillRect(308, 14, 88, 88);

  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.mapping = THREE.EquirectangularReflectionMapping;
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(skyTexture).texture;
  skyTexture.dispose();
  pmrem.dispose();
  return envMap;
}

const scene = new THREE.Scene();
scene.environment = makeSkyEnvironment();
// First-person view: the child looks through their own eyes, so no body is drawn.
const EYE_HEIGHT = 1.62;
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 300);

const world = createWorld(scene);

// First person: the child looks through their own eyes, so the player is an
// empty point that only carries position and heading. There is no body at all.
const player = { group: new THREE.Group(), update() {} };
player.group.position.set(0, 0, 10);
scene.add(player.group);

// Tier 1 companion: Snow Leopard Cub (fantasy) or Scout Droid (sci-fi).
// Add ?companion=scifi to the address to see the sci-fi asset.
const wantsSciFi = new URLSearchParams(window.location.search).get('companion') === 'scifi';
const companion = createCompanion({ variant: wantsSciFi ? 'scifi' : 'fantasy' });
companion.group.position.set(1.8, 0, 6);
companion.group.rotation.y = 0;
scene.add(companion.group);

const level2 = createLevel2(scene);

// Real shadows everywhere: the props, the trees and the companion both cast and
// receive them, so the island has depth instead of looking painted flat. The sky,
// the clouds and the butterflies use unlit basic materials and keep no shadow.
scene.traverse((object) => {
  if (!object.isMesh) return;
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  materials.forEach((material) => {
    // The sky reflection is the light the island bounces back: strong enough to
    // glaze metal and stone, soft enough not to wash the colours out.
    if (material.isMeshStandardMaterial) {
      // Metal takes the sky almost fully, so gold and steel shine; grass and
      // stone keep it soft so the vivid colours stay vivid.
      material.envMapIntensity = material.metalness > 0.4 ? 0.7 : 0.45;
    }
  });
  if (materials.every((material) => material.isMeshBasicMaterial)) return;
  object.castShadow = true;
  object.receiveShadow = true;
});

const missionText = document.getElementById('missionText');
const keyBadge = document.getElementById('keyBadge');
const toastElement = document.getElementById('toast');
const winElement = document.getElementById('win');
const flashElement = document.getElementById('flash');
document.getElementById('playAgain').addEventListener('click', () => window.location.reload());

// The colour round: the companion teaches the six Kazakh colours. It opens by
// itself when the island loads, and while it is open the world controls are off.
// It is once per round only: this flag lives in memory, so finishing it hides it
// until «Play again» (which reloads the page) starts a fresh round with the quiz.
let coloursDone = false;
let quizDone = false;
const releaseControls = () => {
  keys.clear();
  padKeys.clear();
  document.querySelectorAll('.pad-btn.is-held').forEach((button) => button.classList.remove('is-held'));
};

// One crystal quiz only: six colours, one card each. After it the child looks
// for the key; the next round (Play again) shows the quiz again.
const colourRound = createColourRound({
  onComplete: () => {
    coloursDone = true;
    quizDone = true;
    missionText.textContent = 'Кілтті тап!';
    toast('Алты түсті білдің! Енді кілтті тап!');
    // Now the dragon sends the child to find the key on the island.
    intro = 'greet';
    startMission();
  },
  onOpen: releaseControls,
  onError: (message) => toast(message),
});

// Voice hunt: the key waits in a tree behind the child. They walk around, find it,
// and say where it is; only then does it come down beside the companion.
// On the public link there is no microphone, so the key stays on its stand.
const micButton = document.getElementById('micButton');
let keyReady = true;
// A different tree hides the key in every game.
const [treeX, treeZ] = world.trees[Math.floor(Math.random() * world.trees.length)];
const keyTree = { x: treeX, z: treeZ };
// The key hangs in front of that tree, on the side of the island: the child sees it,
// but it only comes down after they say «таптым ағашта».
const treeLength = Math.hypot(treeX, treeZ) || 1;
const keySpot = {
  x: treeX - (treeX / treeLength) * 1.6,
  y: 1.1,
  z: treeZ - (treeZ / treeLength) * 1.6,
};
let keyShown = false;
if (canListen()) {
  world.key.hangAt(keySpot.x, keySpot.y, keySpot.z);
  world.key.setGhost(true);
  keyReady = false;
} else {
  micButton.hidden = true;
}

// The speaker button: the child taps it when they did not hear the line.
const repeatButton = document.getElementById('repeatButton');
repeatButton.addEventListener('click', () => {
  unlockAudio();
  ensureAudio();
  toast('Тағы айтам');
  repeatLine();
});

let micBusy = false;
micButton.addEventListener('click', async () => {
  if (micBusy) return;
  micBusy = true;
  unlockAudio();
  ensureAudio();
  micButton.classList.add('is-listening');
  toast(intro === 'greet' ? 'Қалайсың?' : intro === 'take' ? 'Кілтті ал' : 'Кілт қайда? Айт');
  try {
    const heard = await listen(3, 'kk');
    console.info('The child said:', heard);
    // The child did not hear or did not understand: say the last line again, once.
    const wantsRepeat = pickOption(heard, [
      ['қайтала', 'қайталашы', 'қайталап айт', 'тағы айтшы', 'тағы айт', 'түсінбедім', 'repeat'],
    ], 0.72);
    if (wantsRepeat === 0) {
      toast('Тағы айтам');
      repeatLine();
      return;
    }
    if (intro === 'greet') {
      const saidGood = pickOption(heard, [['жақсы', 'жарайды', 'тамаша', 'окей', 'good', 'fine']], 0.6);
      if (saidGood === 0) {
        startMission();
      } else {
        toast('Сәлем! Қалайсың?');
        playLine('greet');
      }
      return;
    }
    if (intro === 'take') {
      toast('Кілтті ал да, қамалға кір');
      playLine('al');
      return;
    }
    if (intro !== 'ask') {
      toast('Тыңда!');
      playLine('mission');
      return;
    }
    // The child asks for help: the companion hints that the key is in a tree.
    const wantsHint = pickOption(heard, [
      ['көмек', 'көмектес', 'көмектесіңіз', 'айт', 'кілт қайда', 'қайда', 'көрсет', 'hint', 'help'],
    ], 0.6);
    if (wantsHint === 0) {
      toast('Кілт ағаштардың бірінде');
      missionText.textContent = 'Кілт қайда? Ағаштардың бірінде';
      playLine('hint');
      return;
    }
    // The child found the key and says where it is («ағашта» – on the tree) or
    // points at it («міне» / «мына жерде»).
    const saidPlace = pickOption(heard, [['таптым', 'таптым ағашта', 'таптым ағаш', 'ағаш', 'ағашта', 'ағаштың үстінде', 'ағашта тұр', 'үстінде', 'ағаш басында', 'міне', 'мына жерде', 'міне осында', 'on the tree', 'found', 'here']], 0.6);
    if (saidPlace === 0) {
      intro = 'take';
      keyReady = true;
      // The ghost turns solid where it hangs: the child takes it right here, at the tree.
      world.key.setGhost(false);
      missionText.textContent = 'Дұрыс! Кілтті ал';
      toast('Дұрыс!');
      playLine('durys', () => playLine('al'));
      chime([784, 988, 1319]);
    } else {
      toast('Дұрыс емес, қайталап көр');
      playLine('durys_emas');
    }
  } catch (error) {
    console.warn('Microphone problem', error);
    toast('Микрофонды рұқсат етіңіз');
    // The browser cannot listen on this device: the ghost key must not trap the child,
    // so it turns solid and walking into it takes it, like on a page without a microphone.
    if (!hasKey && !keyReady) {
      keyReady = true;
      world.key.setGhost(false);
      missionText.textContent = 'Дұрыс! Кілтті ал';
    }
  } finally {
    micBusy = false;
    micButton.classList.remove('is-listening');
  }
});

let audio = null;
let toastTimer = 0;

function ensureAudio() {
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === 'suspended') audio.resume();
}

function chime(frequencies, step = 0.13) {
  if (!audio) return;
  frequencies.forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + index * step;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + step + 0.16);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + step + 0.2);
  });
}

// Deep stone door slam: a falling tone plus a short noise rattle.
function thud() {
  if (!audio) return;
  const now = audio.currentTime;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(110, now);
  oscillator.frequency.exponentialRampToValueAtTime(34, now + 0.45);
  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.75);

  const length = Math.floor(audio.sampleRate * 0.3);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  }
  const noise = audio.createBufferSource();
  const noiseGain = audio.createGain();
  noise.buffer = buffer;
  noiseGain.gain.value = 0.22;
  noise.connect(noiseGain).connect(audio.destination);
  noise.start(now);
}

// Fireworks in the hall: six bursts of glowing points around the portal.
const bursts = [];
const burstColors = [0x9a5cff, 0x54e8ff, 0xffd75e, 0xff6fb5, 0x8bffb0];

function makeBurst(x, y, z, color) {
  const count = 120;
  const positions = new Float32Array(count * 3);
  const speeds = [];
  for (let i = 0; i < count; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 3.5 + Math.random() * 4.5;
    speeds.push(new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.cos(phi) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
    ));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color, size: 0.22, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.position.set(x, y, z);
  scene.add(points);
  bursts.push({ points, speeds, life: 0, duration: 1.9 });
}

function launchFireworks() {
  let made = 0;
  const timer = setInterval(() => {
    makeBurst(
      (Math.random() - 0.5) * 8,
      4 + Math.random() * 4,
      level2.portalCenter.z + (Math.random() - 0.5) * 5,
      burstColors[made % burstColors.length],
    );
    made += 1;
    if (made === 6) clearInterval(timer);
  }, 240);
}

function updateFireworks(dt) {
  for (let i = bursts.length - 1; i >= 0; i -= 1) {
    const burst = bursts[i];
    burst.life += dt;
    const attribute = burst.points.geometry.getAttribute('position');
    const positions = attribute.array;
    burst.speeds.forEach((speed, j) => {
      speed.y -= 5.5 * dt;
      speed.multiplyScalar(Math.max(0, 1 - 0.8 * dt));
      positions[j * 3] += speed.x * dt;
      positions[j * 3 + 1] += speed.y * dt;
      positions[j * 3 + 2] += speed.z * dt;
    });
    attribute.needsUpdate = true;
    burst.points.material.opacity = Math.max(0, 1 - burst.life / burst.duration);
    if (burst.life >= burst.duration) {
      scene.remove(burst.points);
      burst.points.geometry.dispose();
      burst.points.material.dispose();
      bursts.splice(i, 1);
    }
  }
}

function toast(message) {
  toastElement.textContent = message;
  toastElement.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastElement.classList.remove('show'), 2600);
}

function setFlash(alpha) {
  flashElement.style.opacity = String(alpha);
}

// The companion's words, transcribed in a bubble above his head. The lines are
// the same Kazakh clips that are played, so a child who cannot hear (or cannot
// read yet, with a grown-up) still sees what was said.
const speechElement = document.getElementById('speech');
const speechText = document.getElementById('speechText');
const speechAnchor = new THREE.Vector3();
const speechLines = {
  greet: 'Сәлем! Қалайсың?',
  mission: 'Бүгінгі миссия — кілтті табу және қамал есігін ашу. Кілт осы аралда бір жерде.',
  key: 'Кілт қайда? Айнала қара, кілтті тап.',
  mine: 'Міне!',
  alga: 'Алға! Алға!',
  qyzyl: 'Қызыл жолмен жүр.',
  zharai: 'Жарайсың!',
  barekeldy: 'Бәрекелді!',
  massagan: 'Мәссаған!',
  tamasha: 'Тамаша!',
  keremet: 'Керемет!',
  qaitala: 'Қайталап көр.',
  durys: 'Дұрыс!',
  al: 'Жарайсың! Кілтті ал да, қамалға кір.',
  durys_emas: 'Дұрыс емес, қайталап көр.',
  hall: 'Жарайсың! Қамалға кірдің. Порталға кір, келесі деңгейге өт.',
  hint: 'Кілт ағаштардың бірінде. Айнала қара.',
};
let speechTimer = 0;
let speechShown = false;

// Inside a headset the page's HTML is not drawn at all, so the same words are
// also painted on a board that floats above the companion in the 3D world.
const bubbleCanvas = document.createElement('canvas');
bubbleCanvas.width = 512;
bubbleCanvas.height = 256;
const bubbleContext = bubbleCanvas.getContext('2d');
const bubbleTexture = new THREE.CanvasTexture(bubbleCanvas);
bubbleTexture.colorSpace = THREE.SRGBColorSpace;
const bubbleBoard = new THREE.Sprite(new THREE.SpriteMaterial({
  map: bubbleTexture, transparent: true, depthTest: false,
}));
bubbleBoard.scale.set(2.4, 1.2, 1);
bubbleBoard.position.set(0, 2.1, 0);
bubbleBoard.renderOrder = 20;
bubbleBoard.visible = false;
companion.group.add(bubbleBoard);

function drawBubble(text) {
  const width = bubbleCanvas.width;
  const height = bubbleCanvas.height;
  bubbleContext.clearRect(0, 0, width, height);
  bubbleContext.fillStyle = 'rgba(255, 255, 255, 0.96)';
  bubbleContext.beginPath();
  if (bubbleContext.roundRect) bubbleContext.roundRect(8, 8, width - 16, height - 16, 36);
  else bubbleContext.rect(8, 8, width - 16, height - 16);
  bubbleContext.fill();
  bubbleContext.strokeStyle = '#e3c6dd';
  bubbleContext.lineWidth = 8;
  bubbleContext.stroke();
  bubbleContext.fillStyle = '#3d2a3a';
  bubbleContext.font = 'bold 42px system-ui, sans-serif';
  bubbleContext.textAlign = 'center';
  bubbleContext.textBaseline = 'middle';
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const tryLine = line ? line + ' ' + word : word;
    if (bubbleContext.measureText(tryLine).width > width - 64 && line) {
      lines.push(line);
      line = word;
    } else {
      line = tryLine;
    }
  }
  if (line) lines.push(line);
  const lineHeight = 50;
  lines.forEach((wordsLine, i) => {
    const y = height / 2 + (i - (lines.length - 1) / 2) * lineHeight;
    bubbleContext.fillText(wordsLine, width / 2, y);
  });
  bubbleTexture.needsUpdate = true;
}

function hideSpeech() {
  speechShown = false;
  speechElement.hidden = true;
}

onVoiceLine((name) => {
  // The colour round says ask_*/quiz_* lines: its question is already written on
  // the card, so the bubble shows the same words instead of going blank.
  const question = colourRound.isOpen() ? document.getElementById('colourPrompt').textContent : '';
  const text = name ? speechLines[name] || question : null;
  if (!text) {
    hideSpeech();
    return;
  }
  speechText.textContent = text;
  drawBubble(text);
  speechElement.hidden = false;
  speechShown = true;
  // Sound can be held back until the first tap; the bubble still fades on time.
  clearTimeout(speechTimer);
  speechTimer = setTimeout(hideSpeech, 12000); // the long mission line is still being said
});

// Follow the head on screen; the bubble disappears when it is behind the child.
function updateSpeechBubble() {
  // The HTML bubble on a flat screen, the 3D board inside a headset: never both.
  bubbleBoard.visible = speechShown && renderer.xr.isPresenting;
  if (!speechShown) return;
  if (renderer.xr.isPresenting) {
    speechElement.hidden = true;
    return;
  }
  companion.head.getWorldPosition(speechAnchor);
  speechAnchor.y += 0.5;
  speechAnchor.project(camera);
  if (speechAnchor.z > 1) {          // the companion is behind the child: nothing to point at
    speechElement.hidden = true;
    return;
  }
  // Keep the words inside the screen: when his head turns out of the frame the
  // bubble slides to the nearest edge instead of disappearing with the voice.
  const x = Math.min(Math.max((speechAnchor.x * 0.5 + 0.5) * window.innerWidth, 145), window.innerWidth - 145);
  const y = Math.min(Math.max((-speechAnchor.y * 0.5 + 0.5) * window.innerHeight, 150), window.innerHeight - 20);
  speechElement.hidden = false;
  speechElement.style.left = `${x}px`;
  speechElement.style.top = `${y}px`;
}

let phase = 'search';
let hasKey = false;
let finished = false;
let lockedCooldown = 0;
let plungeTime = 0;
let wrongCooldown = 0;
const glide = { t: 0, speed: 1.9 };
const doorPosition = new THREE.Vector3();
const forward = new THREE.Vector3();
const headForward = new THREE.Vector3();
const headRight = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);

const keys = new Set();
window.addEventListener('keydown', (event) => {
  keys.add(event.code);
  unlockAudio();
  if (!audio) ensureAudio();
  if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
});
window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});
window.addEventListener('blur', () => keys.clear());
window.addEventListener('pointerdown', () => {
  unlockAudio();
  ensureAudio();
}, { once: true });

const padKeys = new Set();
document.querySelectorAll('[data-hold]').forEach((button) => {
  const action = button.dataset.hold;
  const press = (event) => {
    event.preventDefault();
    unlockAudio();
    ensureAudio();
    padKeys.add(action);
    button.classList.add('is-held');
    try {
      button.setPointerCapture(event.pointerId);
    } catch (error) {
      console.warn('Could not capture pointer, holding still works', error);
    }
  };
  const release = () => {
    padKeys.delete(action);
    button.classList.remove('is-held');
  };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('contextmenu', (event) => event.preventDefault());
});
window.addEventListener('blur', () => {
  padKeys.clear();
  document.querySelectorAll('.pad-btn.is-held').forEach((button) => button.classList.remove('is-held'));
});

// Look around: drag with the mouse, or drag on the right half of the screen on
// a phone. The round buttons keep their own touches, so only the sky and the
// ground turn, never the buttons.
const LOOK_MOUSE = 0.0026;
const LOOK_TOUCH = 0.0045;
const PITCH_MIN = -1.0;
const PITCH_MAX = 0.9;
let pitch = -0.035;
let lookPointer = null;
let lookX = 0;
let lookY = 0;

canvas.addEventListener('pointerdown', (event) => {
  if (lookPointer !== null) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (event.pointerType !== 'mouse' && event.clientX <= window.innerWidth / 2) return;
  lookPointer = event.pointerId;
  lookX = event.clientX;
  lookY = event.clientY;
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch (error) {
    console.warn('Could not capture the look pointer', error);
  }
});

canvas.addEventListener('pointermove', (event) => {
  if (event.pointerId !== lookPointer) return;
  const sensitivity = event.pointerType === 'mouse' ? LOOK_MOUSE : LOOK_TOUCH;
  const dx = event.clientX - lookX;
  const dy = event.clientY - lookY;
  lookX = event.clientX;
  lookY = event.clientY;
  if (phase !== 'search' && phase !== 'hall' && phase !== 'forest') return;
  player.group.rotation.y -= dx * sensitivity;
  pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, pitch - dy * sensitivity));
});

function endLook(event) {
  if (event.pointerId !== lookPointer) return;
  lookPointer = null;
}

canvas.addEventListener('pointerup', endLook);
canvas.addEventListener('pointercancel', endLook);
canvas.addEventListener('lostpointercapture', endLook);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
const speed = 5.4;
const turnSpeed = 2.6;
player.group.rotation.y = Math.PI;

// Intro, one sentence at a time: the companion says hello, asks how the child
// is, then gives today's mission. The child answers «Жақсы!» with the mic.
// intro: 'greet' → 'mission' → 'ask' (the key hunt).
let intro = 'greet';

function startGreeting() {
  intro = 'greet';
  // The colours are already done in this round: go straight to the key mission.
  if (coloursDone) {
    startMission();
    return;
  }
  missionText.textContent = 'Түстерді тап!';
  toast('Сәлем! Түстерді тап!');
  // The crystal challenge waits until the whole greeting has been said, so the
  // greeting and the first colour question never talk over each other.
  let coloursOpened = false;
  const openColours = () => {
    if (coloursOpened || coloursDone || phase !== 'search') return;
    coloursOpened = true;
    colourRound.start();
  };
  playLine('greet', openColours);
  // The browser may hold the sound until the child taps: never get stuck here.
  setTimeout(openColours, 8000);
}

function startMission() {
  if (intro !== 'greet') return;
  intro = 'mission';
  missionText.textContent = 'Бүгінгі миссия: кілтті тап';
  toast('Кілт осы аралда!');
  playLine('mission', beginKeyHunt);
  // The browser may hold the sound until the child taps: never get stuck here.
  setTimeout(beginKeyHunt, 15000);
}

function beginKeyHunt() {
  if (intro !== 'mission') return;
  intro = 'ask';
  missionText.textContent = 'Кілт қайда?';
  playLine('key');
}

startGreeting();

function planarDistance(position, target) {
  return Math.hypot(position.x - target.x, position.z - target.z);
}

// Picking the key up: the child walks into it, or in VR points a controller at it
// and presses the trigger.
function collectKey() {
  hasKey = true;
  world.key.collect();
  keyBadge.classList.add('found');
  missionText.textContent = 'Алға!';
  toast('Міне!');
  // The child often says the phrase while standing at the key, so the praise is
  // still speaking: do not cut it with «Міне!».
  if (!isLinePlaying()) playLine('mine');
  chime([784, 988, 1319]);
}

function enterCastle() {
  phase = 'entering';
  world.openDoor();
  missionText.textContent = 'Алға!';
  chime([523, 659, 784, 1047]);
  setTimeout(() => setFlash(1), 950);
  setTimeout(arriveHall, 1500);
}

function arriveHall() {
  const position = player.group.position;
  position.copy(level2.hallStart);
  position.y = 0;
  player.group.rotation.y = Math.PI;
  scene.fog.color.set(0x0b1018);
  scene.fog.near = 9;
  scene.fog.far = 50;
  level2.slamDoor();
  companion.group.position.copy(level2.hallCompanion);
  companion.group.rotation.y = 0;
  // The child made it in: fireworks, congratulations, and where to go next.
  launchFireworks();
  playLine('hall');
  missionText.textContent = 'Порталға кір';
  toast('Порталға кір');
  setFlash(0);
  phase = 'hall';
  glide.t = 0.9;
  setTimeout(thud, 380);
}

function startPlunge() {
  phase = 'plunge';
  plungeTime = 0;
  playLine('alga');
}

function arriveForest() {
  const position = player.group.position;
  position.copy(level2.forestStart);
  position.y = 0;
  player.group.rotation.y = Math.PI;
  scene.fog.color.set(0x08131f);
  scene.fog.near = 14;
  scene.fog.far = 78;
  camera.fov = 68;
  camera.updateProjectionMatrix();
  companion.group.position.copy(level2.forestCompanion);
  companion.group.rotation.y = 0;
  setFlash(0);
  phase = 'forest';
  playLine('qyzyl');
  missionText.textContent = 'Қызыл жолмен жүр';
  toast('Қызыл жолмен жүр');
}

function finishGame() {
  phase = 'win';
  playLine('zharai');
  missionText.textContent = 'Жарайсың!';
  toast('Жарайсың!');
  chime([523, 659, 784, 1047]);
  setTimeout(() => {
    winElement.hidden = false;
  }, 1200);
}

// Meta Quest: enter an immersive session and steer with the controller sticks.
const vrButton = document.getElementById('vrButton');
if (navigator.xr && navigator.xr.isSessionSupported) {
  navigator.xr.isSessionSupported('immersive-vr').then((ok) => {
    vrButton.hidden = !ok;
    // No headset, no button: the game simply stays in screen mode.
    if (!ok) console.info('Immersive VR is not supported here; the game stays in screen mode.');
  }).catch((error) => console.warn('VR support check failed', error));
} else {
  console.info('WebXR is not available here; the game stays in screen mode.');
}

// In VR the trigger reaches for the key; if there is no key within reach it
// repeats the task, and the grip repeats the Kazakh word. Both are learned by
// trying once, no on-screen labels needed inside the headset.
const vrHead = new THREE.Vector3();
function vrInteract() {
  camera.getWorldPosition(vrHead);
  const keyPosition = world.key.group.position;
  if (!hasKey && keyReady && !world.key.isHidden() && planarDistance(vrHead, keyPosition) < 2.6) {
    collectKey();
  } else {
    repeatLine();
  }
}

vrButton.addEventListener('click', async () => {
  if (!navigator.xr) {
    toast('Бұл құрылғыда VR жоқ');
    return;
  }
  try {
    const session = await navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: ['local-floor', 'bounded-floor'],
    });
    // The camera becomes a child of the player: the rig moves, the headset look stays real.
    player.group.add(camera);
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    session.addEventListener('selectstart', vrInteract);
    session.addEventListener('squeezestart', () => repeatLine());
    session.addEventListener('end', () => {
      player.group.remove(camera);
      document.body.classList.remove('in-vr');
      camera.fov = 68;
      camera.updateProjectionMatrix();
      vrButton.hidden = false;
    });
    await renderer.xr.setSession(session);
    // Three.js asks for the local-floor space by default, so walking in the room
    // moves the child 1:1; the phone/laptop controls are hidden meanwhile.
    document.body.classList.add('in-vr');
    vrButton.hidden = true;
    toast('Контроллермен жүр');
  } catch (error) {
    console.warn('VR session failed', error);
    toast('VR ашылмады');
  }
});

function animate() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const time = clock.elapsedTime;

  let walk = 0;
  let turn = 0;
  let strafe = 0;
  const controlsOn = (phase === 'search' || phase === 'hall' || phase === 'forest') && !colourRound.isOpen();
  if (controlsOn) {
    if (keys.has('KeyW') || keys.has('ArrowUp') || padKeys.has('forward')) walk += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown') || padKeys.has('back')) walk -= 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft') || padKeys.has('left')) turn += 1;
    if (keys.has('KeyD') || keys.has('ArrowRight') || padKeys.has('right')) turn -= 1;
    // Quest Touch: the LEFT stick walks (Y = forward/back, X = strafe), the RIGHT stick turns.
    if (renderer.xr.isPresenting) {
      const sticks = readSticks(renderer.xr.getSession());
      walk += sticks.walk;
      strafe += sticks.strafe;
      turn += sticks.turn;
    }
  }

  if (turn !== 0) player.group.rotation.y += turn * turnSpeed * dt;
  forward.set(Math.sin(player.group.rotation.y), 0, Math.cos(player.group.rotation.y));
  const moving = walk !== 0 || strafe !== 0;
  const position = player.group.position;

  if (renderer.xr.isPresenting && moving) {
    // Head-oriented: walk where the headset looks and strafe across that view, not where the hand points.
    camera.updateWorldMatrix(true, false);
    camera.getWorldDirection(headForward);
    headForward.y = 0;
    if (headForward.lengthSq() < 1e-6) headForward.copy(forward); else headForward.normalize();
    headRight.crossVectors(headForward, upAxis).normalize();
    const amount = Math.hypot(walk, strafe);
    const scale = amount > 1 ? 1 / amount : 1;
    // Slower than the flat-screen walk: sliding fast in VR makes people queasy.
    const vrSpeed = speed * 0.5 * scale;
    position.addScaledVector(headForward, walk * vrSpeed * dt);
    position.addScaledVector(headRight, strafe * vrSpeed * dt);
  } else if (moving) {
    position.addScaledVector(forward, walk * speed * dt);
  }
  if (glide.t > 0) {
    glide.t -= dt;
    position.addScaledVector(forward, glide.speed * dt);
  }

  if (phase === 'forest' || phase === 'win') {
    level2.keepInside(position, 'forest');
  } else if (phase === 'hall' || phase === 'plunge') {
    level2.keepInside(position, 'hall');
  } else {
    world.keepInside(position, 0.45);
  }

  companion.update(dt, moving, time);
  level2.update(dt, time);
  updateFireworks(dt);
  if (phase === 'search' || phase === 'entering') world.update(dt, time);

  if (phase === 'search') {
    // Walking up to the companion after his mission opens the colour round.
    const companionDistance = planarDistance(position, companion.group.position);
    if (!coloursDone && intro === 'ask' && !colourRound.isOpen() && companionDistance < 2.8) {
      colourRound.start();
    }

    // Walking up to the right tree: the key is already hanging there, just say where it is.
    if (!keyShown && !keyReady && intro === 'ask' && planarDistance(position, keyTree) < 3.5) {
      keyShown = true;
      missionText.textContent = 'Кілт ағашта!';
      toast('Ағаш! Айт: «таптым ағашта»');
      playLine('hint');
    }

    const keyPosition = world.key.group.position;
    // The key cannot be picked up from the tree: only after the right answer.
    if (!hasKey && keyReady && !world.key.isHidden() && planarDistance(position, keyPosition) < 1.7) {
      collectKey();
    }

    world.doorTarget.getWorldPosition(doorPosition);
    const doorDistance = planarDistance(position, doorPosition);

    if (!hasKey) {
      lockedCooldown -= dt;
      if (doorDistance < 3.1 && lockedCooldown <= 0) {
        toast('Кілт қайда?');
        chime([196, 165], 0.16);
        lockedCooldown = 5;
      }
    } else if (doorDistance < 3.1) {
      enterCastle();
    }
  }

  if (phase === 'hall' && planarDistance(position, level2.portalCenter) < 3.4) {
    startPlunge();
  }

  if (phase === 'plunge') {
    plungeTime += dt;
    const target = level2.portalCenter;
    const dx = target.x - position.x;
    const dz = target.z - position.z;
    const distance = Math.hypot(dx, dz) || 1;
    if (distance > 0.6) {
      position.x += (dx / distance) * 5.2 * dt;
      position.z += (dz / distance) * 5.2 * dt;
    }
    camera.fov = Math.min(96, 68 + plungeTime * 34);
    camera.updateProjectionMatrix();
    if (plungeTime > 0.9) setFlash(1);
    if (plungeTime > 1.4) arriveForest();
  }

  if (phase === 'forest') {
    wrongCooldown -= dt;
    if (planarDistance(position, level2.redGate) < 2.5) {
      if (!finished) {
        finished = true;
        finishGame();
      }
    } else if (planarDistance(position, level2.blueGate) < 2.5 && wrongCooldown <= 0) {
      wrongCooldown = 4.5;
      playLine('qaitala');
      toast('Қайталап көр');
      chime([196, 165], 0.16);
      position.z += 2.8;
    }
  }

  // In VR the headset pose drives the camera; the flat screen view is skipped.
  if (!renderer.xr.isPresenting) {
    const bob = moving ? Math.sin(time * 9) * 0.03 : 0;
    const eyeY = position.y + EYE_HEIGHT + bob;
    camera.position.set(position.x, eyeY, position.z);
    if (phase === 'plunge') {
      camera.lookAt(level2.portalCenter.x, level2.portalCenter.y, level2.portalCenter.z);
    } else {
      const viewDistance = 10;
      const cosPitch = Math.cos(pitch);
      camera.lookAt(
        position.x + forward.x * cosPitch * viewDistance,
        eyeY + Math.sin(pitch) * viewDistance,
        position.z + forward.z * cosPitch * viewDistance,
      );
    }
  }

  updateSpeechBubble();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.oynova = {
  player,
  companion,
  speechBoard: bubbleBoard,
  world,
  level2,
  camera,
  colourRound,
  state: {
    phase: () => phase,
    hasKey: () => hasKey,
    keyReady: () => keyReady,
    finished: () => finished,
    intro: () => intro,
    coloursDone: () => coloursDone,
    quizDone: () => quizDone,
  },
};

requestAnimationFrame(() => {
  document.getElementById('loading')?.classList.add('hide');
});
