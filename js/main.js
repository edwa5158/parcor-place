// Screens and buttons: title, dragon maker, story, level map, playing, and the ending.

import { WORLDS } from './themes.js';
import { LEVELS_PER_WORLD, TOTAL_LEVELS } from './levels.js';
import {
  drawDragon, DRAGON_TYPES, HORNS, WINGS, BODY_COLORS, EYE_COLORS, DEFAULT_DRAGON, randomName,
} from './dragon.js';
import { loadSave, writeSave, gemCount, hasGem, isUnlocked as savedUnlocked, addGem, allGems } from './save.js';
import { setupInput, clearInput } from './input.js';
import { unlockAudio, setMuted, sfx } from './audio.js';
import { Game, FlyScene, MAX_HEARTS } from './game.js';

const $ = id => document.getElementById(id);
const save = loadSave();
setMuted(save.muted);

// Grown-ups can add ?unlock to the web address to open every level (for testing).
const unlockAll = new URLSearchParams(location.search).has('unlock');
const isUnlocked = i => unlockAll || savedUnlocked(save, i);

window.addEventListener('pointerdown', unlockAudio, { capture: true });
document.addEventListener('click', e => { if (e.target.closest('button')) sfx.click(); });
// No pinch-zoom or double-tap zoom while playing
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

setupInput($('controls'));

// ---------- Animated dragon previews ----------
const previews = new Map(); // canvas -> () => dragon config

function fitCanvas(c) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = c.clientWidth, h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function drawPreview(c, cfg, t, opts = {}) {
  const { ctx, w, h } = fitCanvas(c);
  if (!w || !h) return;
  const scale = Math.min(h / 1.6, w / 2.4);
  drawDragon(ctx, cfg, w * 0.53, h * 0.9, scale, 1, { t, ...opts });
}

function previewLoop(now) {
  const t = now / 1000;
  for (const [c, get] of previews) {
    if (!c.closest('.screen.active')) continue;
    drawPreview(c, get(), t);
  }
  requestAnimationFrame(previewLoop);
}
requestAnimationFrame(previewLoop);

// ---------- Screens ----------
let current = null;
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  $('controls').classList.toggle('hidden', id !== 'play' && id !== 'ending');
  clearInput();
  if (current === 'play' && id !== 'play') game.stop();
  if (current === 'ending' && id !== 'ending') fly.stop();
  current = id;
}

const dragon = () => save.dragon || { ...DEFAULT_DRAGON, name: 'Dragon' };

// ---------- Title ----------
function showTitle() {
  $('title-gems').textContent = `💎 ${gemCount(save)} / ${TOTAL_LEVELS}`;
  $('btn-fly').classList.toggle('hidden', !allGems(save));
  $('btn-mute').textContent = save.muted ? '🔇' : '🔊';
  show('title');
}
previews.set($('title-dragon'), dragon);

$('btn-play').onclick = () => {
  if (!save.dragon) openMaker(true);
  else openMap();
};
$('btn-dragon').onclick = () => openMaker(false);
$('btn-fly').onclick = () => startEnding();
$('btn-mute').onclick = () => {
  save.muted = !save.muted;
  setMuted(save.muted);
  writeSave(save);
  $('btn-mute').textContent = save.muted ? '🔇' : '🔊';
};

// ---------- Dragon maker ----------
let draft = null;
let makerFirstTime = false;
previews.set($('maker-dragon'), () => draft || dragon());

const GROUPS = [
  { title: 'Dragon type', key: 'type', options: DRAGON_TYPES },
  { title: 'Body color', key: 'body', colors: BODY_COLORS },
  { title: 'Horns', key: 'horns', options: HORNS },
  { title: 'Wings', key: 'wings', options: WINGS },
  { title: 'Wing color', key: 'wingColor', colors: BODY_COLORS },
  { title: 'Eye color', key: 'eyes', colors: EYE_COLORS },
];

function buildMakerOptions() {
  const box = $('maker-options');
  box.innerHTML = '';
  for (const g of GROUPS) {
    const group = document.createElement('div');
    group.className = 'opt-group';
    group.innerHTML = `<h3>${g.title}</h3>`;
    const row = document.createElement('div');
    row.className = 'opt-row';
    if (g.colors) {
      for (const c of g.colors) {
        const b = document.createElement('button');
        b.className = 'swatch' + (draft[g.key] === c ? ' selected' : '');
        b.style.background = c;
        b.setAttribute('aria-label', c);
        b.onclick = () => { draft[g.key] = c; buildMakerOptions(); };
        row.appendChild(b);
      }
    } else {
      for (const o of g.options) {
        const b = document.createElement('button');
        b.className = 'opt' + (draft[g.key] === o.id ? ' selected' : '');
        const c = document.createElement('canvas');
        b.appendChild(c);
        b.appendChild(document.createTextNode(o.label));
        b.onclick = () => { draft[g.key] = o.id; buildMakerOptions(); };
        row.appendChild(b);
        requestAnimationFrame(() => drawPreview(c, { ...draft, [g.key]: o.id }, 1));
      }
    }
    group.appendChild(row);
    box.appendChild(group);
  }
}

function openMaker(firstTime) {
  makerFirstTime = firstTime;
  draft = { ...DEFAULT_DRAGON, ...(save.dragon || {}) };
  $('dragon-name').value = draft.name || '';
  show('maker');
  buildMakerOptions();
}

$('dragon-name').addEventListener('input', e => { draft.name = e.target.value; });
$('dragon-name').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
$('btn-random-name').onclick = () => { draft.name = randomName(); $('dragon-name').value = draft.name; };
$('btn-maker-done').onclick = () => {
  draft.name = (draft.name || '').trim() || randomName();
  save.dragon = { ...draft };
  writeSave(save);
  draft = null;
  if (makerFirstTime) showStory();
  else showTitle();
};

