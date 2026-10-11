// Cutscenes: story pictures with voices, music, and captions.
// The words, sound files, and timings come from story-data.js (made by tools/make-audio.py).
// Each panel plays one voice clip. When it ends (or you tap) the next panel starts.

import { CUTSCENES, MUSIC, CAST, LOST } from './story-data.js';
import { loadSound, playVoice, stopVoice, voiceLevel, playMusic, stopMusic, musicVolume } from './audio.js';
import { drawDragon } from './dragon.js';
import { drawGem } from './render.js';
import { WORLDS } from './themes.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = k => k * k * (3 - 2 * k);
const wait = ms => new Promise(ok => setTimeout(ok, ms));

export class Cutscene {
  constructor(el) {
    this.el = el;
    this.canvas = el.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.who = el.querySelector('.cut-who');
    this.text = el.querySelector('.cut-text');
    this.caption = el.querySelector('.cut-caption');
    this.loadingEl = el.querySelector('.cut-loading');
    this.running = false;
    this.canvas.addEventListener('pointerdown', () => this.next());
    this.caption.addEventListener('pointerdown', () => this.next());
  }

  // done() is called at the end or on Skip. keepMusic leaves the last song playing afterwards.
  async play(name, dragon, done, { keepMusic = false } = {}) {
    this.panels = CUTSCENES[name];
    this.dragon = dragon;
    this.done = done;
    this.keepMusic = keepMusic;
    this.running = true;
    this.i = 0;
    this.t0 = performance.now();
    this.line = null;
    this.caption.classList.add('hidden');
    this.loadingEl.classList.remove('hidden');
    this.raf = requestAnimationFrame(t => this.frame(t));

    // Load everything first. If it's slow, start anyway; missing clips just play silently on a timer.
    const files = new Set(this.panels.map(p => p.clip));
    for (const p of this.panels) if (p.music) files.add(MUSIC[p.music].file);
    this.buffers = new Map();
    const loads = [...files].map(f => loadSound(f).then(b => { this.buffers.set(f, b); }));
    const run = this.run = {};
    await Promise.race([Promise.all(loads), wait(8000)]);
    if (this.run !== run || !this.running) return;
    this.loadingEl.classList.add('hidden');
    this.caption.classList.remove('hidden');
    this.start(0);
  }

  start(i) {
    this.i = i;
    this.t0 = performance.now();
    this.line = null;
    const p = this.panels[i];
    playVoice(this.buffers.get(p.clip));
    if (p.music) {
      const m = MUSIC[p.music];
      playMusic(p.music, this.buffers.get(m.file), m.loop);
    } else {
      stopMusic();
    }
    musicVolume(0.22); // quieter under the talking
  }

  // Tap: go on to the next picture.
  next() {
    if (!this.running || !this.loadingEl.classList.contains('hidden')) return;
    if (performance.now() - this.t0 < 400) return; // so a double tap doesn't skip two
    if (this.i + 1 < this.panels.length) this.start(this.i + 1);
    else this.finish();
  }

  finish() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
    stopVoice();
    const last = this.panels[this.panels.length - 1];
    if (this.keepMusic && last.music) {
      // Skipped early? Still end on the last panel's song.
      const m = MUSIC[last.music];
      playMusic(last.music, this.buffers.get(m.file), m.loop);
    } else {
      stopMusic();
    }
    musicVolume(1);
    this.done();
  }

  // Where the caption box starts, so nobody stands behind it
  floor(h) {
    if (!this.caption.classList.contains('hidden')) this.captionTop = this.caption.offsetTop;
    return this.captionTop || h * 0.8;
  }

  // Leaving the screen some other way
  stop() {
    if (!this.running) return;
    this.running = false;
    this.run = null;
    cancelAnimationFrame(this.raf);
    stopVoice();
    stopMusic();
    musicVolume(1);
  }

  frame(now) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(t => this.frame(t));
    const loading = !this.loadingEl.classList.contains('hidden');
    const p = this.panels[this.i];
    const t = loading ? 0 : (now - this.t0) / 1000;
    if (!loading && t > p.dur + 0.8) {
      if (this.i + 1 < this.panels.length) this.start(this.i + 1);
      else this.finish();
      return;
    }

    let line = p.lines[0];
    for (const l of p.lines) if (l.t <= t + 0.05) line = l;
    if (line !== this.line && !loading) {
      this.line = line;
      this.who.textContent = CAST[line.who].replace('{name}', this.dragon.name);
      this.who.className = `cut-who ${line.who}`;
      if (line.who === 'dragon') this.who.style.background = this.dragon.body;
      else this.who.style.background = '';
      this.text.textContent = line.text;
    }

    const c = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const speaking = loading || t > (line.t + 0.05) ? line.who : null;
    // Moods for the wizard's face: the line he's saying, or his last one.
    const wiz = p.wizLines || (p.wizLines = p.lines.filter(l => l.who === 'wizard'));
    let mood = (wiz[0] && wiz[0].mood) || 'grumpy';
    for (const l of wiz) if (l.t <= t && l.mood) mood = l.mood;
    const st = {
      w, h, t, p, s: Math.min(h / 7, w / 10), dragon: this.dragon, floor: this.floor(h),
      talking: speaking, level: voiceLevel(), mood,
      cue: name => (p.cues[name] !== undefined && t >= p.cues[name] ? t - p.cues[name] : -1),
    };
    (SCENES[p.scene] || SCENES.sky)(ctx, st);
  }
}

