// Robot dragon: searches for a way to beat every level.
// It plays with weaker jumps and slower running than the real dragon, so every
// level has some wiggle room for a kid's fingers.
//
//   node tools/verify.mjs          check all 100 levels
//   node tools/verify.mjs 12       check one level and print it

import { getLevel, TOTAL_LEVELS } from '../js/levels.js';
import { P, createPlayer, step } from '../js/physics.js';

const WEAK = { ...P, JUMP_V: P.JUMP_V * 0.94, RUN: P.RUN * 0.92, SPRING_V: P.SPRING_V * 0.95 };
const STEPS_PER_ACTION = 12; // 0.1 seconds
const ACTIONS = [
  { right: true, left: false, jump: false },
  { right: true, left: false, jump: true },
  { right: false, left: false, jump: false },
  { right: false, left: false, jump: true },
  { right: false, left: true, jump: false },
  { right: false, left: true, jump: true },
];

function key(p) {
  return [
    Math.round(p.x * 5), Math.round(p.y * 5), Math.round(p.vy), Math.round(p.vx),
    p.onGround ? 1 : 0, p.jumpWasHeld ? 1 : 0, p.canCut ? 1 : 0,
  ].join(',');
}

export function solve(level, phys = WEAK, maxNodes = 400000) {
  // Best-first: always keep exploring from the state furthest to the right.
  const start = createPlayer(level.start.x, level.start.y);
  const buckets = [];
  let top = 0;
  const push = p => {
    const b = Math.max(0, Math.floor(p.x * 2));
    (buckets[b] ||= []).push(p);
    top = Math.max(top, b);
  };
  const pop = () => {
    for (let b = Math.min(top, buckets.length - 1); b >= 0; b--) {
      if (buckets[b] && buckets[b].length) { top = b; return buckets[b].pop(); }
    }
    return null;
  };
  push(start);
  const seen = new Set([key(start)]);
  let cur;
  while ((cur = pop()) && seen.size < maxNodes) {
    for (const a of ACTIONS) {
      const p = { ...cur };
      let dead = false, won = false;
      for (let i = 0; i < STEPS_PER_ACTION && !dead && !won; i++) {
        for (const e of step(p, a, level, phys)) {
          if (e === 'hazard' || e === 'fell') dead = true;
          else if (e === 'gem') won = true;
        }
      }
      if (won) return { ok: true, nodes: seen.size };
      if (dead) continue;
      const k = key(p);
      if (seen.has(k)) continue;
      seen.add(k);
      push(p);
    }
  }
  return { ok: false, nodes: seen.size };
}

const only = process.argv[2] !== undefined ? Number(process.argv[2]) : null;
const list = only !== null ? [only] : [...Array(TOTAL_LEVELS).keys()];
let failed = 0;
for (const i of list) {
  const level = getLevel(i);
  const r = solve(level);
  if (!r.ok) failed++;
  console.log(`level ${String(i + 1).padStart(3)}  world ${level.theme.name.padEnd(15)} width ${String(level.W).padStart(3)}  ${r.ok ? 'OK' : 'STUCK'}  (${r.nodes} states)`);
  if (only !== null) console.log(level.grid.join('\n'));
}
console.log(failed ? `\n${failed} level(s) could not be beaten!` : '\nAll levels can be beaten.');
process.exit(failed ? 1 : 0);
