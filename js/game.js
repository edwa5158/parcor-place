// Playing a level: hearts, checkpoints, the camera, and drawing everything.

import { P, DT, createPlayer, step, inTunnel, isSolid } from './physics.js';
import { getLevel } from './levels.js';
import { drawDragon } from './dragon.js';
import { drawBackground, drawTiles, drawHints, drawGem } from './render.js';
import { input } from './input.js';
import { sfx } from './audio.js';

export const MAX_HEARTS = 3;

export class Game {
  // hooks: { onHearts(n), onGem(), onLevelLost() }
  constructor(canvas, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.running = false;
    this.paused = false;
    this.particles = [];
    this.raf = 0;
    this.quality = 0; // 0 = sharpest; goes up if the iPad is having a hard time keeping up
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, [2, 1.5, 1][this.quality]);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.dpr = dpr;
    this.w = w; this.h = h;
    // Show about 11 tiles tall (or 15 wide on a tall, narrow screen).
    this.s = Math.max(24, Math.floor(Math.min(h / 11, w / 15)));
  }

  start(index, dragon) {
    this.level = getLevel(index);
    this.index = index;
    this.dragon = dragon;
    this.hearts = MAX_HEARTS;
    this.checkpoint = { ...this.level.start };
    this.state = { checkpoints: new Set(), springSquash: {}, gemTaken: false };
    this.particles = [];
    this.respawn(true);
    this.camX = this.targetCamX();
    this.camY = this.targetCamY();
    this.prev = null;
    this.time = 0;
    this.acc = 0;
    this.freeze = 0;
    this.slowFrames = 0;
    this.frames = 0;
    this.finished = false;
    this.paused = false;
    this.hooks.onHearts(this.hearts);
    if (!this.running) {
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(t => this.frame(t));
    }
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  respawn(fresh) {
    this.player = createPlayer(this.checkpoint.x, this.checkpoint.y);
    this.invincible = fresh ? 0 : 1.5;
    this.walk = 0;
    this.roll = 0;
    this.squash = 0;
    this.dust = 0;
    this.prev = null;
  }

  targetCamX() {
    const vw = this.w / this.s;
    const x = this.player.x - vw * 0.38;
    return Math.max(0, Math.min(this.level.W - vw, x));
  }

  targetCamY() {
    const vh = this.h / this.s;
    if (vh >= this.level.H) return this.level.H - vh;
    const y = this.player.y - vh * 0.62;
    return Math.max(0, Math.min(this.level.H - vh, y));
  }

  frame(now) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(t => this.frame(t));
    const raw = (now - this.last) / 1000;
    const dt = Math.min(0.05, raw);
    this.last = now;
    if (!this.paused) {
      this.time += dt;
      this.acc += dt;
      while (this.acc >= DT) {
        this.update();
        this.acc -= DT;
      }
      this.watchSpeed(raw);
    }
    // Draw part-way between the last two physics steps, so the motion is smooth
    // even when a screen frame doesn't line up with the physics steps.
    this.draw(this.paused ? 1 : this.acc / DT);
  }

  // If lots of frames are slow, draw at a lower resolution so the game stays smooth.
  watchSpeed(raw) {
    if (this.freeze > 0 || raw > 0.25) return;
    this.frames++;
    if (raw > 1 / 45) this.slowFrames++;
    if (this.frames >= 180) {
      if (this.slowFrames > 45 && this.quality < 2) { this.quality++; this.resize(); }
      this.frames = 0;
      this.slowFrames = 0;
    }
  }

  update() {
    this.prev = { x: this.player.x, y: this.player.y, camX: this.camX, camY: this.camY };
    this.updateParticles();
    for (const k in this.state.springSquash) {
      this.state.springSquash[k] = Math.max(0, this.state.springSquash[k] - DT * 4);
    }
    if (this.freeze > 0) {
      this.freeze -= DT;
      if (this.freeze <= 0 && this.afterFreeze) { const f = this.afterFreeze; this.afterFreeze = null; f(); }
      return;
    }
    if (this.finished) return;
    const p = this.player;
    const events = step(p, input, this.level, P);
    if (this.invincible > 0) this.invincible -= DT;
    if (p.onGround && Math.abs(p.vx) > 0.5) this.walk += DT * Math.abs(p.vx) * 2.2;
    this.roll = Math.max(0, this.roll - DT);
    this.squash *= Math.pow(0.002, DT);

    // Dust while sliding down a wall or under a tunnel
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const sliding = (p.wall && dir === p.wall && p.vy > 0) || (inTunnel(this.level, p) && Math.abs(p.vx) > 2);
    if (sliding && (this.dust -= DT) <= 0) {
      this.dust = 0.06;
      if (p.wall) this.puff(p.x + p.wall * P.W / 2, p.y - 0.6, 1);
      else this.puff(p.x - Math.sign(p.vx) * 0.3, p.y, 1);
    }

    for (const e of events) {
      if (e === 'jump') { sfx.jump(); this.puff(p.x, p.y, 4); this.squash = -0.7; this.roll = 0; }
      else if (e === 'walljump') { sfx.walljump(); this.puff(p.x + p.wallSide * P.W / 2, p.y - 0.5, 5); this.squash = -0.6; }
      else if (e === 'grab') sfx.grab();
      else if (e === 'vault') { sfx.vault(); this.puff(p.x + p.facing * 0.4, p.y - 0.9, 3); }
      else if (e === 'spring') {
        sfx.spring();
        this.squash = -1;
        for (const key of this.springKeysNear(p)) this.state.springSquash[key] = 1;
      }
      else if (e === 'land') {
        this.puff(p.x, p.y, 3);
        // A big fall while running turns into a parkour roll
        if (p.landVy > 16 && Math.abs(p.vx) > 3) { this.roll = 0.36; sfx.roll(); this.puff(p.x, p.y, 4); }
        else this.squash = Math.min(1, p.landVy / 18);
      }
      else if (e === 'fell') { this.ouch(); return; }
      else if (e === 'hazard') { if (this.invincible <= 0) { this.ouch(); return; } }
      else if (e === 'gem') { this.collectGem(); return; }
      else if (Array.isArray(e) && e[0] === 'checkpoint') {
        const key = `${e[1]},${e[2]}`;
        if (!this.state.checkpoints.has(key)) {
          this.state.checkpoints.add(key);
          this.checkpoint = { x: e[1] + 0.5, y: e[2] + 1 };
          sfx.checkpoint();
          this.sparkle(e[1] + 0.5, e[2] - 0.5, 14, ['#ffd600', '#fff']);
        }
      }
    }

    const ease = 1 - Math.pow(0.0001, DT);
    this.camX += (this.targetCamX() - this.camX) * ease;
    this.camY += (this.targetCamY() - this.camY) * ease;
  }

  springKeysNear(p) {
    const keys = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tx = Math.floor(p.x) + dx, ty = Math.floor(p.y) + dy;
        if (this.level.grid[ty] && this.level.grid[ty][tx] === 'B') keys.push(`${tx},${ty}`);
      }
    }
    return keys;
  }

  ouch() {
    this.hearts--;
    this.hooks.onHearts(this.hearts);
    sfx.hurt();
    this.sparkle(this.player.x, this.player.y - 0.5, 16, ['#ff5252', '#ffffff']);
    this.shake = 0.3;
    if (this.hearts > 0) {
      this.freeze = 0.5;
      this.afterFreeze = () => this.respawn(false);
    } else {
      this.freeze = 1.6;
      sfx.oops();
      this.hooks.onLevelLost();
      this.afterFreeze = () => {
        this.hearts = MAX_HEARTS;
        this.hooks.onHearts(this.hearts);
        this.checkpoint = { ...this.level.start };
        this.state.checkpoints.clear();
        this.respawn(true);
      };
    }
  }

  collectGem() {
    this.finished = true;
    this.state.gemTaken = true;
    sfx.gem();
    const g = this.level.gem;
    this.sparkle(g.x, g.y, 40, ['#e040fb', '#ffffff', '#ffd600', '#40c4ff']);
    this.freeze = 1.3;
    this.afterFreeze = () => this.hooks.onGem();
  }

  // --- Particles ---
  puff(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ x, y: y - 0.05, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 1.5, life: 0.4, max: 0.4, color: 'rgba(255,255,255,0.8)', size: 0.12 });
    }
  }
  sparkle(x, y, n, colors) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 1, max: 1, color: colors[i % colors.length], size: 0.12 + Math.random() * 0.1, gravity: true });
    }
  }
  updateParticles() {
    let n = 0;
    for (const q of this.particles) {
      q.life -= DT;
      q.x += q.vx * DT; q.y += q.vy * DT;
      if (q.gravity) q.vy += 9 * DT;
      if (q.life > 0) this.particles[n++] = q;
    }
    this.particles.length = n;
  }

  // Which way the dragon is posed right now, for drawing.
  pose() {
    const p = this.player;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const speed = Math.abs(p.vx) / P.RUN;
    const o = {
      t: this.time, walk: this.walk, vy: p.vy, speed, squash: this.squash,
      moving: Math.abs(p.vx) > 0.5, airborne: !p.onGround, facing: p.facing,
    };
    if (p.climb) { o.pose = 'climb'; o.poseT = Math.min(1, p.climb.t / P.CLIMB_TIME); o.facing = p.climb.dir; }
    else if (this.roll > 0) { o.pose = 'roll'; o.poseT = 1 - this.roll / 0.36; }
    else if (p.vault > 0 && !p.onGround) { o.pose = 'vault'; o.poseT = Math.min(1, 1 - p.vault / 0.3); }
    else if (p.wall && dir === p.wall && p.vy > -4) { o.pose = 'wall'; o.facing = p.wall; }
    else if (!p.onGround) o.pose = p.vy < 0 ? 'jump' : 'fall';
    else if (inTunnel(this.level, p)) o.pose = 'slide';
    else o.pose = o.moving ? 'run' : 'idle';
    return o;
  }

  // How far below the dragon the ground is (for its shadow), or -1 if there's none close.
  groundBelow(x, y) {
    for (let ty = Math.floor(y); ty < Math.min(this.level.H, y + 6); ty++) {
      if (isSolid(this.level, Math.floor(x), ty)) return ty;
    }
    return -1;
  }

  draw(alpha = 1) {
    const { ctx, s, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const pv = this.prev || { x: this.player.x, y: this.player.y, camX: this.camX, camY: this.camY };
    const lerp = (a, b) => a + (b - a) * alpha;
    // Line the camera up with real screen pixels so the tiles don't shimmer
    const px = Math.round(lerp(pv.camX, this.camX) * s * this.dpr) / (s * this.dpr);
    const py = Math.round(lerp(pv.camY, this.camY) * s * this.dpr) / (s * this.dpr);
    let shakeX = 0, shakeY = 0;
    if (this.shake > 0) {
      this.shake -= 1 / 60;
      shakeX = Math.round((Math.random() - 0.5) * 10); shakeY = Math.round((Math.random() - 0.5) * 10);
    }
    drawBackground(ctx, this.level.theme, w, h, px * s, this.time);
    ctx.save();
    ctx.translate(shakeX, shakeY);
    const vw = w / s, vh = h / s;
    drawTiles(ctx, this.level, px, py, s, vw, vh, this.time, this.state);
    drawHints(ctx, this.level, px, py, s);

    // Dragon
    const p = this.player;
    const dx = lerp(pv.x, p.x), dy = lerp(pv.y, p.y);
    const blinkOut = this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0;
    const hidden = this.freeze > 0 && !this.finished;
    if (!hidden) {
      const gy = this.groundBelow(dx, dy);
      if (gy >= 0) {
        const k = Math.max(0, 1 - (gy - dy) / 5);
        ctx.fillStyle = `rgba(0,0,0,${0.22 * k})`;
        ctx.beginPath();
        ctx.ellipse((dx - px) * s, (gy - py) * s, s * 0.42 * (0.5 + k * 0.5), s * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!blinkOut && !hidden) {
      const o = this.pose();
      drawDragon(ctx, this.dragon, (dx - px) * s, (dy - py) * s, s * 0.95, o.facing, o);
    }

    for (const q of this.particles) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc((q.x - px) * s, (q.y - py) * s, q.size * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ---------- The ending: the spell is broken and the dragon can fly! ----------
export class FlyScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
  }
  start(dragon) {
    this.dragon = dragon;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.w = this.canvas.clientWidth; this.h = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
    this.s = Math.min(this.h / 6, this.w / 9);
    this.x = this.w * 0.3; this.y = this.h * 0.55;
    this.vx = 0; this.vy = 0; this.facing = 1;
    this.t = 0; this.scroll = 0;
    this.stars = [];
    this.confetti = [];
    this.collected = 0;
    this.jumpWas = false;
    for (let i = 0; i < 80; i++) this.addConfetti(Math.random() * this.h);
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(t => this.frame(t));
  }
  stop() { this.running = false; }
  addConfetti(y = -10) {
    const colors = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb', '#ffffff'];
    this.confetti.push({ x: Math.random() * this.w, y, vy: 40 + Math.random() * 60, a: Math.random() * 6, c: colors[Math.floor(Math.random() * colors.length)] });
  }
  frame(now) {
    if (!this.running) return;
    requestAnimationFrame(t => this.frame(t));
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    const sp = this.s * 5;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) this.facing = dir;
    this.vx += (dir * sp - this.vx) * Math.min(1, dt * 4);
    if (input.jump && !this.jumpWas) { this.vy = -this.s * 4.5; sfx.flap(); }
    this.jumpWas = input.jump;
    if (input.jump) this.vy -= this.s * 6 * dt;
    this.vy += this.s * 5 * dt;
    this.vy = Math.max(-this.s * 6, Math.min(this.s * 3, this.vy));
    this.x = Math.max(this.s, Math.min(this.w - this.s, this.x + this.vx * dt));
    this.y = Math.max(this.s * 1.2, Math.min(this.h - this.s * 0.3, this.y + this.vy * dt));
    if (this.y >= this.h - this.s * 0.3) this.vy = Math.min(0, this.vy);
    this.scroll += dt * this.s * 1.5;

    if (Math.random() < dt * 1.2) this.stars.push({ x: this.w + 30, y: this.s + Math.random() * (this.h - this.s * 2) });
    for (const st of this.stars) st.x -= this.s * 1.5 * dt;
    for (const st of this.stars) {
      if (!st.got && Math.hypot(st.x - this.x, st.y - (this.y - this.s * 0.5)) < this.s * 0.8) {
        st.got = true; this.collected++; sfx.sparkle();
      }
    }
    this.stars = this.stars.filter(st => st.x > -40 && !st.got);
    for (const c of this.confetti) { c.y += c.vy * dt; c.a += dt * 3; }
    this.confetti = this.confetti.filter(c => c.y < this.h + 20);
    if (this.confetti.length < 60) this.addConfetti();
    this.draw();
  }
  draw() {
    const { ctx, w, h, s } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#4fc3f7'); g.addColorStop(1, '#e1f5fe');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Rainbow
    ['#ff5252', '#ffab40', '#ffee58', '#69f0ae', '#40c4ff', '#b388ff'].forEach((c, k) => {
      ctx.strokeStyle = c; ctx.globalAlpha = 0.45; ctx.lineWidth = s * 0.25;
      ctx.beginPath(); ctx.arc(w * 0.5, h * 1.1, h * 0.85 - k * s * 0.25, Math.PI, Math.PI * 2); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    // Clouds
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 260 - this.scroll * (0.5 + (i % 3) * 0.3)) % (w + 300) + w + 300) % (w + 300) - 150;
      const cy = h * (0.15 + ((i * 37) % 70) / 100);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2); ctx.arc(cx + s * 0.6, cy - s * 0.25, s * 0.65, 0, Math.PI * 2); ctx.arc(cx + s * 1.2, cy, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const st of this.stars) drawGem(ctx, st.x, st.y, s * 0.8, this.t);
    for (const c of this.confetti) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
      ctx.fillStyle = c.c; ctx.fillRect(-4, -2, 8, 4); ctx.restore();
    }
    drawDragon(ctx, this.dragon, this.x, this.y, s, this.facing, { t: this.t, flying: true, airborne: true });
  }
}
