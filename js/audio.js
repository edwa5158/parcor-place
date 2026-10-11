// Little sound effects made with the Web Audio API (no sound files needed).
// iPads only allow sound after the first tap, so unlock() is called on the first touch.

let ac = null;
let muted = false;

export function unlockAudio() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
  }
  if (ac.state === 'suspended') ac.resume();
}

export function setMuted(m) { muted = m; }

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