// ---------- The lines for when all the hearts are gone ----------
let lostOrder = [];
export function preloadLost() { LOST.forEach(l => loadSound(l.clip)); }
export function sayLost() {
  if (!lostOrder.length) lostOrder = LOST.map((l, i) => i).sort(() => Math.random() - 0.5);
  const line = LOST[lostOrder.pop()];
  const asked = performance.now();
  loadSound(line.clip).then(b => { if (b && performance.now() - asked < 1500) playVoice(b); });
  return line;
}

// ---------- Drawing helpers ----------
// The ground line: a bit above the caption box
const ground = (st, k) => Math.min(st.h * k, st.floor - st.s * 0.1);

// Sky gradients are made once for each pair of colors (and screen height)
const skies = new Map();
function skyFill(ctx, w, h, top, bottom) {
  const key = `${top}${bottom}${h}`;
  let g = skies.get(key);
  if (!g) {
    g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    if (skies.size > 20) skies.clear();
    skies.set(key, g);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function stars(ctx, w, h, t, alpha = 1) {
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 50; i++) {
    const x = (i * 197.3) % w, y = (i * 83.7) % (h * 0.6);
    ctx.globalAlpha = alpha * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i)));
    ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * 0.6, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function cloud(ctx, x, y, s, alpha = 0.9) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, s * 0.5, 0, TAU);
  ctx.arc(x + s * 0.6, y - s * 0.25, s * 0.65, 0, TAU);
  ctx.arc(x + s * 1.2, y, s * 0.5, 0, TAU);
  ctx.fill();
}

function clouds(ctx, w, h, s, t, speed = 1) {
  for (let i = 0; i < 5; i++) {
    const span = w + s * 4;
    const x = (((i * 290 - t * s * 0.4 * speed * (1 + (i % 3) * 0.4)) % span) + span) % span - s * 2;
    cloud(ctx, x, h * (0.12 + ((i * 37) % 40) / 100), s * (0.8 + (i % 2) * 0.4));
  }
}

function sun(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.2);
  ctx.fillStyle = 'rgba(255, 236, 130, 0.6)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(TAU / 12);
    ctx.beginPath(); ctx.moveTo(s * 0.7, -s * 0.12); ctx.lineTo(s * 1.15, 0); ctx.lineTo(s * 0.7, s * 0.12); ctx.fill();
  }
  ctx.fillStyle = '#ffe066';
  ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0, TAU); ctx.fill();
  ctx.restore();
}

function hills(ctx, w, h, back, front, groundY) {
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 20) ctx.lineTo(x, groundY - h * 0.08 - Math.sin(x / w * 5 + 1) * h * 0.05);
  ctx.lineTo(w, h); ctx.fill();
  ctx.fillStyle = front;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 20) ctx.lineTo(x, groundY - Math.sin(x / w * 3) * h * 0.02);
  ctx.lineTo(w, h); ctx.fill();
}

// The little houses of Parcor Place
function houses(ctx, w, groundY, s) {
  const colors = ['#ef9a9a', '#fff59d', '#90caf9', '#ce93d8', '#ffcc80'];
  for (let i = 0; i < 7; i++) {
    const x = w * (0.05 + i * 0.14), hw = s * (0.55 + (i % 2) * 0.15), hh = s * (0.6 + (i % 3) * 0.2);
    const y = groundY - h8(i) * s;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, y - hh, hw, hh);
    ctx.fillStyle = '#b23a2e';
    ctx.beginPath(); ctx.moveTo(x - s * 0.1, y - hh); ctx.lineTo(x + hw / 2, y - hh - s * 0.45); ctx.lineTo(x + hw + s * 0.1, y - hh); ctx.fill();
    ctx.fillStyle = '#fff8e1';
    ctx.fillRect(x + hw * 0.3, y - hh * 0.65, hw * 0.4, hh * 0.3);
  }
}
const h8 = i => 0.15 + ((i * 5) % 3) * 0.08;

function tower(ctx, x, groundY, s, t, day) {
  const tw = s * 1.6, th = groundY - s * 1.3;
  ctx.save();
  ctx.translate(x, groundY);
  ctx.rotate(-0.05 + Math.sin(t * 0.8) * 0.01); // wobbly!
  ctx.fillStyle = '#8a8f9c';
  ctx.strokeStyle = '#4e5260';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-tw / 2, 0); ctx.lineTo(-tw * 0.42, -th); ctx.lineTo(tw * 0.42, -th); ctx.lineTo(tw / 2, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Bricks
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  for (let y = s * 0.5; y < th; y += s * 0.5) {
    ctx.beginPath(); ctx.moveTo(-tw * 0.45, -y); ctx.lineTo(tw * 0.45, -y); ctx.stroke();
  }
  // Window
  ctx.fillStyle = day ? '#ffe9a8' : '#ffd54f';
  ctx.beginPath(); ctx.arc(0, -th * 0.72, s * 0.32, Math.PI, 0); ctx.lineTo(s * 0.32, -th * 0.6); ctx.lineTo(-s * 0.32, -th * 0.6); ctx.fill();
  // Roof
  ctx.fillStyle = '#5e35b1';
  ctx.strokeStyle = '#311b92';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-tw * 0.62, -th); ctx.quadraticCurveTo(0, -th - s * 0.2, tw * 0.62, -th);
  ctx.quadraticCurveTo(tw * 0.1, -th - s * 1.2, s * 0.5, -th - s * 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  starShape(ctx, -s * 0.05, -th - s * 0.6, s * 0.18, '#ffd54f');
  ctx.restore();
}

