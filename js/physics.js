// Dragon movement and collisions. Distances are in tiles, time in seconds.
// y grows downward. The player's (x, y) is the middle of their feet.
//
// Parkour moves (all with the same three buttons):
//   wall slide   fall against a wall while holding toward it
//   wall jump    press JUMP on a wall (hold toward it to kick up the same wall)
//   ledge grab   jump at a wall that's a bit too tall and you climb up onto it
//   vault        run fast into a crate and you hop right over it

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
  WALL_SLIDE: 3,      // slowest fall while sliding down a wall
  WALL_COYOTE: 0.12,  // you can still wall jump this long after leaving a wall
  WALL_JUMP_V: 13.5,  // kick away from the wall
  WALL_JUMP_X: 7,
  WALL_CLIMB_V: 12.5, // kick up the same wall
  WALL_CLIMB_X: 3,
  WALL_LOCK: 0.12,    // after a wall jump the buttons can't steer for a moment
  LEDGE_REACH: 1.5,   // how far above your feet you can grab a ledge
  CLIMB_TIME: 0.2,
  VAULT_V: 11,        // about 1.6 tiles high
  VAULT_MIN: 0.7,     // you need to be running at least this fast (times RUN)
};

export const DT = 1 / 120;

export function createPlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0, onGround: true, coyote: 0, buffer: 0, facing: 1, jumpWasHeld: false, canCut: false,
    wall: 0, wallCoyote: 0, wallSide: 0, lock: 0, climb: null, vault: 0, landVy: 0,
  };
}

export function tileAt(level, tx, ty) {
  if (ty < 0 || ty >= level.H) return '.';
  if (tx < 0 || tx >= level.W) return '#'; // walls at the left and right ends
  return level.grid[ty][tx];
}

export function isSolid(level, tx, ty) {
  const t = tileAt(level, tx, ty);
  return t === '#' || t === '=' || t === 'X';
}

function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

const EPS = 1e-4;

// Is there a wall right in front of the dragon (on side `dir`)?
function wallAt(level, p, dir, phys) {
  const tx = Math.floor(p.x + dir * (phys.W / 2 + 0.06));
  const top = Math.floor(p.y - phys.H + 0.2), bot = Math.floor(p.y - 0.2);
  for (let ty = top; ty <= bot; ty++) if (isSolid(level, tx, ty)) return true;
  return false;
}

// A ledge on side `dir` the dragon can climb onto: solid with room to stand on top,
// and its top no higher than LEDGE_REACH above the dragon's feet.
function findLedge(level, p, dir, phys) {
  const tx = Math.floor(p.x + dir * (phys.W / 2 + 0.06));
  const col = Math.floor(p.x);
  const lo = Math.floor(p.y - 0.05);
  const hi = Math.ceil(p.y - phys.LEDGE_REACH);
  for (let ty = lo; ty >= hi; ty--) {
    if (!isSolid(level, tx, ty)) continue;
    if (isSolid(level, tx, ty - 1)) continue;
    if (p.y - ty < 0.05) continue;
    // Nothing above the dragon's head on the way up
    let clear = true;
    for (let r = Math.floor(p.y - phys.H); r >= ty - 1; r--) if (isSolid(level, col, r)) clear = false;
    if (clear) return { tx, ty };
  }
  return null;
}

