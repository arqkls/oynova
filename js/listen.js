// Let the child SAY the answer: listen to the microphone, find the option among the answers.
// Two ways, picked automatically:
//   - WORKSPACE link (https://kitan-a.com/frp/sNN/proxy/8000/...): record and send to the class speech model (GigaAM).
//   - PUBLIC link (https://kitan-a.com/frp/pub/...): the class models cannot be called there (they need the login),
//     so the browser's own speech recognition is used. Some browsers (for example the headset browser) do not have
//     it: then canListen() is false, the 🎤 button is hidden and tapping the pictures still works.
//   import { canListen, listen, pickOption } from './listen.js';
//   if (canListen()) { const text = await listen(3, 'kk'); const i = pickOption(text, ['бір', 'екі', ['үш', '3']]); }
const API = location.pathname.split('/proxy/')[0] + '/proxy/19040/v1';
const BrowserSpeech = window.SpeechRecognition || window.webkitSpeechRecognition;

// Only this link can reach the class model: it sits under the workspace login.
function canUseClassModel() {
  return location.pathname.includes('/proxy/') && !!(navigator.mediaDevices && window.MediaRecorder);
}

export function canListen() {
  return canUseClassModel() || !!BrowserSpeech;
}

// The browser's own recogniser: no login and no class model, but some browsers lack it.
function listenInBrowser(seconds, lang) {
  return new Promise((resolve, reject) => {
    const speech = new BrowserSpeech();
    speech.lang = lang === 'kk' ? 'kk-KZ' : 'en-US';
    speech.interimResults = false;
    speech.maxAlternatives = 1;
    let text = '';
    let failure = null;
    speech.onresult = (e) => { text = e.results[0][0].transcript; };
    speech.onerror = (e) => { failure = new Error('speech recognition: ' + e.error); };
    speech.onend = () => {
      clearTimeout(timer);
      if (failure) reject(failure); else resolve(text.trim());
    };
    const timer = setTimeout(() => { try { speech.stop(); } catch (error) { console.warn('stop failed', error); } }, seconds * 1000);
    speech.start();
  });
}

// Return the text the microphone heard ('' if nothing).
export async function listen(seconds = 3, lang = 'kk') {
  if (!canUseClassModel()) return listenInBrowser(seconds, lang);
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });   // the browser asks the user once
  const rec = new MediaRecorder(stream);
  const parts = [];
  rec.ondataavailable = (e) => parts.push(e.data);
  const stopped = new Promise((r) => (rec.onstop = r));
  rec.start();
  await new Promise((r) => setTimeout(r, seconds * 1000));
  rec.stop(); await stopped;
  stream.getTracks().forEach((t) => t.stop());
  const form = new FormData();
  form.append('file', new Blob(parts, { type: rec.mimeType || 'audio/webm' }), 'answer.webm');
  form.append('model', lang === 'kk' ? 'gigaam' : 'whisper');      // GigaAM is the best for Kazakh
  form.append('language', lang);
  const r = await fetch(API + '/audio/transcriptions', { method: 'POST', body: form });
  if (!r.ok) throw new Error('speech recognition: HTTP ' + r.status);
  return ((await r.json()).text || '').trim();
}

// Which option did the child say? Short words are hard to hear (a test heard «үш» as «ыш», «екі» as «эка»),
// so we take the option with the most similar spelling. Returns the option number, or -1 (then ask to tap).
export function pickOption(text, options, minScore = 0.5) {
  const norm = (s) => s.toLowerCase()
    .replace(/[әа]/g, 'а').replace(/[іиы]/g, 'и').replace(/[үұу]/g, 'у').replace(/[өо]/g, 'о')
    .replace(/қ/g, 'к').replace(/ғ/g, 'г').replace(/ң/g, 'н').replace(/һ/g, 'х').replace(/[её]/g, 'е').replace(/э/g, 'е')
    .replace(/[^\p{L}\p{N} ]/gu, ' ').trim();
  const words = norm(text).split(/\s+/).filter(Boolean);
  if (!words.length) return -1;
  const sim = (a, b) => {                         // 1 = the same, 0 = nothing the same (edit distance)
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return 1 - d[a.length][b.length] / Math.max(a.length, b.length, 1);
  };
  let best = -1, bestScore = minScore;
  options.forEach((o, i) => {                    // an option can be one word or a list: ['three', '3']
    for (const alt of (Array.isArray(o) ? o : [o])) {
      const target = norm(String(alt));
      for (const w of [...words, words.join(' ')]) { const s = sim(w, target); if (s > bestScore || (s === bestScore && best < 0)) { bestScore = s; best = i; } }
    }
  });
  return best;
}