// ---------- Story ----------
previews.set($('story-dragon'), dragon);
function showStory() {
  const n = escapeHtml(save.dragon.name);
  $('story-text').innerHTML =
    `Oh no! A grumpy wizard cast a spell on <b>${n}</b>! 🪄<br>` +
    `Now <b>${n}</b> can't fly. 😢<br>` +
    `Run and jump through <b>100 levels</b> and collect <b>100 magic gems 💎</b> to break the spell!`;
  show('story');
}
$('btn-story-go').onclick = () => openMap();

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Level map ----------
let selectedWorld = 0;

function nextLevel() {
  for (let i = 0; i < TOTAL_LEVELS; i++) if (!hasGem(save, i)) return i;
  return TOTAL_LEVELS - 1;
}

function openMap(world) {
  selectedWorld = world ?? Math.floor(nextLevel() / LEVELS_PER_WORLD);
  $('map-gems').textContent = `💎 ${gemCount(save)} / ${TOTAL_LEVELS}`;
  show('map');
  buildMap();
}

function buildMap() {
  const list = $('world-list');
  list.innerHTML = '';
  WORLDS.forEach((w, wi) => {
    const first = wi * LEVELS_PER_WORLD;
    const unlocked = isUnlocked(first);
    let got = 0;
    for (let k = 0; k < LEVELS_PER_WORLD; k++) if (hasGem(save, first + k)) got++;
    const b = document.createElement('button');
    b.className = 'world-btn' + (wi === selectedWorld ? ' selected' : '') + (unlocked ? '' : ' locked');
    b.innerHTML = `<span>${w.emoji} ${w.name}</span><small>${unlocked ? `💎${got}` : '🔒'}</small>`;
    b.onclick = () => { selectedWorld = wi; buildMap(); };
    list.appendChild(b);
  });
  list.children[selectedWorld].scrollIntoView({ block: 'nearest', inline: 'nearest' });

  const w = WORLDS[selectedWorld];
  $('world-title').textContent = `${w.emoji} ${w.name}`;
  const grid = $('level-grid');
  grid.innerHTML = '';
  const next = nextLevel();
  for (let k = 0; k < LEVELS_PER_WORLD; k++) {
    const i = selectedWorld * LEVELS_PER_WORLD + k;
    const b = document.createElement('button');
    const done = hasGem(save, i);
    const open = isUnlocked(i);
    b.className = 'level-btn' + (done ? ' done' : '') + (open ? '' : ' locked') + (i === next && open && !done ? ' next' : '');
    b.innerHTML = `${k + 1}<span class="mark">${done ? '💎' : open ? '' : '🔒'}</span>`;
    b.disabled = !open;
    b.onclick = () => playLevel(i);
    grid.appendChild(b);
  }
}

$('btn-map-back').onclick = () => showTitle();

// ---------- Playing ----------
let playing = 0;
const game = new Game($('game'), {
  onHearts(n) {
    $('hearts').textContent = '❤️'.repeat(Math.max(0, n)) + '🤍'.repeat(Math.max(0, MAX_HEARTS - n));
  },
  onLevelLost() {
    $('lost-box').classList.remove('hidden');
    setTimeout(() => $('lost-box').classList.add('hidden'), 1500);
  },
  onGem() {
    const before = allGems(save);
    addGem(save, playing);
    clearInput();
    if (!before && allGems(save)) { startEnding(); return; }
    $('win-gems').textContent = `💎 ${gemCount(save)} / ${TOTAL_LEVELS}`;
    $('btn-next').classList.toggle('hidden', playing >= TOTAL_LEVELS - 1);
    $('win-box').classList.remove('hidden');
    $('controls').classList.add('hidden');
  },
});

function playLevel(i) {
  playing = i;
  const w = WORLDS[Math.floor(i / LEVELS_PER_WORLD)];
  $('level-name').textContent = `${w.emoji} ${w.name} ${(i % LEVELS_PER_WORLD) + 1}`;
  $('play-gems').textContent = `💎 ${gemCount(save)}`;
  ['pause-box', 'win-box', 'lost-box'].forEach(id => $(id).classList.add('hidden'));
  show('play');
  game.resize();
  game.start(i, dragon());
}

$('btn-pause').onclick = () => {
  game.paused = true;
  clearInput();
  $('pause-box').classList.remove('hidden');
  $('controls').classList.add('hidden');
};
$('btn-resume').onclick = () => {
  game.paused = false;
  $('pause-box').classList.add('hidden');
  $('controls').classList.remove('hidden');
};
$('btn-restart').onclick = () => playLevel(playing);
$('btn-to-map').onclick = () => openMap(Math.floor(playing / LEVELS_PER_WORLD));
$('btn-next').onclick = () => playLevel(Math.min(TOTAL_LEVELS - 1, playing + 1));
$('btn-win-map').onclick = () => openMap(Math.floor(Math.min(TOTAL_LEVELS - 1, playing + 1) / LEVELS_PER_WORLD));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && current === 'play' && !game.finished) $('btn-pause').onclick();
});

// ---------- The ending ----------
const fly = new FlyScene($('fly'));
function startEnding() {
  const n = escapeHtml(dragon().name);
  $('ending-text').innerHTML = `🎉 The spell is broken! 🎉<br>${n} can FLY again! Press JUMP to flap!`;
  save.seenEnding = true;
  writeSave(save);
  show('ending');
  sfx.victory();
  fly.start(dragon());
}
$('btn-ending-home').onclick = () => showTitle();

// ---------- Start ----------
showTitle();

// Handy for testing in the browser console
window.parcor = { game, save, playLevel };
