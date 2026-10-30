// Kazakh voice lines, generated once with the class speech model (language kk).
// The browser blocks sound until the child touches the page, so the first line is
// held back and played on the first key press or tap.
const files = {
  greet: 'assets/kazakh/salem.wav',
  mission: 'assets/kazakh/mission.wav',
  key: 'assets/kazakh/kilttin_orny.wav',
  mine: 'assets/kazakh/mine.wav',
  alga: 'assets/kazakh/alga.wav',
  qyzyl: 'assets/kazakh/qyzyl.wav',
  zharai: 'assets/kazakh/zharai_once.wav',
  barekeldy: 'assets/kazakh/barekeldy.wav',
  massagan: 'assets/kazakh/massagan.wav',
  tamasha: 'assets/kazakh/tamasha.wav',
  keremet: 'assets/kazakh/keremet.wav',
  qaitala: 'assets/kazakh/qaitala.wav',
  durys: 'assets/kazakh/durys.wav',
  al: 'assets/kazakh/al.wav',
  durys_emas: 'assets/kazakh/durys_emas.wav',
  hall: 'assets/kazakh/hall.wav',
  hint: 'assets/kazakh/hint.wav',
  // One spoken line for every colour: the lesson asks to find it, the quiz asks where it is.
  ask_qyzyl: 'assets/kazakh/ask_qyzyl.wav',
  ask_kok: 'assets/kazakh/ask_kok.wav',
  ask_sary: 'assets/kazakh/ask_sary.wav',
  ask_zhassyl: 'assets/kazakh/ask_zhassyl.wav',
  ask_aq: 'assets/kazakh/ask_aq.wav',
  ask_qara: 'assets/kazakh/ask_qara.wav',
  quiz_qyzyl: 'assets/kazakh/quiz_qyzyl.wav',
  quiz_kok: 'assets/kazakh/quiz_kok.wav',
  quiz_sary: 'assets/kazakh/quiz_sary.wav',
  quiz_zhassyl: 'assets/kazakh/quiz_zhassyl.wav',
  quiz_aq: 'assets/kazakh/quiz_aq.wav',
  quiz_qara: 'assets/kazakh/quiz_qara.wav',
};

const clips = {};
// Extra speed on top of the recorded files: the child found the voice too slow.
// Pitch is kept, so it is the same voice, just quicker.
const RATE = 1.12;
const lineListeners = [];
let unlocked = false;
let pending = null;
let pendingEnd = null;
let current = null;
let playing = null;

// The page shows every spoken line as a bubble over the companion's head:
// it gets the line name when speech starts and null when it finishes.
export function onVoiceLine(callback) {
  lineListeners.push(callback);
}

function announce(name) {
  for (const callback of lineListeners) callback(name);
}

export function unlockAudio() {
  unlocked = true;
  if (pending) {
    const name = pending;
    const end = pendingEnd;
    pending = null;
    pendingEnd = null;
    playLine(name, end);
  }
}

// onEnded (optional) runs when this line finishes: the intro uses it to go on
// to the next sentence. It is dropped for repeats, so a repeat never skips ahead.
export function playLine(name, onEnded = null) {
  const file = files[name];
  if (!file) {
    console.warn('Unknown voice line', name);
    return;
  }
  current = name;
  announce(name);
  if (!unlocked) {
    pending = name;
    pendingEnd = onEnded;
    return;
  }
  let clip = clips[name];
  if (!clip) {
    clip = clips[name] = new Audio(file);
    // Hide the bubble only if this clip is still the line that is speaking.
    clip.addEventListener('ended', () => {
      if (clips[current] === clip) announce(null);
    });
  }
  // Only one voice at a time: a new line stops the one that is still speaking.
  if (playing && playing !== clip) {
    playing.pause();
    playing.currentTime = 0;
  }
  playing = clip;
  clip.onended = onEnded;
  clip.preservesPitch = true;
  clip.playbackRate = RATE;
  clip.currentTime = 0;
  clip.play().catch((error) => console.warn('Voice line did not play', name, error));
}

// Is a voice line being said right now? Used so a short «Міне!» does not cut
// «Дұрыс! Жарайсың! Кілтті ал…» when the child takes the key while it is still speaking.
export function isLinePlaying() {
  return !!playing && !playing.paused && !playing.ended;
}

// The child asked "say it again": play the line that is speaking right now once more.
export function repeatLine() {
  if (!current) return false;
  playLine(current);
  return true;
}