// Advance one fixed step. `input` is { left, right, jump } (true while held).
// Returns a list of events: 'jump', 'walljump', 'grab', 'vault', 'spring', 'land', 'hazard', 'fell', 'gem',
// ['checkpoint', tx, ty].
export function step(p, input, level, phys = P) {
  const events = [];
  const dt = DT;
  const slippery = level.slippery;
  const hw = phys.W / 2;

  // Jump press buffering
  if (input.jump && !p.jumpWasHeld) p.buffer = phys.BUFFER;
  else p.buffer = Math.max(0, p.buffer - dt);
  p.jumpWasHeld = input.jump;

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  // Climbing up onto a ledge: up first, then over the edge.
  if (p.climb) {
    const c = p.climb;
    c.t += dt;
    const k = Math.min(1, c.t / phys.CLIMB_TIME);
    const up = Math.min(1, k / 0.5), over = Math.max(0, (k - 0.5) / 0.5);
    p.y = c.y0 + (c.y1 - c.y0) * up;
    p.x = c.x0 + (c.x1 - c.x0) * over;
    if (k >= 1) {
      p.climb = null;
      p.onGround = true;
      p.coyote = phys.COYOTE;
      p.vx = c.dir * phys.RUN * 0.6;
    }
    return events;
  }

  // Horizontal speed
  p.lock = Math.max(0, p.lock - dt);
  if (dir && !p.lock) p.facing = dir;
  const target = dir * phys.RUN;
  let acc;
  if (p.onGround) {
    if (slippery) acc = dir ? phys.ICE_ACC : phys.ICE_FRICTION;
    else acc = dir ? phys.ACC_GROUND : phys.FRICTION;
  } else {
    acc = phys.ACC_AIR;
  }
  if (!p.lock) {
    if (p.vx < target) p.vx = Math.min(target, p.vx + acc * dt);
    else if (p.vx > target) p.vx = Math.max(target, p.vx - acc * dt);
  }

  // Touching a wall in the air?
  p.wall = 0;
  if (!p.onGround) {
    if (wallAt(level, p, 1, phys)) p.wall = 1;
    else if (wallAt(level, p, -1, phys)) p.wall = -1;
  }
  if (p.wall) { p.wallCoyote = phys.WALL_COYOTE; p.wallSide = p.wall; }
  else p.wallCoyote = Math.max(0, p.wallCoyote - dt);

  // Jump: from the ground first, otherwise off a wall
  if (p.buffer > 0 && (p.onGround || p.coyote > 0)) {
    p.vy = -phys.JUMP_V;
    p.buffer = 0;
    p.coyote = 0;
    p.onGround = false;
    p.canCut = true;
    events.push('jump');
  } else if (p.buffer > 0 && p.wallCoyote > 0) {
    const side = p.wallSide;
    if (dir === side) {
      // Holding toward the wall: a short kick so you come back to the wall higher up
      p.vy = -phys.WALL_CLIMB_V;
      p.vx = -side * phys.WALL_CLIMB_X;
      p.lock = phys.WALL_LOCK * 0.7;
    } else {
      p.vy = -phys.WALL_JUMP_V;
      p.vx = -side * phys.WALL_JUMP_X;
      p.lock = phys.WALL_LOCK;
      p.facing = -side;
    }
    p.buffer = 0;
    p.wallCoyote = 0;
    p.wall = 0;
    p.canCut = false; // tapping JUMP still gives a full wall jump
    events.push('walljump');
  }
  // Let go of jump early for a smaller hop
  if (!input.jump && p.canCut && p.vy < 0) {
    p.vy *= phys.JUMP_CUT;
    p.canCut = false;
  }
  if (p.vy >= 0) p.canCut = false;

  p.vy = Math.min(phys.MAX_FALL, p.vy + phys.GRAVITY * dt);
  // Sliding down a wall you're holding toward
  if (p.wall && dir === p.wall && p.vy > phys.WALL_SLIDE) p.vy = phys.WALL_SLIDE;

  // Ledge grab: in the air, pushing into a wall whose top is within reach
  if (!p.onGround && !p.vault && p.wall && (dir === p.wall || Math.sign(p.vx) === p.wall)) {
    const ledge = findLedge(level, p, p.wall, phys);
    if (ledge) {
      const d = p.wall;
      p.climb = {
        t: 0, dir: d, x0: p.x, y0: p.y,
        x1: d > 0 ? ledge.tx + hw + 0.05 : ledge.tx + 1 - hw - 0.05,
        y1: ledge.ty,
      };
      p.facing = d;
      p.vx = 0; p.vy = 0;
      p.wall = 0; p.wallCoyote = 0;
      p.canCut = false;
      events.push('grab');
      return events;
    }
  }

  // Move sideways
  p.vault = Math.max(0, p.vault - dt);
  p.x += p.vx * dt;
  {
    const top = Math.floor(p.y - phys.H + EPS);
    const bot = Math.floor(p.y - EPS);
    const side = p.vx > 0 ? 1 : p.vx < 0 ? -1 : 0;
    if (side) {
      const tx = Math.floor(p.x + side * hw);
      for (let ty = top; ty <= bot; ty++) {
        if (!isSolid(level, tx, ty)) continue;
        // Vault: running fast into something knee-high with room above it
        if (p.onGround && ty === bot && Math.abs(p.vx) >= phys.RUN * phys.VAULT_MIN &&
            !isSolid(level, tx, ty - 1) && !isSolid(level, tx, ty - 2) &&
            !isSolid(level, Math.floor(p.x), ty - 2)) {
          p.vy = -phys.VAULT_V;
          p.onGround = false;
          p.coyote = 0;
          p.canCut = false;
          p.vault = 0.3;
          events.push('vault');
        }
        p.x = side > 0 ? tx - hw - EPS : tx + 1 + hw + EPS;
        if (!p.vault) p.vx = 0; // keep your speed while vaulting
        break;
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
            p.landVy = p.vy;
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
  if (p.onGround && !wasOnGround) { events.push('land'); p.vault = 0; p.lock = 0; }
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

// Is the dragon in a low tunnel (a ceiling right above its head)? Then it slides.
export function inTunnel(level, p, phys = P) {
  if (!p.onGround) return false;
  const row = Math.floor(p.y - EPS) - 1;
  const ahead = p.x + Math.sign(p.vx || p.facing) * 0.5;
  for (const x of [p.x - phys.W / 2 + 0.05, p.x + phys.W / 2 - 0.05, ahead]) {
    if (isSolid(level, Math.floor(x), row)) return true;
  }
  return false;
}