function starShape(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.fill();
}

function sparkle(ctx, x, y, r, color = '#fff') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function pancakes(ctx, x, y, s, n = 4, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  for (let i = 0; i < n; i++) {
    const py = -i * s * 0.13;
    ctx.fillStyle = '#c98a3e'; ctx.strokeStyle = '#8d5a1f'; ctx.lineWidth = s * 0.04;
    ctx.beginPath(); ctx.ellipse(0, py, s * 0.42, s * 0.1, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0b860';
    ctx.beginPath(); ctx.ellipse(0, py - s * 0.03, s * 0.38, s * 0.06, 0, 0, TAU); ctx.fill();
  }
  const top = -(n - 1) * s * 0.13 - s * 0.04;
  ctx.fillStyle = 'rgba(166, 82, 18, 0.85)'; // syrup
  ctx.beginPath(); ctx.ellipse(0, top, s * 0.3, s * 0.05, 0, 0, TAU); ctx.fill();
  ctx.fillRect(s * 0.22, top, s * 0.06, s * 0.22);
  ctx.fillRect(-s * 0.3, top, s * 0.05, s * 0.3);
  ctx.fillStyle = '#fff59d'; // butter
  ctx.fillRect(-s * 0.08, top - s * 0.08, s * 0.16, s * 0.08);
  ctx.restore();
}

function table(ctx, x, groundY, s) {
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(x - s * 0.06, groundY - s * 0.9, s * 0.12, s * 0.9);
  ctx.fillStyle = '#a1887f';
  ctx.fillRect(x - s * 0.7, groundY - s * 1.0, s * 1.4, s * 0.14);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(x, groundY - s * 1.02, s * 0.5, s * 0.08, 0, 0, TAU); ctx.fill();
}

function nameTag(ctx, x, y, s, text) {
  if (!text) return;
  ctx.font = `bold ${Math.round(s * 0.3)}px "Trebuchet MS", system-ui, sans-serif`;
  const tw = ctx.measureText(text).width + s * 0.3;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  roundRect(ctx, x - tw / 2, y - s * 0.22, tw, s * 0.44, s * 0.2);
  ctx.fill();
  ctx.fillStyle = '#4a2c82';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
}

// (Older iPads don't have ctx.roundRect)
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The dragon, a little bouncy while it talks. angle spins it around its middle (for loop-de-loops).
function dragonAt(ctx, st, x, y, scale, facing, opts = {}, angle = 0, tag = true) {
  const talk = st.talking === 'dragon' ? st.level : 0;
  ctx.save();
  ctx.translate(x, y - scale * 0.5);
  ctx.rotate(angle);
  drawDragon(ctx, st.dragon, 0, scale * 0.5 - talk * scale * 0.08, scale, facing, { t: st.t, squash: -talk * 0.4, ...opts });
  ctx.restore();
  if (tag && !angle) nameTag(ctx, x, y - scale * 1.55, st.s, st.dragon.name);
}

// Purple spell sparkles going round and round
function spellSwirl(ctx, x, y, r, t, alpha = 1) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 10; i++) {
    const a = t * 2.5 + i * TAU / 10;
    sparkle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.35, r * 0.09 * (1 + 0.4 * Math.sin(t * 6 + i)), i % 2 ? '#e040fb' : '#b388ff');
  }
  ctx.globalAlpha = 1;
}

function confetti(ctx, w, h, t, n = 60) {
  const colors = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const x = (i * 131.7) % w + Math.sin(t * 1.3 + i) * 20;
    const y = ((t * 70 * (1 + (i % 3) * 0.5) + i * 53) % (h + 40)) - 20;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 + i);
    ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(-5, -2.5, 10, 5);
    ctx.restore();
  }
}

