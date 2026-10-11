// Little sound effects made with the Web Audio API, plus the cutscene voices and music
// (audio/*.mp3, made by tools/make-audio.py).
// iPads only allow sound after the first tap, so unlock() is called on the first touch.

let ac = null;
let muted = false;
let master = null;    // voices and music go through here so the mute button turns them off too
let musicGain = null;
let analyser = null;  // listens to the voice so the talking character can move its mouth

function context() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ac.destination);
    musicGain = ac.createGain();
    musicGain.connect(master);
    analyser = ac.createAnalyser();
    analyser.fftSize = 512;
    analyser.connect(master);
  }
  return ac;
}

export function unlockAudio() {
  if (context() && ac.state === 'suspended') ac.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 1;
}

function tone(freq, endFreq, dur, type = 'square', vol = 0.12, delay = 0) {
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(ac.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  jump() { tone(320, 640, 0.15, 'square', 0.08); },
  walljump() { tone(260, 720, 0.14, 'square', 0.08); },
  grab() { tone(220, 440, 0.1, 'triangle', 0.14); },
  vault() { tone(420, 760, 0.1, 'triangle', 0.1); },
  roll() { tone(160, 90, 0.18, 'sine', 0.14); },
  spring() { tone(200, 900, 0.35, 'sine', 0.2); },
  hurt() { tone(300, 80, 0.4, 'sawtooth', 0.12); },
  checkpoint() { tone(660, 0, 0.12, 'triangle', 0.15); tone(990, 0, 0.2, 'triangle', 0.15, 0.1); },
  gem() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0, 0.25, 'triangle', 0.15, i * 0.08)); },
  click() { tone(500, 700, 0.06, 'triangle', 0.1); },
  oops() { tone(400, 200, 0.25, 'triangle', 0.15); tone(300, 120, 0.4, 'triangle', 0.15, 0.2); },
  flap() { tone(180, 120, 0.12, 'sine', 0.12); },
  sparkle() { tone(1200, 1800, 0.12, 'sine', 0.1); },
  victory() {
    [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0, 0.3, 'triangle', 0.15, i * 0.15));
  },
};

// ---------- Sound files ----------
const sounds = new Map(); // url -> Promise of AudioBuffer (or null if it couldn't load)

export function loadSound(url) {
  if (!sounds.has(url)) {
    const p = fetch(url)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      // The callback form works on older iPads too
      .then(data => new Promise((ok, fail) => context().decodeAudioData(data, ok, fail)))
      .catch(() => { sounds.delete(url); return null; });
    sounds.set(url, p);
  }
  return sounds.get(url);
}

let voice = null;
export function playVoice(buffer) {
  stopVoice();
  if (!buffer || !context()) return;
  voice = ac.createBufferSource();
  voice.buffer = buffer;
  voice.connect(analyser);
  voice.start();
}
export function stopVoice() {
  if (voice) { try { voice.stop(); } catch (e) { /* already stopped */ } }
  voice = null;
}

// How loud the voice is right now, 0 to 1.
const wave = new Uint8Array(512);
export function voiceLevel() {
  if (!analyser || !voice) return 0;
  analyser.getByteTimeDomainData(wave);
  let sum = 0;
  for (let i = 0; i < wave.length; i++) { const v = (wave[i] - 128) / 128; sum += v * v; }
  return Math.min(1, Math.sqrt(sum / wave.length) * 5);
}

// Music files hold the loop twice; the second copy is the one that repeats (see make-audio.py).
let music = null;
export function playMusic(name, buffer, loop) {
  if (music && music.name === name) return;
  stopMusic();
  if (!buffer || !context()) return;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  // Exactly one copy long, even if this browser trimmed the file's ends a little differently
  src.loopEnd = Math.min(loop * 2, buffer.duration);
  src.loopStart = src.loopEnd - loop;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, ac.currentTime);
  g.gain.linearRampToValueAtTime(1, ac.currentTime + 0.6);
  src.connect(g);
  g.connect(musicGain);
  src.start();
  music = { name, src, g };
}
export function stopMusic(fade = 0.8) {
  if (!music) return;
  const { src, g } = music;
  const t = ac.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.linearRampToValueAtTime(0, t + fade);
  src.stop(t + fade + 0.05);
  music = null;
}
export function musicVolume(v) {
  if (!musicGain) return;
  musicGain.gain.cancelScheduledValues(ac.currentTime);
  musicGain.gain.setValueAtTime(musicGain.gain.value, ac.currentTime);
  musicGain.gain.linearRampToValueAtTime(v, ac.currentTime + 0.4);
}
