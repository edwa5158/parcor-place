// Builds all 100 levels. Every level is made the same way each time from its
// number, so level 37 is always the same level 37.
//
// A level is a grid of letters:
//   .  air        #  ground      =  floating platform
//   X  crate (solid, small enough to vault over)    U  bush (solid, wide and low)
//   / \  steep hill slopes     a A Z z  gentle dune slopes (see SLOPE in physics.js)
//   ^  spikes     K  crystals     Y  cactus     V  icicle/stalactite (hangs from a ceiling)
//   ~  lava/quicksand/goo
//   B  bouncy spring   C  checkpoint flag   G  magic gem   S  start
//
// The rules below keep every jump possible: gaps get wider and the obstacles
// get trickier as the level number goes up. tools/verify.mjs double-checks
// that a robot dragon can beat every level.

import { WORLDS } from './themes.js';
import { makeCells } from './physics.js';

export const LEVEL_H = 18;
export const LEVELS_PER_WORLD = 10;
export const TOTAL_LEVELS = WORLDS.length * LEVELS_PER_WORLD;

const MIN_H = 3;
const MAX_H = 10;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Which obstacles are allowed in a level, and how often.
export function segmentWeights(index) {
  const world = WORLDS[Math.floor(index / LEVELS_PER_WORLD)];
  const w = { ...world.segs };
  // The first world teaches one new parkour move every couple of levels.
  if (index === 0) return { gap: w.gap || 1, steps: w.steps || 1 };
  if (index < 3) return { gap: w.gap || 1, steps: 1, vault: w.vault || 2 };
  if (index < 4) delete w.hill;
  if (index < 5) { delete w.tunnel; delete w.climb; }
  if (index < 6) { delete w.spring; delete w.platforms; }
  if (index < 7) delete w.climb;
  if (index < 8) delete w.spring;
  return w;
}

// The first level that has an obstacle: in the whole game, or in one world.
let weightsByLevel = null;
function firstLevelWith(seg, world = -1) {
  weightsByLevel ||= Array.from({ length: TOTAL_LEVELS }, (_, i) => segmentWeights(i));
  const from = world < 0 ? 0 : world * LEVELS_PER_WORLD;
  const to = world < 0 ? TOTAL_LEVELS : from + LEVELS_PER_WORLD;
  for (let i = from; i < to; i++) if (weightsByLevel[i][seg]) return i;
  return -1;
}

// Shown the first time an obstacle appears in the game. Worlds can have their own
// words for their own obstacles (theme.hints), shown the first time in that world.
const HINTS = {
  vault: 'Run fast into boxes to vault over them!',
  ledge: 'Jump at tall walls to grab the edge!',
  tunnel: 'Run into low tunnels to slide!',
  climb: 'Hold ➡️ on the wall and tap JUMP to climb!',
  spikes: 'Jump over the spikes!',
  platforms: 'Jump from platform to platform!',
  spring: 'Bounce on the spring! Hold ➡️',
  bush: 'Hop over the bushes, or run across the top!',
  hang: "Don't jump under the pointy things!",
  cactus: 'Cactuses are tall! Jump high!',
  crystals: 'Sharp crystals! Jump over them!',
};

// How far you can jump depends on how much higher you land.
function maxGapFor(rise, maxGap) {
  if (rise >= 2) return Math.min(maxGap, 2);
  if (rise === 1) return Math.min(maxGap, 3);
  return maxGap;
}