function rainbow(ctx, w, h, s, alpha = 0.45) {
  ['#ff5252', '#ffab40', '#ffee58', '#69f0ae', '#40c4ff', '#b388ff'].forEach((c, k) => {
    ctx.strokeStyle = c; ctx.globalAlpha = alpha; ctx.lineWidth = s * 0.25;
    ctx.beginPath(); ctx.arc(w * 0.5, h * 1.1, h * 0.85 - k * s * 0.25, Math.PI, TAU); ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

function flash(ctx, w, h, k, color = '255,255,255') {
  if (k <= 0) return;
  ctx.fillStyle = `rgba(${color},${clamp(k, 0, 1)})`;
  ctx.fillRect(0, 0, w, h);
}

// ---------- Wizard Grumbleboots ----------
// Drawn facing right with his feet at (x, y). u is about a third of his height.
// mood: grumpy, happy, laugh, shock, zap, sorry. talk: 0..1 how open his mouth is.
export function drawWizard(ctx, x, y, u, o = {}) {
  const { mood = 'grumpy', talk = 0, t = 0, facing = 1, hatPancake = false } = o;
  const bounce = mood === 'laugh' ? Math.abs(Math.sin(t * 9)) * 0.06 : talk * 0.04;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u * facing, u);
  ctx.translate(0, -bounce);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.04;
  const robe = '#5e35b1', robeDark = '#311b92', skin = '#ffd8b8', beard = '#f5f5f5';

  // Shoes with curly toes
  ctx.fillStyle = '#4a148c'; ctx.strokeStyle = '#1a0533';
  for (const sx of [-0.28, 0.28]) {
    ctx.beginPath(); ctx.ellipse(sx + 0.06, -0.06, 0.22, 0.09, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(sx + 0.3, -0.14, 0.06, 0, TAU); ctx.stroke();
  }
  // Robe
  ctx.fillStyle = robe; ctx.strokeStyle = robeDark;
  ctx.beginPath();
  ctx.moveTo(-0.62, -0.05); ctx.quadraticCurveTo(-0.5, -0.75, -0.3, -1.45);
  ctx.lineTo(0.3, -1.45); ctx.quadraticCurveTo(0.5, -0.75, 0.62, -0.05);
  ctx.quadraticCurveTo(0, 0.04, -0.62, -0.05);
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.moveTo(-0.58, -0.12); ctx.quadraticCurveTo(0, -0.03, 0.58, -0.12); ctx.stroke();
  starShape(ctx, -0.25, -0.45, 0.09, '#ffd54f');
  starShape(ctx, 0.25, -0.75, 0.07, '#ffd54f');
  starShape(ctx, 0.05, -0.25, 0.06, '#ffd54f');
  ctx.fillStyle = '#ffd54f';
  ctx.beginPath(); ctx.arc(-0.12, -1.0, 0.1, 0.5, 5.3); ctx.arc(-0.08, -1.0, 0.08, 5.0, 0.8, true); ctx.fill();
  // Belt
  ctx.fillStyle = '#ffb300';
  ctx.fillRect(-0.4, -1.0, 0.8, 0.08);

  // Arm with the wand, depending on mood
  const hand = {
    grumpy: [0.62, -1.25], happy: [0.62, -1.85], laugh: [0.2, -0.85], shock: [0.5, -1.75],
    zap: [0.72, -2.05], sorry: [0.32, -0.85],
  }[mood] || [0.6, -1.2];
  const shake = mood === 'grumpy' ? Math.sin(t * 20) * 0.03 * (talk > 0.1 ? 1 : 0) : 0;
  const hx = hand[0], hy = hand[1] + shake;
  // Wand
  const wa = mood === 'zap' ? -0.5 : mood === 'laugh' || mood === 'sorry' ? 0.9 : -1.0;
  const wx = hx + Math.cos(wa) * 0.55, wy = hy + Math.sin(wa) * 0.55;
  ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 0.06;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(wx, wy); ctx.stroke();
  const glow = mood === 'zap' ? 1 : 0.4;
  const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, 0.35 * glow + 0.1);
  g.addColorStop(0, 'rgba(255,240,150,0.9)'); g.addColorStop(1, 'rgba(255,200,80,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(wx, wy, 0.45, 0, TAU); ctx.fill();
  starShape(ctx, wx, wy, 0.11 + 0.02 * Math.sin(t * 8), '#ffee58');
  // Sleeve and hand
  ctx.strokeStyle = robeDark; ctx.lineWidth = 0.26;
  ctx.beginPath(); ctx.moveTo(0.2, -1.32); ctx.lineTo(hx * 0.9, hy + 0.05); ctx.stroke();
  ctx.strokeStyle = robe; ctx.lineWidth = 0.2;
  ctx.beginPath(); ctx.moveTo(0.2, -1.32); ctx.lineTo(hx * 0.9, hy + 0.05); ctx.stroke();
  ctx.fillStyle = skin; ctx.strokeStyle = '#c48b6b'; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.arc(hx, hy, 0.09, 0, TAU); ctx.fill(); ctx.stroke();

  // Head
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -1.74, 0.3, 0, TAU); ctx.fill(); ctx.stroke();
  // Beard
  ctx.fillStyle = beard; ctx.strokeStyle = '#bdbdbd'; ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(-0.3, -1.72);
  ctx.bezierCurveTo(-0.4, -1.3, -0.2, -1.0, 0.06, -0.82);
  ctx.bezierCurveTo(0.1, -1.0, 0.42, -1.25, 0.3, -1.72);
  ctx.quadraticCurveTo(0, -1.5, -0.3, -1.72);
  ctx.fill(); ctx.stroke();
  // Mouth
  const open = mood === 'shock' ? 0.07 + talk * 0.05 : mood === 'laugh' ? 0.05 + talk * 0.06 : talk * 0.08;
  ctx.fillStyle = '#5d1f1f';
  if (open > 0.015) {
    ctx.beginPath(); ctx.ellipse(0.03, -1.5, 0.1, open, 0, 0, TAU); ctx.fill();
  } else {
    ctx.strokeStyle = '#5d1f1f'; ctx.lineWidth = 0.035;
    const smile = mood === 'happy' || mood === 'laugh' ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(-0.07, -1.5 - smile * 0.015); ctx.quadraticCurveTo(0.03, -1.5 + smile * 0.05, 0.13, -1.5 - smile * 0.015); ctx.stroke();
  }
  // Mustache
  ctx.fillStyle = beard; ctx.strokeStyle = '#bdbdbd';
  for (const [mx, ma] of [[-0.08, 0.35], [0.14, -0.35]]) {
    ctx.beginPath(); ctx.ellipse(mx, -1.6, 0.13, 0.06, ma, 0, TAU); ctx.fill(); ctx.stroke();
  }
  // Nose
  ctx.fillStyle = '#ffab91'; ctx.strokeStyle = '#c48b6b';
  ctx.beginPath(); ctx.arc(0.06, -1.68, 0.09, 0, TAU); ctx.fill(); ctx.stroke();
  // Eyes
  const blink = (t % 3.7) > 3.55;
  for (const ex of [-0.08, 0.17]) {
    if (mood === 'laugh' || blink) {
      ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 0.035;
      ctx.beginPath(); ctx.arc(ex, -1.8, 0.05, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else {
      const er = mood === 'shock' ? 0.075 : 0.06;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 0.02;
      ctx.beginPath(); ctx.arc(ex, -1.82, er, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3e2723';
      ctx.beginPath(); ctx.arc(ex + 0.015, -1.82 + (mood === 'sorry' ? 0.025 : 0), 0.03, 0, TAU); ctx.fill();
    }
  }
  // Bushy eyebrows: down in the middle when grumpy, up when sorry or surprised
  const tilt = { grumpy: 0.07, zap: 0.08, sorry: -0.06, shock: -0.03, happy: -0.02, laugh: -0.02 }[mood] ?? 0.05;
  const lift = mood === 'shock' ? -0.05 : 0;
  ctx.strokeStyle = '#fafafa'; ctx.lineWidth = 0.075;
  ctx.beginPath(); ctx.moveTo(-0.2, -1.93 - tilt + lift); ctx.lineTo(-0.01, -1.9 + tilt * 0.4 + lift); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.07, -1.9 + tilt * 0.4 + lift); ctx.lineTo(0.28, -1.93 - tilt + lift); ctx.stroke();

  // Hat with a floppy tip
  const flop = Math.sin(t * 2) * 0.04;
  ctx.fillStyle = '#4527a0'; ctx.strokeStyle = '#1a0f4f'; ctx.lineWidth = 0.04;
  ctx.beginPath(); ctx.ellipse(0, -1.98, 0.5, 0.1, 0, 0, TAU); ctx.fill(); ctx.stroke();
  const hatPath = () => {
    ctx.beginPath();
    ctx.moveTo(-0.32, -2.0);
    ctx.quadraticCurveTo(-0.15, -2.6, 0.12, -3.0);
    ctx.quadraticCurveTo(0.35 + flop, -3.15, 0.55 + flop, -2.85);
    ctx.quadraticCurveTo(0.3, -2.75, 0.2, -2.6);
    ctx.quadraticCurveTo(0.3, -2.3, 0.32, -2.0);
    ctx.closePath();
  };
  hatPath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(-0.31, -2.12, 0.62, 0.08);
  starShape(ctx, 0.0, -2.38, 0.1, '#ffd54f');
  ctx.beginPath(); ctx.arc(0.55 + flop, -2.85, 0.06, 0, TAU); ctx.fill();
  if (hatPancake) {
    // The pancakes landed on his hat. Splat!
    pancakes(ctx, 0.02, -2.25, 1.15, 3, 0.12);
    ctx.save();
    ctx.beginPath(); ctx.rect(-1, -3.4, 2, 0.78); ctx.clip(); // the hat tip pokes out the top
    hatPath(); ctx.fillStyle = '#4527a0'; ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function wizardAt(ctx, st, x, y, u, extra = {}) {
  drawWizard(ctx, x, y, u, {
    mood: st.mood, t: st.t, facing: -1, hatPancake: !!st.p.hatPancake || st.cue('splat') >= 0.35,
    talk: st.talking === 'wizard' ? st.level : 0, ...extra,
  });
}

// Puff of smoke for the wizard popping in
function puff(ctx, x, y, s, k) {
  if (k < 0 || k > 1) return;
  ctx.globalAlpha = 1 - k;
  ctx.fillStyle = '#e1bee7';
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * (0.3 + k * 1.2), y + Math.sin(a) * s * (0.3 + k), s * (0.5 - k * 0.2), 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- The scenes ----------
const SCENES = {
  // Parcor Place on a sunny day, the dragon flying around
  sky(ctx, st) {
    const { w, h, s, t } = st;
    skyFill(ctx, w, h, '#6ec6ff', '#e3f6ff');
    sun(ctx, w * 0.85, h * 0.18, s, t);
    clouds(ctx, w, h, s, t);
    const gy = ground(st, 0.82);
    hills(ctx, w, h, '#81c784', '#4caf50', gy);
    houses(ctx, w, gy, s);
    let x = w * 0.5 + Math.sin(t * 0.7) * w * 0.28;
    let y = h * 0.42 + Math.sin(t * 1.4) * h * 0.07;
    const facing = Math.cos(t * 0.7) >= 0 ? 1 : -1;
    let angle = 0;
    const lp = st.cue('loop');
    if (lp >= 0 && lp < 1.4) {
      const k = ease(lp / 1.4);
      angle = -k * TAU * facing;
      x += Math.sin(k * TAU) * s * facing;
      y -= (1 - Math.cos(k * TAU)) * s;
    }
    dragonAt(ctx, st, x, y, s * 1.1, facing, { flying: true }, angle);
  },

  // Wizard Grumbleboots' wobbly tower
  tower(ctx, st) {
    const { w, h, s, t, p } = st;
    const day = p.sky === 'day';
    if (day) skyFill(ctx, w, h, '#7ec8f0', '#ffe3b0');
    else { skyFill(ctx, w, h, '#4a2c82', '#f8a978'); stars(ctx, w, h, t, 0.8); }
    ctx.fillStyle = day ? '#fff' : '#fff8e1';
    ctx.beginPath(); ctx.arc(w * 0.88, h * 0.16, s * 0.45, 0, TAU); ctx.fill();
    const gy = ground(st, 0.86);
    hills(ctx, w, h, day ? '#81c784' : '#3d5a4a', day ? '#4caf50' : '#2e4a3a', gy);
    tower(ctx, w * 0.3, gy, s, t, day);
    const wx = w * 0.7, u = s * 0.95;

    const enter = st.cue('enter');
    const hidden = p.cues.enter !== undefined && enter < 0;
    if (p.pancakes) table(ctx, w * 0.5, gy, s);
    if (!hidden) wizardAt(ctx, st, wx, gy, u);
    puff(ctx, wx, gy - u * 1.5, s, enter / 0.6);
    if (enter >= 0 && enter < 1.2) for (let i = 0; i < 8; i++) sparkle(ctx, wx + Math.cos(i) * s * enter * 2, gy - u * 1.5 + Math.sin(i * 2) * s * enter * 1.5, s * 0.12, '#ffd54f');

    // Breakfast, then whoosh, then splat
    if (p.pancakes) {
      const wh = st.cue('whoosh'), sp = st.cue('splat');
      if (wh < 0) pancakes(ctx, w * 0.5, gy - s * 1.1, s);
      else if (sp < 0) {
        // Pancakes flying away up into the sky
        const k = Math.max(0, wh - 0.35);
        for (let i = 0; i < 4; i++) {
          pancakes(ctx, w * 0.5 + k * s * (1.5 + i * 0.7), gy - s * 1.1 - k * s * (5 + i) + k * k * s * 0.5, s * 0.9, 1, k * (4 + i));
        }
      } else if (sp < 0.35) {
        pancakes(ctx, wx - s * 0.1, (gy - u * 2.3) - (1 - sp / 0.35) * h * 0.5, s * 1.1, 3);
      } else if (sp < 0.8) {
        for (let i = 0; i < 6; i++) { // syrup splashes
          const a = -Math.PI * (0.1 + i * 0.16);
          ctx.fillStyle = '#a65212';
          ctx.beginPath(); ctx.arc(wx + Math.cos(a) * s * sp * 2.2, gy - u * 2.3 + Math.sin(a) * s * sp * 2 + sp * sp * s * 4, s * 0.07, 0, TAU); ctx.fill();
        }
      }
      // The dragon zooming past
      if (wh >= 0 && wh < 1.0) {
        const x = -s * 2 + (w + s * 4) * (wh / 1.0);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath(); ctx.moveTo(x - s * (1.2 + i * 0.3), gy - s * (1.3 + i * 0.25)); ctx.lineTo(x - s * (3 + i * 0.5), gy - s * (1.3 + i * 0.25)); ctx.stroke();
        }
        dragonAt(ctx, st, x, gy - s * 0.9, s * 1.0, 1, { flying: true }, 0, false);
      }
    }

    // The dragon in the air when he casts the spell
    if (p.dragon === 'hover') {
      const zap = st.cue('zap');
      let dx = w * 0.14, dy = h * 0.42 + Math.sin(t * 2) * s * 0.2, ang = 0;
      if (zap >= 0.5) { const k = zap - 0.5; dy += k * k * s * 12; ang = k * 3; }
      if (zap >= 0 && zap < 0.7) {
        // Lightning from the wand
        const sx = wx - u * 0.9, sy = gy - u * 2.4;
        ctx.strokeStyle = zap % 0.1 < 0.05 ? '#fff59d' : '#e040fb';
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(sx, sy);
        for (let i = 1; i <= 8; i++) {
          const k = i / 8;
          ctx.lineTo(sx + (dx - sx) * k + (i < 8 ? Math.sin(i * 7 + t * 40) * s * 0.3 : 0), sy + (dy - s * 0.6 - sy) * k + (i < 8 ? Math.cos(i * 5 + t * 30) * s * 0.3 : 0));
        }
        ctx.stroke();
        flash(ctx, w, h, 0.35 - zap * 0.5, '224,64,251');
      }
      if (dy < h + s * 2) dragonAt(ctx, st, dx, dy, s * 1.0, 1, zap >= 0.5 ? { pose: 'fall' } : { flying: true }, ang, zap < 0);
      if (zap >= 0) spellSwirl(ctx, dx, dy - s * 0.5, s * 1.2, t);
    }

    // Gems flying out of his hat in every direction
    if (p.cues.gems !== undefined) {
      const k = st.cue('gems');
      if (k >= 0 && k < 2.5) {
        for (let i = 0; i < 14; i++) {
          const a = -Math.PI * (0.05 + 0.9 * i / 13);
          drawGem(ctx, wx + Math.cos(a) * k * s * (3 + i % 3), gy - u * 2.8 + Math.sin(a) * k * s * 4 + k * k * s * 1.5, s * 0.5, t + i);
        }
      }
    }

    // The dragon sitting nearby at the end
    if (p.dragon === 'perch') dragonAt(ctx, st, w * 0.5, gy, s * 1.0, 1, {});
  },

  // Under the spell: can't fly
  ground(ctx, st) {
    const { w, h, s, t } = st;
    skyFill(ctx, w, h, '#4a2c82', '#c48bd8');
    stars(ctx, w, h, t, 0.6);
    const gy = ground(st, 0.8);
    hills(ctx, w, h, '#3d5a4a', '#4c7a54', gy);
    const flap = st.cue('flap'), flop = st.cue('flop');
    let y = gy, opts = {};
    if (flap >= 0 && flop < 0) {
      y -= Math.abs(Math.sin(flap * 5)) * s * 0.5; // trying to take off: hop, hop, hop
      opts = { pose: 'jump', airborne: true, vy: Math.cos(flap * 5) > 0 ? -8 : 8 };
    }
    if (flop >= 0) opts = { squash: Math.max(0.3, 0.8 - flop) };
    dragonAt(ctx, st, w * 0.5, y, s * 1.3, 1, opts);
    spellSwirl(ctx, w * 0.5, gy - s * 0.7, s * 1.5, t);
    if (flop >= 0.3) {
      // A little rain cloud. Aww.
      const cy = gy - s * 3.2 + Math.sin(t * 2) * s * 0.05;
      cloud(ctx, w * 0.5 - s * 0.6, cy, s * 0.7, 0.95);
      ctx.strokeStyle = '#90caf9'; ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const dy = ((t * 3 + i * 0.37) % 1) * s * 1.2;
        ctx.beginPath(); ctx.moveTo(w * 0.5 - s * 0.5 + i * s * 0.2, cy + s * 0.4 + dy); ctx.lineTo(w * 0.5 - s * 0.5 + i * s * 0.2, cy + s * 0.55 + dy); ctx.stroke();
      }
    }
  },

  // The ten worlds, with a gem in each, and the dragon running along the path
  worlds(ctx, st) {
    const { w, h, s, t, p } = st;
    skyFill(ctx, w, h, '#81d4fa', '#fff3e0');
    clouds(ctx, w, h, s * 0.8, t);
    const base = Math.min(h * 0.8, st.floor - s * 0.7), rise = base - s * 1.6;
    const pts = WORLDS.map((_, k) => [w * (0.08 + 0.84 * k / 9), base - rise * 0.75 * k / 9 + Math.sin(k * 1.9) * s * 0.5]);
    ctx.strokeStyle = '#d7a86e'; ctx.lineWidth = s * 0.3; ctx.lineCap = 'round';
    ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.setLineDash([s * 0.2, s * 0.2]); ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = s * 0.06;
    ctx.stroke(); ctx.setLineDash([]);
    WORLDS.forEach((wd, k) => {
      const [x, y] = pts[k];
      ctx.fillStyle = wd.sky[0]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.font = `${Math.round(s * 0.55)}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(wd.emoji, x, y + 2);
      drawGem(ctx, x, y - s * 0.95, s * 0.45, t + k);
    });
    // Run along the path during the panel
    const k = clamp(t / Math.max(1, p.dur - 1), 0, 1) * 9;
    const i = Math.min(8, Math.floor(k)), f = k - i;
    const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
    dragonAt(ctx, st, x, y - s * 0.1, s * 0.8, 1, { moving: true, walk: t * 9 });
  },

  // A hundred gems glow until the spell pops
  glow(ctx, st) {
    const { w, h, s, t, p } = st;
    const boom = st.cue('boom'), glow = st.cue('glow');
    const gy = ground(st, 0.82);
    if (boom < 0) {
      skyFill(ctx, w, h, '#1a1446', '#4a2c82');
      stars(ctx, w, h, t);
      hills(ctx, w, h, '#2e2a5a', '#3b3570', gy);
    } else {
      skyFill(ctx, w, h, '#4fc3f7', '#e1f5fe');
      rainbow(ctx, w, h, s, Math.min(0.45, boom * 0.3));
      clouds(ctx, w, h, s, t);
      hills(ctx, w, h, '#81c784', '#4caf50', gy);
    }
    const cx = w * 0.5, cy = gy - s * 0.8;
    const power = boom >= 0 ? 0 : glow < 0 ? 0.15 : 0.15 + 0.85 * clamp(glow / Math.max(0.5, p.cues.boom - p.cues.glow), 0, 1);
    if (power > 0) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * (2 + power * 4));
      g.addColorStop(0, `rgba(255,255,255,${power})`);
      g.addColorStop(0.4, `rgba(255,120,230,${power * 0.6})`);
      g.addColorStop(1, 'rgba(255,120,230,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    dragonAt(ctx, st, cx, gy, s * 1.3, 1, {});
    if (boom < 0) {
      spellSwirl(ctx, cx, cy, s * 1.4, t, 1 - power * 0.7);
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a = t * (0.6 + power * 2.5) + i * TAU / n;
        const r = s * (3.2 - power * 0.8);
        drawGem(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.55, s * (0.45 + power * 0.2), t + i);
      }
    } else {
      // The spell bursts into sparkles
      for (let i = 0; i < 24; i++) {
        const a = i * TAU / 24;
        const r = boom * s * 6;
        if (boom < 1.5) sparkle(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, s * 0.25 * (1.5 - boom), i % 2 ? '#ffd740' : '#e040fb');
      }
      flash(ctx, w, h, 1 - boom);
    }
  },

  // The dragon flies again!
  liftoff(ctx, st) {
    const { w, h, s, t } = st;
    skyFill(ctx, w, h, '#4fc3f7', '#e1f5fe');
    rainbow(ctx, w, h, s);
    clouds(ctx, w, h, s, t);
    const gy = ground(st, 0.82);
    hills(ctx, w, h, '#81c784', '#4caf50', gy);
    const up = st.cue('liftoff');
    let x = w * 0.5, y = gy, angle = 0, opts = {};
    if (up < 0) {
      // Tingly wings
      for (let i = 0; i < 6; i++) sparkle(ctx, x + Math.sin(t * 3 + i * 2) * s * 1.2, y - s * (1 + (i % 3) * 0.4) + Math.cos(t * 4 + i) * s * 0.3, s * 0.15, '#fff59d');
      x += Math.sin(t * 30) * 1.5;
    } else {
      const k = Math.min(1, up / 1.2);
      y = gy - ease(k) * h * 0.45 + Math.sin(t * 2) * s * 0.2;
      x = w * 0.5 + Math.sin(up * 1.2) * w * 0.2 * k;
      if (up > 1.2 && up < 2.6) angle = -ease((up - 1.2) / 1.4) * TAU;
      opts = { flying: true };
      confetti(ctx, w, h, t, 40);
    }
    dragonAt(ctx, st, x, y, s * 1.2, 1, opts, angle);
  },

  // Friends! Pancakes for everyone.
  friends(ctx, st) {
    const { w, h, s, t } = st;
    skyFill(ctx, w, h, '#7ec8f0', '#fff3e0');
    sun(ctx, w * 0.15, h * 0.18, s, t);
    clouds(ctx, w, h, s, t);
    const gy = ground(st, 0.84);
    hills(ctx, w, h, '#81c784', '#66bb6a', gy);
    table(ctx, w * 0.5, gy, s);
    pancakes(ctx, w * 0.5, gy - s * 1.1, s, 6);
    const hop = st.cue('happy');
    const hy = hop >= 0 && hop < 0.9 ? Math.abs(Math.sin(hop * Math.PI * 2.2)) * s * 0.6 : 0;
    wizardAt(ctx, st, w * 0.73, gy - hy, s * 0.95, hop >= 0 ? { mood: 'happy' } : {});
    dragonAt(ctx, st, w * 0.26, gy, s * 1.1, 1, {});
    if (hop >= 0) {
      for (let i = 0; i < 6; i++) {
        const k = ((hop * 0.4 + i / 6) % 1);
        heart(ctx, w * 0.5 + Math.sin(i * 2 + hop) * s * 1.5, gy - s * 2 - k * h * 0.5, s * 0.25, 1 - k);
      }
    }
  },

  // Flying off with the wizard riding along. The End!
  ride(ctx, st) {
    const { w, h, s, t } = st;
    skyFill(ctx, w, h, '#4fc3f7', '#e1f5fe');
    rainbow(ctx, w, h, s);
    clouds(ctx, w, h, s, t, 4);
    const x = w * 0.45 + Math.sin(t * 0.8) * w * 0.12, y = h * 0.55 + Math.sin(t * 1.6) * s * 0.4;
    const sc = s * 1.4;
    dragonAt(ctx, st, x, y, sc, 1, { flying: true }, 0, false);
    // Grumbleboots on the dragon's back (the eastern dragon is long, so he sits further back)
    const back = st.dragon.type === 'eastern' ? -0.15 : -0.12;
    drawWizard(ctx, x + back * sc, y - sc * 0.62, s * 0.6, { mood: 'happy', t, facing: 1, talk: st.talking === 'wizard' ? st.level : 0 });
    const end = st.cue('theend');
    if (end < 0) nameTag(ctx, x, y - sc * 2.2, s, st.dragon.name);
    if (end >= 0) {
      confetti(ctx, w, h, t);
      const k = Math.min(1, end / 0.5);
      ctx.save();
      ctx.translate(w * 0.5, h * 0.2);
      ctx.scale(0.3 + 0.7 * ease(k) + Math.sin(end * 5) * 0.03, 0.3 + 0.7 * ease(k));
      ctx.font = `bold ${Math.round(s * 1.1)}px "Trebuchet MS", system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = s * 0.16; ctx.strokeStyle = '#4a2c82'; ctx.strokeText('The End!', 0, 0);
      ctx.fillStyle = '#ffd54f'; ctx.fillText('The End!', 0, 0);
      ctx.restore();
    }
  },
};

function heart(ctx, x, y, r, alpha) {
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.fillStyle = '#ff5c8a';
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.5);
  ctx.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r);
  ctx.fill();
  ctx.globalAlpha = 1;
}
