// The colour round: the companion asks for one Kazakh colour and the child
// taps the matching crystal. Three big crystals are always shown, so a child
// who cannot read yet only has to look and tap. Data comes from questions.json
// (the same file the quiz and the voice kit use).
import { playLine, unlockAudio } from './kazakh.js';

// The next question waits for the praise to finish. This is only the fallback for
// when the clip cannot play at all (sound blocked), so the round cannot get stuck.
const RIGHT_PAUSE = 6000;
const WRONG_PAUSE = 650;

// Different praise every time, so «Жарайсың!» does not repeat for every crystal.
const PRAISE = ['zharai', 'barekeldy', 'massagan', 'tamasha', 'keremet'];
let praiseBag = [];
let lastPraise = null;
function nextPraise() {
  if (!praiseBag.length) {
    praiseBag = shuffled(PRAISE);
    if (praiseBag[0] === lastPraise) praiseBag.push(praiseBag.shift());
  }
  lastPraise = praiseBag.shift();
  return lastPraise;
}

function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createColourRound({ onComplete = () => {}, onOpen = () => {}, onError = null, length = 0, mode = 'learn' } = {}) {
  const root = document.getElementById('colourRound');
  const promptText = document.getElementById('colourPrompt');
  const shelf = document.getElementById('colourCrystals');
  const pips = document.getElementById('colourPips');
  const listen = document.getElementById('colourListen');

  let colours = [];
  let order = [];
  let step = 0;
  let busy = false;
  let opened = false;
  let done = false;
  let ready = false;
  let failed = false;

  function report(message) {
    failed = true;
    if (onError) onError(message);
    else console.error(message);
  }

  async function load() {
    if (ready) return true;
    if (failed) return false;
    try {
      const response = await fetch('questions.json');
      if (!response.ok) throw new Error(`questions.json: HTTP ${response.status}`);
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.questions;
      if (!Array.isArray(list) || list.length < 3) throw new Error('questions.json needs at least 3 colours');
      colours = list;
      ready = true;
      return true;
    } catch (error) {
      report(`Түстер жүктелмеді: ${error.message}`);
      return false;
    }
  }

  function drawPips() {
    pips.textContent = '';
    for (let i = 0; i < order.length; i += 1) {
      const pip = document.createElement('span');
      pip.className = i < step ? 'colour-pip done' : 'colour-pip';
      pips.append(pip);
    }
  }

  function flyToBadge(button) {
    const gem = button.querySelector('.crystal-gem');
    const bag = document.getElementById('keyBadge');
    if (!gem || !bag) return;
    const from = gem.getBoundingClientRect();
    const to = bag.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'crystal-fly';
    fly.style.left = `${from.left}px`;
    fly.style.top = `${from.top}px`;
    fly.style.width = `${from.width}px`;
    fly.style.height = `${from.height}px`;
    fly.style.background = gem.style.getPropertyValue('--gem');
    document.body.append(fly);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const scale = Math.max(0.18, to.width / Math.max(from.width, 1));
    requestAnimationFrame(() => {
      fly.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      fly.style.opacity = '0.35';
    });
    setTimeout(() => fly.remove(), 900);
  }

  function finish() {
    opened = false;
    done = true;
    root.hidden = true;
    document.body.classList.remove('colour-open');
    // The praise was already said for the sixth crystal: do not say it twice.
    onComplete();
  }

  function choose(colour, target, button) {
    if (busy) return;
    unlockAudio(); // a tap is what lets the browser play sound at all
    if (colour.id === target.id) {
      busy = true;
      unlockAudio();
      button.classList.add('is-right');
      flyToBadge(button);
      step += 1;
      drawPips();
      let advanced = false;
      const advance = () => {
        if (advanced) return;
        advanced = true;
        busy = false;
        if (step >= order.length) finish();
        else render();
      };
      // Say the praise fully, then go on: a fixed pause cut the last word off.
      playLine(nextPraise(), advance);
      setTimeout(advance, RIGHT_PAUSE);
      return;
    }
    button.classList.add('is-wrong');
    playLine('qaitala');
    const right = [...shelf.children].find((element) => element.dataset.id === target.id);
    if (right) right.classList.add('is-hint');
    setTimeout(() => button.classList.remove('is-wrong'), WRONG_PAUSE);
  }

  // The lesson says "find the yellow crystal"; the check asks "where is the yellow crystal?".
  function questionFor(colour) {
    if (mode !== 'quiz') return colour.ask;
    const name = colour.kk.charAt(0).toUpperCase() + colour.kk.slice(1);
    return `${name} кристалл қайда?`;
  }

  // The recorded Kazakh line for this card: ask_* in the lesson, quiz_* in the check.
  function lineFor(colour) {
    const key = colour.id.replace('colour_', '');
    return `${mode === 'quiz' ? 'quiz' : 'ask'}_${key}`;
  }

  // Big speaker button: the child did not hear the word, so say it again.
  if (listen) {
    listen.addEventListener('click', () => {
      if (!opened || done || step >= order.length) return;
      unlockAudio();
      playLine(lineFor(order[step]));
    });
  }

  function render() {
    const target = order[step];
    const others = shuffled(colours.filter((colour) => colour.id !== target.id)).slice(0, 2);
    promptText.textContent = questionFor(target);
    shelf.textContent = '';
    for (const colour of shuffled([target, ...others])) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'crystal';
      button.dataset.id = colour.id;
      button.setAttribute('aria-label', colour.kk);

      const gem = document.createElement('span');
      gem.className = 'crystal-gem';
      gem.style.setProperty('--gem', colour.hex);

      const label = document.createElement('span');
      label.className = 'crystal-name';
      label.textContent = colour.kk;

      button.append(gem, label);
      button.addEventListener('click', () => choose(colour, target, button));
      shelf.append(button);
    }
    drawPips();
    // Say the question out loud as soon as the card appears. Before the first
    // tap the browser keeps it waiting in kazakh.js and plays it on that tap.
    playLine(lineFor(target));
  }

  async function start() {
    // One time only: after the last answer the round is finished for good.
    if (opened || done) return;
    if (!(await load())) return;
    opened = true;
    step = 0;
    busy = false;
    order = shuffled(colours);
    if (length > 0) order = order.slice(0, length);
    root.hidden = false;
    document.body.classList.add('colour-open');
    onOpen();
    render();
  }

  function isOpen() {
    return opened;
  }

  return { start, isOpen, ready: load };
}