export function generateLevel(index) {
  const H = LEVEL_H;
  const worldIndex = Math.floor(index / LEVELS_PER_WORLD);
  const lvl = index % LEVELS_PER_WORLD;
  const theme = WORLDS[worldIndex];
  const d = index / (TOTAL_LEVELS - 1);
  const rng = mulberry32(index * 7919 + 101);
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const choose = arr => arr[Math.floor(rng() * arr.length)];

  const maxGap = index < 3 ? 2 : Math.min(4, 2 + Math.floor(d * 2.2 + (lvl / 9) * 0.8));
  const spikeMax = index < 6 ? 1 : Math.min(3, 1 + Math.floor(d * 2.5 + lvl / 12));
  const targetLen = 40 + Math.floor(d * 70) + lvl * 3;
  const weights = segmentWeights(index);

  const cols = [];
  const hints = [];
  let h = MIN_H;
  let lastCheckpoint = 0;

  const ground = height => {
    const c = new Array(H).fill('.');
    for (let r = H - height; r < H; r++) c[r] = '#';
    return c;
  };
  const pit = () => {
    const c = new Array(H).fill('.');
    if (theme.pit === 'liquid') { c[H - 1] = '#'; c[H - 2] = '~'; }
    return c;
  };
  const flat = n => { for (let i = 0; i < n; i++) cols.push(ground(h)); };
  const putOnTop = (ci, ch, height = h) => { cols[ci][H - height - 1] = ch; };
  let lastHint = -99;
  const hint = (text, dx = 0, height = h) => {
    lastHint = cols.length + dx;
    hints.push({ x: lastHint, y: H - height - 3, text });
  };

  // Pick a new height for landing after a gap of `gap` tiles.
  const pickRise = (from, gap, allowUp = true) => {
    const options = [];
    for (let dh = -2; dh <= 2; dh++) {
      const to = from + dh;
      if (to < MIN_H || to > MAX_H) continue;
      if (dh > 0 && !allowUp) continue;
      if (dh === 2 && index < 4) continue;
      if (gap > maxGapFor(dh, maxGap)) continue;
      options.push(dh);
    }
    // Lean toward going down when we're high up, and up when we're low.
    if (from > 7) options.push(-1, -2);
    if (from < 5) options.push(1);
    return options.length ? choose(options) : 0;
  };

  const ownHint = seg => theme.hints && theme.hints[seg] && firstLevelWith(seg, worldIndex) === index;
  const gameHint = seg => HINTS[seg] && firstLevelWith(seg) === index;
  const introduced = {};
  const maybeHint = (seg, dx = 0) => {
    if (introduced[seg]) return;
    introduced[seg] = true;
    if (ownHint(seg)) hint(theme.hints[seg], dx);
    else if (gameHint(seg)) hint(HINTS[seg], dx);
  };

  const SEGMENTS = {
    gap() {
      flat(ri(2, 3));
      const g = ri(1, maxGap);
      const dh = pickRise(h, g);
      for (let i = 0; i < g; i++) cols.push(pit());
      h += dh;
      flat(ri(3, 5));
    },
    steps() {
      const n = ri(2, 4);
      for (let i = 0; i < n; i++) {
        const opts = [-1, 1];
        if (index >= 4) opts.push(2, -2);
        let dh = choose(opts);
        if (h + dh < MIN_H || h + dh > MAX_H) dh = -dh;
        h = Math.max(MIN_H, Math.min(MAX_H, h + dh));
        flat(ri(2, 4));
      }
    },
    spikes() {
      flat(ri(2, 3));
      maybeHint('spikes');
      const s = ri(1, spikeMax);
      for (let i = 0; i < s; i++) { cols.push(ground(h)); putOnTop(cols.length - 1, '^'); }
      flat(ri(2, 3));
    },
    platforms() {
      flat(3);
      maybeHint('platforms');
      const n = ri(2, 2 + Math.floor(d * 3));
      let surf = h;
      for (let i = 0; i < n; i++) {
        const g = ri(1, Math.min(maxGap, 3));
        const dh = pickRise(surf, g);
        for (let k = 0; k < g; k++) cols.push(pit());
        surf += dh;
        const w = ri(2, 3);
        for (let k = 0; k < w; k++) {
          const c = pit();
          c[H - surf] = '=';
          cols.push(c);
        }
      }
      const g = ri(1, Math.min(maxGap, 3));
      const dh = pickRise(surf, g);
      for (let k = 0; k < g; k++) cols.push(pit());
      h = surf + dh;
      flat(3);
    },
    vault() {
      // Crates to vault over. Later on, some have spikes or another crate right after.
      const n = ri(1, 1 + Math.floor(d * 3));
      flat(ri(3, 4));
      maybeHint('vault', -2);
      for (let i = 0; i < n; i++) {
        cols.push(ground(h)); putOnTop(cols.length - 1, 'X');
        if (d > 0.2 && rng() < 0.35) { cols.push(ground(h)); putOnTop(cols.length - 1, '^'); }
        else if (d > 0.1 && rng() < 0.3) { cols.push(ground(h)); putOnTop(cols.length - 1, 'X'); putOnTop(cols.length - 1, 'X', h + 1); }
        flat(ri(3, 4));
      }
    },
    ledge() {
      // A wall a bit too tall to jump: grab the edge and climb up.
      const rise = index < 10 ? 3 : ri(3, 4);
      if (h + rise > MAX_H) { SEGMENTS.steps(); return; }
      flat(ri(3, 4));
      maybeHint('ledge', -2);
      if (d > 0.25 && rng() < 0.5) for (let i = 0; i < ri(1, 2); i++) cols.push(pit());
      h += rise;
      flat(ri(3, 5));
    },
    climb() {
      // A big wall: kick up it, wall jump after wall jump.
      const rise = ri(5, 6);
      if (h + rise > MAX_H) { SEGMENTS.ledge(); return; }
      flat(ri(3, 4));
      maybeHint('climb', -2);
      if (d > 0.3 && rng() < 0.5) for (let i = 0; i < 2; i++) cols.push(pit());
      h += rise;
      flat(ri(3, 5));
    },
    tunnel() {
      // A low ceiling to slide under. It's thin enough to climb over the top, too.
      flat(ri(2, 3));
      maybeHint('tunnel', -1);
      const len = ri(3, 5 + Math.floor(d * 3));
      const thick = ri(2, 3);
      for (let i = 0; i < len; i++) {
        const c = ground(h);
        for (let r = H - h - 1 - thick; r < H - h - 1; r++) c[r] = '#';
        cols.push(c);
      }
      flat(ri(2, 3));
    },
    hill() {
      // Up one side and down the other. In the Rooftops these are pointy roofs.
      const up = h + 2 <= MAX_H && d > 0.15 && rng() < 0.5 ? 2 : 1;
      if (h + up > MAX_H) { SEGMENTS.steps(); return; }
      flat(ri(2, 3));
      maybeHint('hill');
      for (let k = 0; k < up; k++) { cols.push(ground(h)); putOnTop(cols.length - 1, '/'); h++; }
      flat(theme.roofs ? ri(0, 1) : ri(1, 3));
      const down = Math.max(1, Math.min(h - MIN_H, up + choose([-1, 0, 0, 1])));
      for (let k = 0; k < down; k++) { h--; cols.push(ground(h)); putOnTop(cols.length - 1, '\\'); }
      flat(ri(2, 3));
    },
    dune() {
      // Gentle bumps, one after another: sand dunes, or puffy cloud bumps.
      flat(ri(1, 2));
      maybeHint('dune');
      const n = ri(1, 2 + Math.floor(d * 2));
      for (let i = 0; i < n && h < MAX_H; i++) {
        cols.push(ground(h)); putOnTop(cols.length - 1, 'a');
        cols.push(ground(h)); putOnTop(cols.length - 1, 'A');
        h++;
        flat(ri(0, 2));
        h--;
        cols.push(ground(h)); putOnTop(cols.length - 1, 'Z');
        cols.push(ground(h)); putOnTop(cols.length - 1, 'z');
        // Later on, a cactus waits in the dip between two dunes
        if (weights.cactus && d > 0.3 && i < n - 1 && rng() < 0.4) {
          cols.push(ground(h)); putOnTop(cols.length - 1, 'Y');
          flat(1);
        } else {
          flat(ri(0, 1));
        }
      }
      flat(ri(1, 2));
    },
    bush() {
      // Bushes are wide and low: hop over them, or run right across the top.
      flat(ri(2, 3));
      maybeHint('bush', -1);
      const n = ri(1, d > 0.2 ? 2 : 1);
      for (let i = 0; i < n; i++) {
        const w = ri(2, 3);
        for (let k = 0; k < w; k++) { cols.push(ground(h)); putOnTop(cols.length - 1, 'U'); }
        if (d > 0.35 && rng() < 0.3) { cols.push(ground(h)); putOnTop(cols.length - 1, '^'); }
        flat(ri(2, 4));
      }
    },
    cactus() {
      // Cactuses are thin but tall. The big ones need your biggest jump!
      flat(ri(2, 3));
      maybeHint('cactus', -1);
      const n = ri(1, 1 + Math.floor(d * 2.5));
      for (let i = 0; i < n; i++) {
        cols.push(ground(h)); putOnTop(cols.length - 1, 'Y');
        if (d > 0.3 && rng() < 0.5) putOnTop(cols.length - 1, 'Y', h + 1);
        flat(ri(3, 4));
      }
    },
    crystals() {
      // Like spikes, but taller: jump a little sooner.
      flat(ri(2, 3));
      maybeHint('crystals');
      const n = ri(1, Math.min(2, spikeMax));
      for (let i = 0; i < n; i++) { cols.push(ground(h)); putOnTop(cols.length - 1, 'K'); }
      flat(ri(2, 3));
    },
    hang() {
      // A ceiling with icicles (or stalactites) hanging down. Run under them, don't jump!
      // There are three empty rows under the icicles, so running and vaulting are safe.
      flat(ri(2, 3));
      maybeHint('hang', -1);
      const len = ri(4, 5 + Math.floor(d * 4));
      const crate = d > 0.3 && rng() < 0.5 ? ri(1, len - 2) : -1;
      for (let i = 0; i < len; i++) {
        const c = ground(h);
        c[H - h - 6] = '#'; c[H - h - 5] = '#';
        c[H - h - 4] = 'V';
        cols.push(c);
        if (i === crate) putOnTop(cols.length - 1, 'X');
      }
      flat(ri(2, 3));
    },
    spring() {
      if (h > MAX_H - 5) { SEGMENTS.steps(); return; }
      flat(2);
      maybeHint('spring');
      cols.push(ground(h));
      putOnTop(cols.length - 1, 'B');
      flat(1);
      h += ri(4, 5);
      flat(ri(4, 6));
    },
  };

  const pickSegment = () => {
    const entries = Object.entries(weights);
    let total = entries.reduce((s, [, v]) => s + v, 0);
    let r = rng() * total;
    for (const [k, v] of entries) { if ((r -= v) < 0) return k; }
    return entries[0][0];
  };

  // Start
  flat(index === 0 ? 12 : 6);
  putOnTop(2, 'S');
  if (index === 0) {
    hints.push({ x: 2, y: H - h - 3, text: 'Press ➡️ to run!' });
  } else if (lvl === 0) {
    hints.push({ x: 2, y: H - h - 3, text: theme.intro });
    lastHint = 2;
  }

  // The level that introduces a new obstacle always has one, so its hint shows up.
  const intro = Object.keys(weights).filter(seg => ownHint(seg) || gameHint(seg));
  let firstSeg = true;
  while (cols.length < targetLen) {
    if (cols.length - lastCheckpoint >= 20) {
      flat(1);
      putOnTop(cols.length - 1, 'C');
      lastCheckpoint = cols.length;
    }
    // Room between hints, so their bubbles don't pile on top of each other
    if (intro.length) flat(Math.max(0, lastHint + 12 - cols.length));
    const seg = intro.length ? intro.shift() : pickSegment();
    if (index === 0 && firstSeg) hint('Press JUMP to jump!', -3);
    firstSeg = false;
    SEGMENTS[seg]();
  }

  // Finish: the magic gem
  flat(3);
  const gemCol = cols.length + 3;
  flat(9);
  cols[gemCol][H - h - 2] = 'G';
  if (index === 0) hints.push({ x: gemCol - 4, y: H - h - 4, text: 'Grab the magic gem! 💎' });

  const W = cols.length;
  const grid = [];
  for (let r = 0; r < H; r++) {
    let row = '';
    for (let c = 0; c < W; c++) row += cols[c][r];
    grid.push(row);
  }
  return buildLevel(index, grid, hints);
}

// Turn a grid of letters into a playable level.
export function buildLevel(index, grid, hints = []) {
  const theme = WORLDS[Math.floor(index / LEVELS_PER_WORLD)];
  const H = grid.length;
  const W = grid[0].length;
  let start = { x: 2.5, y: H - 3 };
  let gem = null;
  const rows = grid.map(r => r.split(''));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (rows[y][x] === 'S') { start = { x: x + 0.5, y: y + 1 }; rows[y][x] = '.'; }
      if (rows[y][x] === 'G') gem = { x: x + 0.5, y: y + 0.5 };
    }
  }
  const g = rows.map(r => r.join(''));
  return {
    index, theme, W, H,
    grid: g,
    cells: makeCells(g),
    start, gem, hints,
    slippery: !!theme.slippery,
  };
}

const cache = new Map();
export function getLevel(index) {
  if (!cache.has(index)) cache.set(index, generateLevel(index));
  return cache.get(index);
}
