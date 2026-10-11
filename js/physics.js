// Dragon movement and collisions. Distances are in tiles, time in seconds.
// y grows downward. The player's (x, y) is the middle of their feet.

export const P = {
  GRAVITY: 38,
  JUMP_V: 14.5,     // about 2.7 tiles high
  SPRING_V: 21,     // about 5.8 tiles high
  RUN: 6.5,
  ACC_GROUND: 70,
  ACC_AIR: 40,
  FRICTION: 60,
  ICE_ACC: 18,
  ICE_FRICTION: 7,
  MAX_FALL: 22,
  COYOTE: 0.1,
  BUFFER: 0.12,
  JUMP_CUT: 0.45,
  W: 0.8,
  H: 0.9,
};

export const DT = 1 / 120;

export function createPlayer(x, y) {
  return { x, y, vx: 0, vy: 0, onGround: true, coyote: 0, buffer: 0, facing: 1, jumpWasHeld: false, canCut: false };
}

export function tileAt(level, tx, ty) {
  if (ty < 0 || ty >= level.H) return '.';
  if (tx < 0 || tx >= level.W) return '#'; // walls at the left and right ends
  return level.grid[ty][tx];
}

function isSolid(level, tx, ty) {
  const t = tileAt(level, tx, ty);
  return t === '#' || t === '=';
}

function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

const EPS = 1e-4;

// Advance one fixed step. `input` is { left, right, jump } (true while held).
// Returns a list of events: 'jump', 'spring', 'land', 'hazard', 'fell', 'gem', ['checkpoint', tx, ty].
export function step(p, input, level, phys = P) {
  const events = [];
  const dt = DT;
  const slippery = level.slippery;

  // Jump press buffering
  if (input.jump && !p.jumpWasHeld) p.buffer = phys.BUFFER;
  else p.buffer = Math.max(0, p.buffer - dt);
  p.jumpWasHeld = input.jump;

  // Horizontal speed
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir) p.facing = dir;
  const target = dir * phys.RUN;
  let acc;
  if (p.onGround) {
    if (slippery) acc = dir ? phys.ICE_ACC : phys.ICE_FRICTION;
    else acc = dir ? phys.ACC_GROUND : phys.FRICTION;
  } else {
    acc = phys.ACC_AIR;
  }
  if (p.vx < target) p.vx = Math.min(target, p.vx + acc * dt);
  else if (p.vx > target) p.vx = Math.max(target, p.vx - acc * dt);

  // Jump
  if (p.buffer > 0 && (p.onGround || p.coyote > 0)) {
    p.vy = -phys.JUMP_V;
    p.buffer = 0;
    p.coyote = 0;
    p.onGround = false;
    p.canCut = true;
    events.push('jump');
  }
  // Let go of jump early for a smaller hop
  if (!input.jump && p.canCut && p.vy < 0) {
    p.vy *= phys.JUMP_CUT;
    p.canCut = false;
  }
  if (p.vy >= 0) p.canCut = false;

  p.vy = Math.min(phys.MAX_FALL, p.vy + phys.GRAVITY * dt);

  const hw = phys.W / 2;

  // Move sideways
  p.x += p.vx * dt;
  {
    const top = Math.floor(p.y - phys.H + EPS);
    const bot = Math.floor(p.y - EPS);
    if (p.vx > 0) {
      const tx = Math.floor(p.x + hw);
      for (let ty = top; ty <= bot; ty++) {
        if (isSolid(level, tx, ty)) { p.x = tx - hw - EPS; p.vx = 0; break; }
      }
    } else if (p.vx < 0) {
      const tx = Math.floor(p.x - hw);
      for (let ty = top; ty <= bot; ty++) {
        if (isSolid(level, tx, ty)) { p.x = tx + 1 + hw + EPS; p.vx = 0; break; }
      }
    }
  }

  // Move up/down
  const wasOnGround = p.onGround;
  p.y += p.vy * dt;
  p.onGround = false;
  {
    const left = Math.floor(p.x - hw + EPS);
    const right = Math.floor(p.x + hw - EPS);
    if (p.vy >= 0) {
      const ty = Math.floor(p.y);
      for (let tx = left; tx <= right; tx++) {
        if (isSolid(level, tx, ty) && !isSolid(level, tx, ty - 1)) {
          if (p.y - p.vy * dt <= ty + EPS * 10) {
            p.y = ty;
            p.vy = 0;
            p.onGround = true;
            break;
          }
        }
      }
    } else {
      const ty = Math.floor(p.y - phys.H);
      for (let tx = left; tx <= right; tx++) {
        if (isSolid(level, tx, ty)) { p.y = ty + 1 + phys.H; p.vy = 0; break; }
      }
    }
  }
  if (p.onGround && !wasOnGround) events.push('land');
  if (p.onGround) p.coyote = phys.COYOTE;
  else p.coyote = Math.max(0, p.coyote - dt);

  // Things you touch: spikes, lava, springs, checkpoints, the gem.
  // The hitbox for ouchies is a little smaller than the dragon, to be kind.
  const bx = p.x - hw + 0.1, by = p.y - phys.H + 0.1, bw = phys.W - 0.2, bh = phys.H - 0.1;
  const tx0 = Math.floor(p.x - hw), tx1 = Math.floor(p.x + hw);
  const ty0 = Math.floor(p.y - phys.H - 0.3), ty1 = Math.floor(p.y); // -0.3: the gem reaches down a little
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = tileAt(level, tx, ty);
      if (t === '^') {
        if (overlaps(bx, by, bw, bh, tx + 0.15, ty + 0.45, 0.7, 0.55)) events.push('hazard');
      } else if (t === '~') {
        if (overlaps(bx, by, bw, bh, tx, ty + 0.35, 1, 0.65)) events.push('hazard');
      } else if (t === 'B') {
        if (p.vy >= 0 && overlaps(p.x - hw, p.y - phys.H, phys.W, phys.H, tx + 0.1, ty + 0.55, 0.8, 0.45)) {
          p.vy = -phys.SPRING_V;
          p.onGround = false;
          p.coyote = 0;
          p.canCut = false;
          events.push('spring');
        }
      } else if (t === 'C') {
        if (overlaps(p.x - hw, p.y - phys.H, phys.W, phys.H, tx + 0.2, ty - 1, 0.6, 2)) events.push(['checkpoint', tx, ty]);
      } else if (t === 'G') {
        if (overlaps(p.x - hw, p.y - phys.H, phys.W, phys.H, tx, ty - 0.2, 1, 1.4)) events.push('gem');
      }
    }
  }
  if (p.y > level.H + 2) events.push('fell');

  return events;
}
