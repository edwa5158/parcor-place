// Draws a dragon from its settings. Used by the dragon maker and the game.
// Drawing units: 1 = one tile. (0, 0) is between the dragon's feet; it faces right.
//
// The dragon is built like a puppet: a body with a neck, head, tail, wings and
// legs attached. Each pose (running, wall cling, sliding...) says where the
// body tilts and where the paws go, and the legs bend to reach the paws.

// Older iPads (before iPadOS 16) don't have roundRect, so add it.
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(Array.isArray(r) ? r[0] : r, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}

export const DRAGON_TYPES = [
  { id: 'european', label: 'European' },
  { id: 'eastern', label: 'Eastern' },
  { id: 'baby', label: 'Baby' },
  { id: 'spiky', label: 'Spiky' },
];
export const HORNS = [
  { id: 'none', label: 'None' },
  { id: 'small', label: 'Small' },
  { id: 'long', label: 'Long' },
  { id: 'curly', label: 'Curly' },
  { id: 'antlers', label: 'Antlers' },
];
export const WINGS = [
  { id: 'bat', label: 'Bat' },
  { id: 'feather', label: 'Feather' },
  { id: 'butterfly', label: 'Butterfly' },
  { id: 'tiny', label: 'Tiny' },
  { id: 'none', label: 'None' },
];
export const BODY_COLORS = ['#e53935', '#fb8c00', '#fdd835', '#7cb342', '#2e7d32', '#00acc1', '#1e88e5', '#3949ab', '#8e24aa', '#ec407a', '#546e7a', '#f5f5f5'];
export const EYE_COLORS = ['#fdd835', '#43a047', '#1e88e5', '#e53935', '#8e24aa', '#8d6e63'];

export const DEFAULT_DRAGON = {
  name: '',
  type: 'european',
  body: '#2e7d32',
  wings: 'bat',
  wingColor: '#fdd835',
  horns: 'small',
  eyes: '#fdd835',
};

const RANDOM_NAMES = ['Sparky', 'Blaze', 'Ember', 'Scales', 'Flicker', 'Comet', 'Thunder', 'Ziggy', 'Pebble', 'Rocket', 'Smokey', 'Jade', 'Storm', 'Puff', 'Talon', 'Nova'];
export function randomName() {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

// Colors get lighter or darker many times every frame, always the same few,
// so remember each answer instead of working it out again.
const shades = new Map(); // hex -> Map(amt -> hex)
export function shade(hex, amt) {
  let byAmt = shades.get(hex);
  if (!byAmt) shades.set(hex, (byAmt = new Map()));
  let out = byAmt.get(amt);
  if (out === undefined) byAmt.set(amt, (out = shadeNow(hex, amt)));
  return out;
}

function shadeNow(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = c => Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt))));
  r = f(r); g = f(g); b = f(b);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function mix(a, b, k) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const ch = s => Math.round(((x >> s) & 255) * (1 - k) + ((y >> s) & 255) * k);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

// ---------- Small helpers ----------
const TAU = Math.PI * 2;
const LW = 0.042; // outline thickness
const lerp = (a, b, k) => a + (b - a) * k;
const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = k => k * k * (3 - 2 * k);
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const polar = (a, len) => [Math.cos(a) * len, Math.sin(a) * len];
function rotate(p, a, c = [0, 0]) {
  const cs = Math.cos(a), sn = Math.sin(a), dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs];
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}
function fillStroke(ctx, fill, stroke) {
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = stroke; ctx.stroke();
}

// Smooth path through points (rounded corners at each point).
function smoothTo(ctx, pts, start) {
  if (start) ctx.moveTo(pts[0][0], pts[0][1]); else ctx.lineTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  }
  const l = pts[pts.length - 1];
  ctx.lineTo(l[0], l[1]);
}

// The two edges of a tapered tube along a center line. `side` +1 is to the
// left of the direction of travel (up, when travelling right).
function tubeEdges(pts, hw) {
  const A = [], B = [], N = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
    N.push([ty, -tx]);
    A.push([pts[i][0] + ty * hw[i], pts[i][1] - tx * hw[i]]);
    B.push([pts[i][0] - ty * hw[i], pts[i][1] + tx * hw[i]]);
  }
  return { A, B, N };
}
function tubePath(ctx, pts, hw) {
  const { A, B } = tubeEdges(pts, hw);
  ctx.beginPath();
  smoothTo(ctx, A, true);
  const e = pts[pts.length - 1], r = hw[hw.length - 1];
  const a0 = Math.atan2(A[A.length - 1][1] - e[1], A[A.length - 1][0] - e[0]);
  ctx.arc(e[0], e[1], r, a0, a0 + Math.PI, false);
  smoothTo(ctx, B.slice().reverse(), false);
  ctx.closePath();
}

function cubic(p0, p1, p2, p3, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}

// Two-bone leg: where does the knee go so the paw reaches the target?
// bend +1 puts the knee behind (front legs), -1 in front (back legs).
function solveLeg(hip, target, l1, l2, bend) {
  let dx = target[0] - hip[0], dy = target[1] - hip[1];
  let d = Math.hypot(dx, dy) || 0.0001;
  const dMax = l1 + l2 - 0.001, dMin = Math.abs(l1 - l2) + 0.03;
  const dc = clamp(d, dMin, dMax);
  dx *= dc / d; dy *= dc / d; d = dc;
  const base = Math.atan2(dy, dx);
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const ka = base + bend * Math.acos(cosA);
  return { knee: [hip[0] + Math.cos(ka) * l1, hip[1] + Math.sin(ka) * l1], paw: [hip[0] + dx, hip[1] + dy] };
}

function palette(cfg) {
  const body = cfg.body;
  return {
    body,
    line: shade(body, -0.55),
    light: shade(body, 0.38),
    dark: shade(body, -0.28),
    far: shade(body, -0.25),
    farLine: shade(body, -0.62),
    belly: mix(shade(body, 0.45), '#fff1c4', 0.55),
    bellyLine: mix(shade(body, -0.1), '#c9a062', 0.45),
    wing: cfg.wingColor,
    wingLine: shade(cfg.wingColor, -0.5),
  };
}

// ---------- Wings ----------
// Drawn from the shoulder. `spread` 0 = folded along the back, 1 = wide open.
// `ang` turns the whole wing (0 = arm straight up, negative = toward the tail).
function wingBones(spread) {
  const k = spread;
  const ua = lerp(0.45, 0.15, k);
  const E = [Math.sin(ua) * 0.3, -Math.cos(ua) * 0.3];
  const fa = lerp(-0.85, -0.25, k);
  const W = add(E, [Math.sin(fa) * 0.4, -Math.cos(fa) * 0.4]);
  const fingers = [[lerp(-1.25, -0.85, k), 0.52], [lerp(-1.65, -1.45, k), 0.58], [lerp(-2.05, -2.15, k), 0.5]];
  const tips = fingers.map(([a, l]) => add(W, [Math.sin(a) * l, -Math.cos(a) * l]));
  return { E, W, tips };
}

function drawWing(ctx, style, color, sx, sy, size, spread, ang, back) {
  if (style === 'none') return;
  // Folded wings tuck in smaller so they don't hide the body
  const s = (style === 'tiny' ? size * 0.5 : size) * lerp(0.7, 1, Math.min(1, spread * 1.8));
  const fill = back ? shade(color, -0.3) : color;
  const line = shade(color, -0.55);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(ang);
  ctx.scale(s, s);
  const lw = LW / s;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const { E, W, tips } = wingBones(spread);
  const root = [-0.28, 0.06];

  if (style === 'bat' || style === 'tiny') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(E[0], E[1]);
    ctx.lineTo(W[0], W[1]);
    ctx.lineTo(tips[0][0], tips[0][1]);
    let prev = tips[0];
    for (const p of [tips[1], tips[2], root]) {
      const m = lerp2(prev, p, 0.5);
      const c = lerp2(m, W, 0.28);
      ctx.quadraticCurveTo(c[0], c[1], p[0], p[1]);
      prev = p;
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(W[0], W[1], tips[1][0], tips[1][1] + 0.2);
    g.addColorStop(0, shade(fill, 0.3));
    g.addColorStop(0.55, fill);
    g.addColorStop(1, shade(fill, -0.18));
    fillStroke(ctx, g, line);
    // Finger bones
    ctx.strokeStyle = shade(fill, -0.35);
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    for (const p of tips.slice(1)) { ctx.moveTo(W[0], W[1]); ctx.lineTo(p[0], p[1]); }
    ctx.stroke();
    // Arm
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(E[0], E[1]); ctx.lineTo(W[0], W[1]); ctx.lineTo(tips[0][0], tips[0][1]);
    ctx.strokeStyle = line; ctx.lineWidth = lw * 2.6; ctx.stroke();
    ctx.strokeStyle = shade(fill, 0.15); ctx.lineWidth = lw * 1.1; ctx.stroke();
    // Little claw at the wrist
    ctx.beginPath();
    ctx.moveTo(W[0] - 0.03, W[1]); ctx.quadraticCurveTo(W[0] + 0.02, W[1] - 0.1, W[0] + 0.09, W[1] - 0.08); ctx.lineTo(W[0] + 0.03, W[1] + 0.02);
    ctx.closePath();
    ctx.lineWidth = lw * 0.7;
    fillStroke(ctx, '#fffbe8', line);
  } else if (style === 'feather') {
    const feather = (base, a, len, wdt, col) => {
      ctx.save();
      ctx.translate(base[0], base[1]);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(wdt, -len * 0.45, 0.01, -len);
      ctx.quadraticCurveTo(-wdt, -len * 0.5, 0, 0);
      ctx.lineWidth = lw * 0.8;
      fillStroke(ctx, col, line);
      ctx.beginPath(); ctx.moveTo(0, -0.02); ctx.lineTo(0.005, -len * 0.85);
      ctx.strokeStyle = shade(col, -0.25); ctx.lineWidth = lw * 0.5; ctx.stroke();
      ctx.restore();
    };
    // Secondaries along the forearm, then primaries fanning from the wrist
    for (let i = 0; i < 4; i++) {
      const b = lerp2(E, [0, 0], i / 4);
      const a = lerp(lerp(-2.1, -2.0, spread), -2.6, i / 4);
      feather(b, a, 0.42 - i * 0.05, 0.1, i % 2 ? shade(fill, -0.08) : shade(fill, 0.05));
    }
    for (let i = 0; i < 5; i++) {
      const a = lerp(lerp(-1.1, -0.7, spread), lerp(-2.1, -2.0, spread), i / 4);
      feather(lerp2(W, E, i * 0.12), a, 0.62 - i * 0.04, 0.11, i % 2 ? fill : shade(fill, 0.12));
    }
    // Soft covert feathers over the arm
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(E[0], E[1]); ctx.lineTo(W[0], W[1]);
    ctx.strokeStyle = line; ctx.lineWidth = 0.11 + lw * 2; ctx.stroke();
    ctx.strokeStyle = shade(fill, 0.3); ctx.lineWidth = 0.11; ctx.stroke();
  } else if (style === 'butterfly') {
    const lobe = (a, rx, ry, off, col) => {
      ctx.save();
      ctx.rotate(a);
      ellipse(ctx, 0, -off, rx, ry);
      const g = ctx.createRadialGradient(0, -off * 0.3, 0.02, 0, -off, Math.max(rx, ry) * 1.2);
      g.addColorStop(0, shade(col, 0.5));
      g.addColorStop(0.6, col);
      g.addColorStop(1, shade(col, -0.25));
      fillStroke(ctx, g, line);
      // Eye spot
      ellipse(ctx, 0, -off * 1.2, rx * 0.22, rx * 0.22);
      ctx.fillStyle = shade(col, 0.6); ctx.fill();
      ctx.lineWidth = lw * 0.9; ctx.strokeStyle = shade(col, -0.3); ctx.stroke();
      ctx.lineWidth = lw;
      ctx.restore();
    };
    lobe(lerp(-1.75, -1.95, spread), 0.2, 0.26, 0.26, shade(fill, -0.05));
    lobe(lerp(-0.95, -0.5, spread), 0.27, 0.38, 0.38, fill);
  }
  ctx.restore();
}

// ---------- Horns (drawn in head units, 1 = head radius) ----------
const HORN_BASE = '#cfae72', HORN_TIP = '#fff7dc', HORN_LINE = '#7d5c3c';

function hornGradient(ctx, x0, y0, x1, y1, far) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, far ? shade(HORN_BASE, -0.2) : HORN_BASE);
  g.addColorStop(1, far ? shade(HORN_TIP, -0.15) : HORN_TIP);
  return g;
}

function drawHorn(ctx, style, bx, by, tilt, far, lw) {
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(tilt);
  ctx.lineWidth = lw;
  ctx.strokeStyle = HORN_LINE;
  if (style === 'small') {
    ctx.beginPath();
    ctx.moveTo(-0.17, 0.12);
    ctx.quadraticCurveTo(-0.14, -0.35, -0.34, -0.64);
    ctx.quadraticCurveTo(0.06, -0.42, 0.17, 0.12);
    ctx.closePath();
    ctx.fillStyle = hornGradient(ctx, 0, 0, -0.3, -0.6, far); ctx.fill(); ctx.stroke();
  } else if (style === 'long') {
    ctx.beginPath();
    ctx.moveTo(-0.19, 0.12);
    ctx.bezierCurveTo(-0.2, -0.45, -0.45, -0.9, -0.95, -1.12);
    ctx.bezierCurveTo(-0.4, -0.78, 0.0, -0.5, 0.18, 0.12);
    ctx.closePath();
    ctx.fillStyle = hornGradient(ctx, 0, 0, -0.9, -1.1, far); ctx.fill(); ctx.stroke();
    // Ridges
    ctx.beginPath();
    for (const [x, y, w] of [[-0.02, -0.15, 0.17], [-0.15, -0.45, 0.13], [-0.36, -0.72, 0.09]]) {
      ctx.moveTo(x - w, y + 0.02); ctx.quadraticCurveTo(x, y - 0.05, x + w, y - 0.02);
    }
    ctx.lineWidth = lw * 0.7; ctx.stroke();
  } else if (style === 'antlers') {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(0, 0.12); ctx.quadraticCurveTo(-0.05, -0.5, -0.4, -0.95);
      ctx.moveTo(-0.08, -0.38); ctx.quadraticCurveTo(0.08, -0.55, 0.2, -0.75);
      ctx.moveTo(-0.24, -0.72); ctx.quadraticCurveTo(-0.45, -0.75, -0.66, -0.88);
      ctx.moveTo(-0.3, -0.82); ctx.quadraticCurveTo(-0.22, -1.0, -0.12, -1.12);
    };
    path(); ctx.strokeStyle = HORN_LINE; ctx.lineWidth = 0.2 + lw * 2; ctx.stroke();
    path(); ctx.strokeStyle = far ? '#b99668' : '#e2c597'; ctx.lineWidth = 0.2; ctx.stroke();
    path(); ctx.strokeStyle = far ? '#c9a878' : '#f3dfb8'; ctx.lineWidth = 0.07;
    ctx.translate(-0.03, -0.02); ctx.stroke();
  } else if (style === 'curly') {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(0.05, 0.05);
      ctx.bezierCurveTo(-0.05, -0.62, -0.9, -0.72, -0.92, -0.1);
      ctx.bezierCurveTo(-0.93, 0.32, -0.42, 0.38, -0.44, 0.0);
    };
    path(); ctx.strokeStyle = HORN_LINE; ctx.lineWidth = 0.3 + lw * 2; ctx.stroke();
    path(); ctx.strokeStyle = hornGradient(ctx, 0, -0.5, -0.6, 0.2, far); ctx.lineWidth = 0.3; ctx.stroke();
    if (ctx.setLineDash) {
      ctx.setLineDash([0.035, 0.11]);
      path(); ctx.strokeStyle = far ? '#a88d5e' : '#c7a86f'; ctx.lineWidth = 0.26; ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

// ---------- Eye ----------
function drawEye(ctx, x, y, r, color, blink, lw) {
  if (blink) {
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8, y + r * 0.05); ctx.quadraticCurveTo(x, y + r * 0.55, x + r * 0.8, y + r * 0.05);
    ctx.strokeStyle = '#2a1a1a'; ctx.lineWidth = lw * 1.4; ctx.stroke();
    ctx.lineWidth = lw;
    return;
  }
  ellipse(ctx, x, y, r * 0.86, r);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.save();
  ctx.clip();
  const ix = x + r * 0.2, iy = y + r * 0.1;
  const g = ctx.createRadialGradient(ix + r * 0.1, iy + r * 0.3, r * 0.05, ix, iy, r * 0.75);
  g.addColorStop(0, shade(color, 0.55));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -0.4));
  ellipse(ctx, ix, iy, r * 0.6, r * 0.74);
  ctx.fillStyle = g; ctx.fill();
  ellipse(ctx, ix + r * 0.08, iy + r * 0.02, r * 0.3, r * 0.46);
  ctx.fillStyle = '#16100e'; ctx.fill();
  // Upper lid shadow
  ellipse(ctx, x, y - r * 1.05, r * 1.1, r * 0.4);
  ctx.fillStyle = 'rgba(40,20,30,0.18)'; ctx.fill();
  ctx.restore();
  ellipse(ctx, x, y, r * 0.86, r);
  ctx.strokeStyle = '#2a1a1a'; ctx.lineWidth = lw * 1.1; ctx.stroke();
  ctx.lineWidth = lw;
  ellipse(ctx, x + r * 0.02, y - r * 0.3, r * 0.22, r * 0.24);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ellipse(ctx, x + r * 0.42, y + r * 0.42, r * 0.1, r * 0.1);
  ctx.fill();
}

// ---------- Head (in head units: 1 = head radius, facing right) ----------
function headPath(ctx, sn) {
  const X = v => 0.6 + (v - 0.6) * sn;
  ctx.beginPath();
  ctx.moveTo(-0.55, 0.8);
  ctx.bezierCurveTo(-1.12, 0.45, -1.1, -0.92, -0.1, -1.0);
  ctx.bezierCurveTo(0.55, -1.05, 0.82, -0.56, X(1.1), -0.4);
  ctx.bezierCurveTo(X(1.45), -0.31, X(1.76), -0.22, X(1.76), 0.12);
  ctx.bezierCurveTo(X(1.76), 0.52, X(1.4), 0.7, X(1.0), 0.7);
  ctx.bezierCurveTo(0.5, 0.72, 0.05, 0.97, -0.55, 0.8);
  ctx.closePath();
}

function drawHead(ctx, cfg, P, hx, hy, r, tilt, o, h) {
  const sn = h.snout;
  const X = v => 0.6 + (v - 0.6) * sn;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);
  ctx.scale(r, r);
  const lw = LW / r;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const horns = cfg.horns;
  const ht = h.hornTilt || 0;

  if (h.mane) {
    // Eastern mane: flowing tufts behind the head
    ctx.fillStyle = P.wing; ctx.strokeStyle = P.wingLine;
    const wv = Math.sin(o.t * 4) * 0.08;
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.45;
      ctx.beginPath();
      ctx.moveTo(-0.55 + Math.cos(a) * 0.5, Math.sin(a) * 0.5);
      ctx.quadraticCurveTo(-1.3 - i * 0.05, -0.4 + i * 0.32 + wv, -1.55 - (i % 2) * 0.15, -0.3 + i * 0.4 + wv * 2);
      ctx.quadraticCurveTo(-1.0, 0.0 + i * 0.3, -0.45, 0.1 + i * 0.12);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  if (h.frill) {
    // Spiky: a crown of spikes on the back of the head
    ctx.fillStyle = P.wing; ctx.strokeStyle = P.wingLine;
    for (const [x, y, a, s] of [[-0.75, -0.62, -2.3, 0.55], [-0.98, -0.12, -2.85, 0.6], [-0.9, 0.38, 2.75, 0.45]]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(-0.17, 0.1); ctx.lineTo(0.02, -s); ctx.lineTo(0.17, 0.1); ctx.closePath();
      ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }
  if (horns !== 'none' && horns !== 'curly') {
    drawHorn(ctx, horns, -0.5, -0.74, ht - 0.12, true, lw);
    drawHorn(ctx, horns, -0.18, -0.9, ht, false, lw);
  } else if (horns === 'curly') {
    drawHorn(ctx, horns, -0.05, -0.92, ht + 0.25, true, lw);
  }

  // Skull and snout in one smooth shape
  headPath(ctx, sn);
  const g = ctx.createRadialGradient(0.15, -0.6, 0.1, 0.35, -0.2, 1.9);
  g.addColorStop(0, P.light);
  g.addColorStop(0.45, P.body);
  g.addColorStop(1, P.dark);
  ctx.fillStyle = g; ctx.fill();
  ctx.save();
  ctx.clip();
  // Lighter chin and jaw
  ellipse(ctx, X(0.95), 0.9, 0.95 * sn + 0.2, 0.32, -0.05);
  ctx.fillStyle = P.belly; ctx.fill();
  ctx.restore();
  headPath(ctx, sn);
  ctx.strokeStyle = P.line; ctx.stroke();

  // Cheek
  ellipse(ctx, 0.6, 0.36, 0.22, 0.13);
  ctx.fillStyle = 'rgba(255,105,140,0.42)'; ctx.fill();
  // Smile and a tiny fang
  ctx.beginPath();
  ctx.moveTo(X(1.66), 0.36);
  ctx.quadraticCurveTo(X(1.25), 0.52, X(0.88), 0.38);
  ctx.quadraticCurveTo(X(0.8), 0.35, X(0.78), 0.27);
  ctx.strokeStyle = P.line; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(X(1.28), 0.46); ctx.lineTo(X(1.4), 0.44); ctx.lineTo(X(1.34), 0.62); ctx.closePath();
  ctx.lineWidth = lw * 0.6;
  fillStroke(ctx, '#ffffff', P.line);
  ctx.lineWidth = lw;
  // Nostril
  ellipse(ctx, X(1.55), -0.07, 0.075, 0.045, -0.45);
  ctx.fillStyle = P.line; ctx.fill();
  // Brow
  ctx.beginPath();
  ctx.moveTo(-0.12, -0.7); ctx.quadraticCurveTo(0.25, -0.86, 0.6, -0.62);
  ctx.lineWidth = lw * 1.3; ctx.stroke();
  ctx.lineWidth = lw;
  drawEye(ctx, 0.22, -0.2, h.eye, cfg.eyes, o.blink, lw);

  if (horns === 'curly') drawHorn(ctx, horns, -0.2, -0.82, ht, false, lw);

  if (h.whiskers) {
    const wv = Math.sin(o.t * 3) * 0.12;
    ctx.strokeStyle = shade(P.wing, -0.15);
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath();
    ctx.moveTo(X(1.62), 0.0);
    ctx.bezierCurveTo(X(2.1), 0.1, X(1.9), 0.75 + wv, X(2.35), 0.85 + wv);
    ctx.moveTo(X(1.5), 0.2);
    ctx.bezierCurveTo(X(1.7), 0.6, X(1.25), 1.0 - wv, X(1.55), 1.3 - wv);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- Legs ----------
function drawLeg(ctx, hip, target, l1, l2, bend, w1, w2, fill, line, haunch, gradTop) {
  const { knee, paw } = solveLeg(hip, target, l1, l2, bend);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [col, extra] of [[line, LW * 2], [fill, 0]]) {
    ctx.strokeStyle = col;
    ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(knee[0], knee[1]);
    ctx.lineWidth = w1 + extra; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(knee[0], knee[1]); ctx.lineTo(paw[0], paw[1]);
    ctx.lineWidth = w2 + extra; ctx.stroke();
  }
  ctx.lineWidth = LW;
  if (haunch) {
    const c = lerp2(hip, knee, 0.3);
    const a = Math.atan2(knee[1] - hip[1], knee[0] - hip[0]);
    ellipse(ctx, c[0], c[1], haunch[0], haunch[1], a);
    let f = fill;
    if (gradTop) {
      f = ctx.createLinearGradient(c[0], c[1] - haunch[1], c[0], c[1] + haunch[1]);
      f.addColorStop(0, gradTop); f.addColorStop(1, fill);
    }
    fillStroke(ctx, f, line);
  }
  // Paw: points forward, at a right angle to the shin
  let dx = paw[0] - knee[0], dy = paw[1] - knee[1];
  const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
  const fx = dy, fy = -dx;
  const pa = Math.atan2(fy, fx);
  const pc = [paw[0] + fx * 0.025, paw[1] + fy * 0.025];
  // Claws
  ctx.lineWidth = LW * 0.6;
  for (const off of [-0.035, 0.0, 0.035]) {
    const bx = pc[0] + fx * 0.06 + dx * off, by = pc[1] + fy * 0.06 + dy * off;
    ctx.beginPath();
    ctx.moveTo(bx - dx * 0.018, by - dy * 0.018);
    ctx.lineTo(bx + fx * 0.05, by + fy * 0.05);
    ctx.lineTo(bx + dx * 0.018, by + dy * 0.018);
    ctx.closePath();
    fillStroke(ctx, '#fffbe8', line);
  }
  ctx.lineWidth = LW;
  ellipse(ctx, pc[0], pc[1], 0.08, 0.055, pa);
  fillStroke(ctx, fill, line);
}

// ---------- Poses ----------
function resolveOpts(opts) {
  const flying = !!opts.flying;
  const airborne = !!opts.airborne;
  const moving = !!opts.moving;
  let pose = opts.pose;
  if (!pose) pose = flying ? 'fly' : airborne ? (opts.vy > 2 ? 'fall' : 'jump') : moving ? 'run' : 'idle';
  const t = opts.t || 0;
  return {
    t,
    walk: opts.walk || 0,
    pose,
    k: clamp(opts.poseT || 0, 0, 1),
    vy: opts.vy !== undefined ? opts.vy : (pose === 'fall' ? 8 : pose === 'jump' ? -8 : 0),
    speed: opts.speed !== undefined ? opts.speed : (moving ? 1 : 0),
    blink: (t % 3.2) > 3.05,
  };
}

// Body shapes for the four-legged dragons.
const DIMS = {
  european: {
    C: [-0.06, -0.53], rx: 0.42, ry: 0.25, head: [0.48, -0.46], headR: 0.24, snout: 1, eye: 0.42,
    hipF: [0.25, 0.12], hipB: [-0.24, 0.08], legF: [0.22, 0.22], legB: [0.23, 0.24], legW: [0.13, 0.1],
    haunch: [0.17, 0.13], tail: 0.8, tailW: 0.11, wing: 0.92, plates: 0.09,
  },
  spiky: {
    C: [-0.06, -0.54], rx: 0.44, ry: 0.27, head: [0.48, -0.46], headR: 0.24, snout: 1, eye: 0.4,
    hipF: [0.26, 0.13], hipB: [-0.25, 0.09], legF: [0.22, 0.22], legB: [0.23, 0.24], legW: [0.14, 0.11],
    haunch: [0.18, 0.14], tail: 0.8, tailW: 0.12, wing: 0.92, plates: 0.2,
  },
  baby: {
    C: [-0.05, -0.42], rx: 0.34, ry: 0.27, head: [0.36, -0.42], headR: 0.31, snout: 0.72, eye: 0.48,
    hipF: [0.19, 0.13], hipB: [-0.18, 0.11], legF: [0.16, 0.16], legB: [0.16, 0.17], legW: [0.13, 0.11],
    haunch: [0.14, 0.12], tail: 0.55, tailW: 0.1, wing: 0.7, plates: 0.07,
  },
};

const FOLD = [0, -0.8]; // wing spread and angle when tucked away

// Where everything goes for a pose. Paws are given either in body-puppet
// coordinates (`abs`, e.g. on the ground) or relative to each hip (`rel`).
function quadPose(D, o) {
  const { t, pose, k, vy, speed } = o;
  const [cx, cy] = D.C;
  const Q = {
    fig: null, pitch: 0, bob: 0, breathe: 0,
    headOff: [0, 0], headTilt: 0, hornTilt: 0,
    abs: null, rel: null,
    tail: { lift: 0.35, curl: 0.3, len: 1, sway: 0 },
    wing: FOLD, farWing: null, dust: 0,
  };
  const fX = cx + D.hipF[0], bX = cx + D.hipB[0];
  const stand = { fn: [fX + 0.02, 0], ff: [fX + 0.09, 0], bn: [bX, 0], bf: [bX + 0.07, 0] };
  // Turn a spot in the world (relative to the feet) into puppet coordinates
  const toRig = p => {
    const f = Q.fig;
    if (!f) return p;
    return rotate([p[0] - f.dx, p[1] - f.dy], -f.rot, [f.px, f.py]);
  };

  if (pose === 'idle') {
    Q.breathe = Math.sin(t * 2.2) * 0.015;
    Q.headOff = [0, Math.sin(t * 2.2 - 0.6) * 0.012];
    Q.tail = { lift: 0.45, curl: 0.55, len: 1, sway: Math.sin(t * 2) * 0.12 };
    Q.abs = stand;
  } else if (pose === 'run') {
    const ph = o.walk;
    const sp = clamp(speed, 0.35, 1.3);
    const stride = 0.17 * sp, lift = 0.15;
    const foot = (x, p) => [x + Math.cos(p) * stride, -lift * Math.max(0, -Math.sin(p))];
    Q.abs = {
      bn: foot(bX, ph), bf: foot(bX + 0.07, ph + 0.6),
      fn: foot(fX + 0.04, ph + Math.PI), ff: foot(fX + 0.1, ph + Math.PI + 0.6),
    };
    Q.pitch = 0.05 * sp + Math.sin(ph) * 0.06;
    Q.bob = -0.035 * Math.abs(Math.sin(ph + 0.3));
    Q.headTilt = -0.08 - Math.sin(ph) * 0.05;
    Q.tail = { lift: 0.12 + Math.sin(ph + 1) * 0.08, curl: -0.15, len: 1, sway: 0 };
    Q.wing = [0, -0.9];
  } else if (pose === 'jump' || pose === 'fall') {
    const a = clamp((vy + 5) / 10, 0, 1);
    Q.pitch = lerp(-0.25, 0.1, a);
    Q.rel = {
      fn: lerp2([0.2, 0.15], [0.13, 0.4], a), ff: lerp2([0.26, 0.12], [0.2, 0.37], a),
      bn: lerp2([-0.3, 0.32], [0.06, 0.4], a), bf: lerp2([-0.24, 0.3], [0.13, 0.38], a),
    };
    Q.headTilt = lerp(-0.12, 0.12, a);
    Q.tail = { lift: lerp(-0.15, 0.75, a), curl: lerp(0.1, 0.5, a), len: 1, sway: 0 };
    Q.wing = [lerp(0.25, 0.6, a), lerp(-0.45, -0.1, a) + Math.sin(t * 22) * 0.08 * a];
  } else if (pose === 'fly') {
    const f = (Math.sin(t * 9) + 1) / 2;
    Q.wing = [0.55 + 0.45 * f, lerp(-1.25, 0.35, f)];
    Q.farWing = [Q.wing[0], Q.wing[1] + 0.15];
    Q.rel = { fn: [0.17, 0.2], ff: [0.22, 0.18], bn: [-0.3, 0.28], bf: [-0.24, 0.27] };
    Q.pitch = -0.08;
    Q.bob = Math.sin(t * 9 + 1.2) * 0.04;
    Q.tail = { lift: 0.25 + Math.sin(t * 3) * 0.15, curl: 0.3, len: 1, sway: 0 };
  } else if (pose === 'wall') {
    Q.fig = { rot: -Math.PI / 2, px: cx, py: cy, dx: 0.07 - cx, dy: -0.62 - cy };
    const scr = vy > 0.5 ? Math.sin(t * 28) * 0.04 : 0;
    Q.abs = {
      fn: toRig([0.43, -0.98 + scr]), ff: toRig([0.43, -0.88 - scr]),
      bn: toRig([0.43, -0.3 - scr]), bf: toRig([0.43, -0.22 + scr]),
    };
    Q.headOff = [-0.06, 0.13];
    Q.headTilt = 0.55;
    Q.tail = { lift: 1.15, curl: -0.5, len: 0.85, sway: Math.sin(t * 3) * 0.08 };
    Q.wing = [0.15, -0.45];
  } else if (pose === 'climb') {
    const corner = [0.42 - 1.2 * Math.max(0, k - 0.5), -1.0 + 2 * Math.min(k, 0.5)];
    const e = smooth(k);
    const rot = k < 0.5 ? lerp(-1.3, -0.5, smooth(k * 2)) : lerp(-0.5, 0, smooth((k - 0.5) * 2));
    const cw = lerp2([0.1, -0.48], [cx, cy], e);
    Q.fig = { rot, px: cx, py: cy, dx: cw[0] - cx, dy: cw[1] - cy };
    const onTop = add(corner, [0.12, 0]);
    const end = Math.max(0, (k - 0.7) / 0.3);
    const scr = Math.sin(t * 24) * 0.05 * (1 - e);
    Q.abs = {
      fn: toRig(lerp2(onTop, stand.fn, end)), ff: toRig(lerp2(add(onTop, [0.08, 0]), stand.ff, end)),
      bn: toRig(k < 0.5 ? add(corner, [0.01, 0.4 + scr]) : lerp2(add(corner, [0.05, 0]), stand.bn, smooth((k - 0.5) * 2))),
      bf: toRig(k < 0.5 ? add(corner, [0.01, 0.55 - scr]) : lerp2(add(corner, [0.1, 0]), stand.bf, smooth((k - 0.5) * 2))),
    };
    Q.headOff = [0, 0.05 * (1 - e)];
    Q.headTilt = 0.35 * (1 - e);
    Q.tail = { lift: lerp(0.9, 0.4, e), curl: 0.2, len: 1, sway: 0 };
    Q.wing = [0.3 * (1 - e), lerp(-0.2, FOLD[1], e)];
  } else if (pose === 'vault') {
    Q.bob = -0.08 * Math.sin(Math.PI * k);
    Q.pitch = lerp(0.12, -0.1, k);
    Q.rel = { fn: [0.06, 0.5], ff: [0.12, 0.48], bn: [-0.3, 0.1], bf: [-0.24, 0.08] };
    Q.headTilt = -0.1;
    Q.tail = { lift: 0.5, curl: 0.3, len: 1, sway: 0 };
    Q.wing = [0.35, -0.3];
  } else if (pose === 'slide') {
    Q.fig = { rot: 0, px: 0, py: 0, dx: 0, dy: 0.24 };
    Q.pitch = -0.03;
    Q.headOff = [0.17, 0.27];
    Q.headTilt = -0.18;
    Q.hornTilt = -0.75;
    Q.abs = {
      fn: toRig([fX + 0.34, -0.01]), ff: toRig([fX + 0.4, -0.03]),
      bn: toRig([bX - 0.36, -0.01]), bf: toRig([bX - 0.3, -0.03]),
    };
    Q.tail = { lift: 0.06, curl: -0.1, len: 0.85, sway: Math.sin(t * 20) * 0.03 };
    Q.wing = [0, -1.15];
    Q.dust = 1;
  } else if (pose === 'roll') {
    Q.fig = { rot: k * TAU, px: cx, py: cy, dx: -cx, dy: -0.45 - cy };
    Q.pitch = 0.35;
    Q.headOff = [-0.16, 0.3];
    Q.headTilt = 1.2;
    Q.rel = { fn: [-0.12, 0.06], ff: [-0.07, 0.05], bn: [0.14, 0.05], bf: [0.18, 0.04] };
    Q.tail = { lift: -2.7, curl: 1.0, len: 0.65, sway: 0 };
    Q.wing = [0, -0.9];
  }
  return Q;
}

function drawPlate(ctx, x, y, nx, ny, size, sharp) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(ny, nx) + Math.PI / 2);
  ctx.beginPath();
  const b = size * (sharp ? 0.45 : 0.55);
  ctx.moveTo(-b, size * 0.35);
  if (sharp) { ctx.lineTo(0, -size); }
  else { ctx.quadraticCurveTo(-b * 0.6, -size * 0.6, 0, -size); ctx.quadraticCurveTo(b * 0.6, -size * 0.6, b, size * 0.35); }
  ctx.lineTo(b, size * 0.35);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function tailTip(ctx, p, prev, size, style, fill, line) {
  const a = Math.atan2(p[1] - prev[1], p[0] - prev[0]);
  ctx.save();
  ctx.translate(p[0], p[1]);
  ctx.rotate(a);
  ctx.scale(size, size);
  ctx.lineWidth = LW / size;
  ctx.beginPath();
  if (style === 'arrow') {
    ctx.moveTo(-0.06, 0); ctx.lineTo(-0.1, -0.13); ctx.lineTo(0.2, 0); ctx.lineTo(-0.1, 0.13);
  } else {
    ctx.moveTo(-0.04, 0);
    ctx.bezierCurveTo(-0.06, -0.12, 0.06, -0.15, 0.08, -0.07);
    ctx.quadraticCurveTo(0.12, -0.02, 0.2, 0);
    ctx.quadraticCurveTo(0.12, 0.02, 0.08, 0.07);
    ctx.bezierCurveTo(0.06, 0.15, -0.06, 0.12, -0.04, 0);
  }
  ctx.closePath();
  fillStroke(ctx, fill, line);
  ctx.restore();
}

function drawDust(ctx, o, x, y) {
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 4; i++) {
    const ph = (o.t * 3 + i * 0.25) % 1;
    ellipse(ctx, x - ph * 0.5, y - 0.04 - ph * 0.12, 0.05 + ph * 0.06, 0.04 + ph * 0.04);
    ctx.globalAlpha = 1 - ph;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawQuad(ctx, cfg, P, o) {
  const D = DIMS[cfg.type] || DIMS.european;
  const baby = cfg.type === 'baby';
  const spiky = cfg.type === 'spiky';
  const Q = quadPose(D, o);
  const [cx, cy] = D.C;

  if (Q.dust) drawDust(ctx, o, cx - D.rx, 0);
  if (Q.fig) {
    const f = Q.fig;
    ctx.translate(f.dx + f.px, f.dy + f.py);
    ctx.rotate(f.rot);
    ctx.translate(-f.px, -f.py);
  }

  const cs = Math.cos(Q.pitch), sn = Math.sin(Q.pitch);
  const C = [cx, cy + Q.bob];
  const bp = (lx, ly) => [C[0] + lx * cs - ly * sn, C[1] + lx * sn + ly * cs];
  const rx = D.rx * (1 + Q.breathe * 0.5), ry = D.ry * (1 + Q.breathe);

  // Legs
  const hips = {
    fn: bp(D.hipF[0], D.hipF[1]), ff: bp(D.hipF[0] + 0.05, D.hipF[1] - 0.03),
    bn: bp(D.hipB[0], D.hipB[1]), bf: bp(D.hipB[0] + 0.05, D.hipB[1] - 0.03),
  };
  const target = key => (Q.abs ? Q.abs[key] : add(hips[key], Q.rel[key]));

  // Head
  const headR = D.headR;
  const H = bp(D.head[0] + Q.headOff[0], D.head[1] + Q.headOff[1]);
  const headTilt = Q.pitch * 0.5 + Q.headTilt;

  // Tail center line
  const tl = D.tail * Q.tail.len;
  const base = bp(-rx * 0.82, 0.03);
  const A = Math.PI + Q.pitch + Q.tail.lift + Q.tail.sway;
  const p1 = add(base, polar(Math.PI + Q.pitch - 0.25 + Q.tail.lift * 0.2, tl * 0.38));
  const p3 = add(base, polar(A, tl));
  const p2 = add(base, polar(A - Q.tail.curl, tl * 0.75));
  const tailPts = cubic(base, p1, p2, p3, 12);
  const tailHW = tailPts.map((_, i) => lerp(D.tailW, 0.028, Math.pow(i / 11, 0.85)));

  // Neck center line, from the shoulders to the back of the head
  const neckBase = bp(rx * 0.5, -ry * 0.3);
  const neckTop = add(H, rotate([-0.42 * headR, 0.5 * headR], headTilt));
  const neckMid = add(lerp2(neckBase, neckTop, 0.5), [0.05, 0.02]);
  const neckPts = cubic(neckBase, neckMid, neckMid, neckTop, 6);
  const neckW = baby ? 0.12 : 0.115;
  const neckHW = neckPts.map((_, i) => lerp(neckW + 0.02, neckW - 0.02, i / 5));

  const shoulder = bp(0.04, -ry * 0.75);
  const wingSize = D.wing;

  // 1. Far wing and far legs
  // (A folded far wing would be hidden behind the body, so skip it.)
  const fw = Q.farWing || [Q.wing[0], Q.wing[1] + 0.12];
  if (fw[0] > 0.12) drawWing(ctx, cfg.wings, cfg.wingColor, shoulder[0] + 0.07, shoulder[1] - 0.03, wingSize, fw[0], fw[1] + Q.pitch, true);
  ctx.lineWidth = LW;
  drawLeg(ctx, hips.bf, target('bf'), D.legB[0], D.legB[1], -1, D.legW[0], D.legW[1], P.far, P.farLine, [D.haunch[0] * 0.85, D.haunch[1] * 0.85], null);
  drawLeg(ctx, hips.ff, target('ff'), D.legF[0], D.legF[1], 1, D.legW[0] * 0.9, D.legW[1], P.far, P.farLine, null, null);

  // 2. Back plates / spikes (the body covers their bottoms)
  ctx.fillStyle = P.wing; ctx.strokeStyle = P.wingLine; ctx.lineWidth = LW * 0.9;
  const plateN = spiky ? 5 : 6;
  for (let i = 0; i < plateN; i++) {
    const a = Math.PI * (0.3 + (i / (plateN - 1)) * 0.5);
    const lx = Math.cos(a) * rx * 0.9, ly = -Math.sin(a) * ry * 0.9;
    const pt = bp(lx, ly);
    const nrm = rotate([Math.cos(a) * ry, -Math.sin(a) * rx], Q.pitch);
    const nl = Math.hypot(nrm[0], nrm[1]);
    drawPlate(ctx, pt[0], pt[1], nrm[0] / nl, nrm[1] / nl, D.plates * (spiky ? 1 + 0.25 * Math.sin(Math.PI * i / (plateN - 1)) : 1), spiky);
  }
  {
    const { A: up, N } = tubeEdges(tailPts, tailHW);
    // Along the tail, the "A" edge is on top when the tail points backward
    for (let i = 2; i < 10; i += spiky ? 2 : 2) {
      const s = D.plates * (spiky ? 0.8 : 0.85) * (1 - i / 14);
      drawPlate(ctx, up[i][0], up[i][1], -N[i][0], -N[i][1], s, spiky);
    }
    if (!baby) {
      const ne = tubeEdges(neckPts, neckHW);
      for (let i = 1; i < 5; i += 1) {
        drawPlate(ctx, ne.B[i][0], ne.B[i][1], -ne.N[i][0], -ne.N[i][1], D.plates * (spiky ? 0.6 : 0.75), spiky);
      }
    }
  }

  // 3. One smooth silhouette for tail + body + neck: outlines first, then fills
  const bodyGrad = ctx.createLinearGradient(C[0], C[1] - ry * 1.3, C[0], C[1] + ry * 1.2);
  bodyGrad.addColorStop(0, P.light);
  bodyGrad.addColorStop(0.45, P.body);
  bodyGrad.addColorStop(1, P.dark);
  const shapes = [
    () => tubePath(ctx, tailPts, tailHW),
    () => ellipse(ctx, C[0], C[1], rx, ry, Q.pitch),
    () => tubePath(ctx, neckPts, neckHW),
  ];
  ctx.strokeStyle = P.line; ctx.lineWidth = LW * 2;
  for (const s of shapes) { s(); ctx.stroke(); }
  ctx.fillStyle = bodyGrad;
  for (const s of shapes) { s(); ctx.fill(); }
  ctx.lineWidth = LW;

  // Tail tip
  tailTip(ctx, tailPts[11], tailPts[9], spiky ? 1.25 : baby ? 0.85 : 1.05, spiky ? 'arrow' : 'spade', P.wing, P.wingLine);

  // Belly plates, a shiny back and a few scales
  ctx.save();
  ellipse(ctx, C[0], C[1], rx, ry, Q.pitch);
  ctx.clip();
  ctx.translate(C[0], C[1]);
  ctx.rotate(Q.pitch);
  ellipse(ctx, 0.05, ry * 0.68, rx * 0.86, ry * 0.52);
  ctx.fillStyle = P.belly; ctx.fill();
  ctx.strokeStyle = P.bellyLine; ctx.lineWidth = LW * 0.65;
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) {
    const x = 0.05 + i * rx * 0.24;
    ctx.moveTo(x - 0.02, ry * 0.25); ctx.quadraticCurveTo(x + 0.025, ry * 0.65, x - 0.01, ry * 1.2);
  }
  ctx.stroke();
  ellipse(ctx, rx * 0.08, -ry * 0.55, rx * 0.55, ry * 0.22, -0.05);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
  ctx.strokeStyle = shade(P.body, -0.2); ctx.lineWidth = LW * 0.7;
  ctx.beginPath();
  for (const [x, y] of [[-0.22, -0.06], [-0.08, -0.12], [-0.3, 0.06], [0.06, -0.04]]) {
    ctx.moveTo(x * rx / 0.42 - 0.035, y); ctx.quadraticCurveTo(x * rx / 0.42, y + 0.035, x * rx / 0.42 + 0.035, y);
  }
  ctx.stroke();
  ctx.restore();
  // Neck belly stripe
  ctx.save();
  tubePath(ctx, neckPts, neckHW);
  ctx.clip();
  ctx.beginPath();
  smoothTo(ctx, neckPts.slice(0, 5).map((p, i) => add(p, rotate([0.06, 0.035], headTilt * i / 5 + Q.pitch))), true);
  ctx.strokeStyle = P.belly; ctx.lineWidth = neckW * 0.9; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
  ctx.lineWidth = LW;

  // 4. Near legs
  drawLeg(ctx, hips.bn, target('bn'), D.legB[0], D.legB[1], -1, D.legW[0], D.legW[1], P.body, P.line, D.haunch, P.light);
  drawLeg(ctx, hips.fn, target('fn'), D.legF[0], D.legF[1], 1, D.legW[0] * 0.9, D.legW[1], P.body, P.line, [0.08, 0.075], P.light);

  // 5. Head
  drawHead(ctx, cfg, P, H[0], H[1], headR, headTilt, o, {
    snout: D.snout, eye: D.eye, hornTilt: Q.hornTilt, frill: spiky,
  });

  // 6. Near wing
  drawWing(ctx, cfg.wings, cfg.wingColor, shoulder[0], shoulder[1], wingSize, Q.wing[0], Q.wing[1] + Q.pitch, false);
}

// ---------- Eastern dragon: long and snake-like ----------
function easternPose(o) {
  const { t, pose, k, vy, speed } = o;
  const E = {
    fig: null, len: 1, amp: 0.035, phase: t * 2, y0: -0.42, droop: 0.1, coil: false,
    headOff: [0, 0], headTilt: 0, hornTilt: 0, abs: null, rel: null, wing: FOLD, farWing: null, dust: 0,
  };
  const toRig = p => {
    const f = E.fig;
    if (!f) return p;
    return rotate([p[0] - f.dx, p[1] - f.dy], -f.rot, [f.px, f.py]);
  };
  const stand = x => [x, 0];
  if (pose === 'idle') {
    E.abs = { fn: stand(0.16), ff: stand(0.22), bn: stand(-0.66), bf: stand(-0.6) };
    E.headOff = [0, Math.sin(t * 2.2) * 0.015];
  } else if (pose === 'run') {
    const ph = o.walk, sp = clamp(speed, 0.35, 1.3), stride = 0.16 * sp;
    const foot = (x, p) => [x + Math.cos(p) * stride, -0.13 * Math.max(0, -Math.sin(p))];
    E.abs = { fn: foot(0.18, ph + Math.PI), ff: foot(0.24, ph), bn: foot(-0.64, ph), bf: foot(-0.58, ph + Math.PI) };
    E.amp = 0.07; E.phase = ph * 0.8;
    E.wing = [0, -0.65];
  } else if (pose === 'jump' || pose === 'fall') {
    const a = clamp((vy + 5) / 10, 0, 1);
    E.amp = 0.08; E.phase = t * 6;
    E.headTilt = lerp(-0.2, 0.12, a);
    E.droop = lerp(0.25, -0.15, a);
    E.rel = { fn: lerp2([0.18, 0.14], [0.12, 0.33], a), ff: lerp2([0.22, 0.12], [0.18, 0.31], a), bn: lerp2([-0.22, 0.25], [0.06, 0.32], a), bf: lerp2([-0.17, 0.23], [0.12, 0.3], a) };
    E.wing = [lerp(0.25, 0.6, a), lerp(-0.45, -0.1, a)];
  } else if (pose === 'fly') {
    const f = (Math.sin(t * 9) + 1) / 2;
    E.amp = 0.14; E.phase = t * 6; E.droop = 0;
    E.wing = [0.55 + 0.45 * f, lerp(-1.25, 0.35, f)];
    E.farWing = [E.wing[0], E.wing[1] + 0.15];
    E.rel = { fn: [0.15, 0.16], ff: [0.2, 0.15], bn: [-0.2, 0.2], bf: [-0.15, 0.19] };
  } else if (pose === 'wall') {
    E.len = 0.85; E.amp = 0.08; E.phase = t * 3;
    E.fig = { rot: -Math.PI / 2, px: -0.25, py: -0.5, dx: 0.21 + 0.25, dy: -0.55 + 0.5 };
    E.abs = { fn: toRig([0.43, -0.95]), ff: toRig([0.43, -0.86]), bn: toRig([0.43, -0.25]), bf: toRig([0.43, -0.17]) };
    E.headOff = [-0.05, 0.1]; E.headTilt = 0.5;
    E.wing = [0.15, -0.45];
  } else if (pose === 'climb') {
    const corner = [0.42 - 1.2 * Math.max(0, k - 0.5), -1.0 + 2 * Math.min(k, 0.5)];
    const e = smooth(k);
    const rot = k < 0.5 ? lerp(-1.3, -0.5, smooth(k * 2)) : lerp(-0.5, 0, smooth((k - 0.5) * 2));
    const cw = lerp2([0.15, -0.45], [-0.25, -0.5], e);
    E.len = lerp(0.85, 1, e);
    E.fig = { rot, px: -0.25, py: -0.5, dx: cw[0] + 0.25, dy: cw[1] + 0.5 };
    const end = Math.max(0, (k - 0.7) / 0.3);
    const onTop = add(corner, [0.12, 0]);
    E.abs = {
      fn: toRig(lerp2(onTop, stand(0.16), end)), ff: toRig(lerp2(add(onTop, [0.08, 0]), stand(0.22), end)),
      bn: toRig(k < 0.5 ? add(corner, [0.01, 0.45]) : lerp2(add(corner, [0.05, 0]), stand(-0.66), smooth((k - 0.5) * 2))),
      bf: toRig(k < 0.5 ? add(corner, [0.01, 0.6]) : lerp2(add(corner, [0.1, 0]), stand(-0.6), smooth((k - 0.5) * 2))),
    };
    E.headTilt = 0.35 * (1 - e);
    E.wing = [0.3 * (1 - e), lerp(-0.2, FOLD[1], e)];
  } else if (pose === 'vault') {
    E.y0 = -0.55 - 0.08 * Math.sin(Math.PI * k); E.amp = 0.06; E.phase = t * 6;
    E.rel = { fn: [0.05, 0.42], ff: [0.1, 0.4], bn: [-0.2, 0.1], bf: [-0.15, 0.08] };
    E.wing = [0.35, -0.3];
  } else if (pose === 'slide') {
    E.y0 = -0.3; E.amp = 0.02; E.phase = t * 10; E.droop = 0;
    E.headOff = [0.1, 0.24]; E.headTilt = -0.12; E.hornTilt = -0.7;
    E.abs = { fn: [0.48, -0.01], ff: [0.54, -0.03], bn: [-0.95, -0.01], bf: [-0.9, -0.03] };
    E.wing = [0, -1.15];
    E.dust = 1;
  } else if (pose === 'roll') {
    E.coil = true;
    E.fig = { rot: k * TAU, px: 0, py: -0.45, dx: 0, dy: 0 };
    E.headOff = [0, 0]; E.headTilt = 0.9;
    E.rel = { fn: [-0.06, 0.08], ff: [-0.03, 0.07], bn: [0.06, 0.08], bf: [0.09, 0.07] };
    E.wing = [0, -0.9];
  }
  return E;
}

function drawEastern(ctx, cfg, P, o) {
  const E = easternPose(o);
  if (E.dust) drawDust(ctx, o, -0.8, 0);
  if (E.fig) {
    const f = E.fig;
    ctx.translate(f.dx + f.px, f.dy + f.py);
    ctx.rotate(f.rot);
    ctx.translate(-f.px, -f.py);
  }
  const n = 15;
  const pts = [];
  const hw = [];
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    if (E.coil) {
      // Curled up into a ball for the roll
      const a = -0.6 - k * TAU * 0.85;
      const r = 0.3 - k * 0.12;
      pts.push([Math.cos(a) * r, -0.45 + Math.sin(a) * r]);
    } else {
      const wave = Math.sin(E.phase - i * 0.65) * E.amp * (0.4 + k);
      pts.push([0.3 - k * 1.45 * E.len, E.y0 + wave - k * k * E.droop]);
    }
    hw.push(lerp(0.17, 0.04, Math.pow(k, 0.9)));
  }
  // Head sits at the front end of the body
  const headR = 0.19;
  const front = pts[0];
  const H = E.coil ? [0.12, -0.6] : add(add(front, [0.14, -0.17]), E.headOff);
  const headTilt = E.headTilt;
  const neckTop = add(H, rotate([-0.4 * headR, 0.5 * headR], headTilt));
  const body = [neckTop, ...pts];
  const bodyHW = [0.1, ...hw];

  const target = (key, hip) => (E.abs ? E.abs[key] : add(hip, E.rel[key]));
  const hipF = add(pts[2], [0, 0.07]), hipB = add(pts[9], [0, 0.06]);
  const lf = [0.17, 0.18], lb = [0.17, 0.18];
  const legW = [0.09, 0.07];

  // Far legs and far wing
  drawLeg(ctx, add(hipB, [0.05, -0.03]), target('bf', add(hipB, [0.05, -0.03])), lb[0], lb[1], -1, legW[0], legW[1], P.far, P.farLine, null, null);
  drawLeg(ctx, add(hipF, [0.05, -0.03]), target('ff', add(hipF, [0.05, -0.03])), lf[0], lf[1], 1, legW[0], legW[1], P.far, P.farLine, null, null);
  const shoulder = add(pts[3], [0, -0.1]);
  const fw = E.farWing || [E.wing[0], E.wing[1] + 0.12];
  if (fw[0] > 0.12) drawWing(ctx, cfg.wings, cfg.wingColor, shoulder[0] + 0.06, shoulder[1] - 0.03, 0.65, fw[0], fw[1], true);

  // Back fins (the body covers their bottoms)
  const ed = tubeEdges(body, bodyHW);
  ctx.fillStyle = P.wing; ctx.strokeStyle = P.wingLine; ctx.lineWidth = LW * 0.8;
  for (let i = 3; i < n - 1; i += 2) {
    const s = 0.12 * (1 - i / (n + 4));
    drawPlate(ctx, ed.B[i][0], ed.B[i][1], -ed.N[i][0], -ed.N[i][1], s, false);
  }

  // Body
  tubePath(ctx, body, bodyHW);
  ctx.strokeStyle = P.line; ctx.lineWidth = LW * 2; ctx.stroke();
  const g = ctx.createLinearGradient(0, E.y0 - 0.2, 0, E.y0 + 0.18);
  g.addColorStop(0, P.light); g.addColorStop(0.5, P.body); g.addColorStop(1, P.dark);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = LW;
  // Belly stripe with plates along the underside
  const belly = body.map((p, i) => add(p, [ed.N[i][0] * -bodyHW[i] * 0.45, ed.N[i][1] * -bodyHW[i] * 0.45]));
  const bellyHW = bodyHW.map(w => w * 0.42);
  tubePath(ctx, belly.slice(0, n - 2), bellyHW.slice(0, n - 2));
  ctx.fillStyle = P.belly; ctx.fill();
  ctx.strokeStyle = P.bellyLine; ctx.lineWidth = LW * 0.6;
  ctx.beginPath();
  for (let i = 1; i < n - 3; i++) {
    const p = belly[i], nn = ed.N[i], w = bellyHW[i];
    ctx.moveTo(p[0] + nn[0] * w, p[1] + nn[1] * w); ctx.lineTo(p[0] - nn[0] * w, p[1] - nn[1] * w);
  }
  ctx.stroke();
  // Shiny scales along the back
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = LW * 1.4;
  ctx.beginPath();
  smoothTo(ctx, body.slice(1, n - 3).map((p, i) => add(p, [ed.N[i + 1][0] * bodyHW[i + 1] * 0.5, ed.N[i + 1][1] * bodyHW[i + 1] * 0.5])), true);
  ctx.stroke();
  ctx.lineWidth = LW;
  // Tail tuft
  tailTip(ctx, pts[n - 1], pts[n - 3], 1.0, 'spade', P.wing, P.wingLine);

  // Near legs
  drawLeg(ctx, hipB, target('bn', hipB), lb[0], lb[1], -1, legW[0], legW[1], P.body, P.line, [0.08, 0.07], P.light);
  drawLeg(ctx, hipF, target('fn', hipF), lf[0], lf[1], 1, legW[0], legW[1], P.body, P.line, [0.075, 0.07], P.light);

  drawHead(ctx, cfg, P, H[0], H[1], headR, headTilt, o, {
    snout: 1.2, eye: 0.38, hornTilt: E.hornTilt, mane: true, whiskers: true,
  });

  drawWing(ctx, cfg.wings, cfg.wingColor, shoulder[0], shoulder[1], 0.65, E.wing[0], E.wing[1], false);
}

// ---------- The whole dragon ----------
// opts: {
//   t: time in seconds, walk: walking phase, moving, airborne, flying (older flags),
//   pose: idle | run | jump | fall | wall | climb | vault | slide | roll | fly,
//   poseT: 0..1 progress for climb / vault / roll,
//   vy: up/down speed (tiles/s, negative = up), speed: |vx| / run speed,
//   squash: -1..1 (positive = squished flat from landing, negative = stretched from jumping)
// }
export function drawDragon(ctx, cfg, x, y, scale, facing = 1, opts = {}) {
  const o = resolveOpts(opts);
  const P = palette(cfg);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);
  const sq = clamp(opts.squash || 0, -1, 1);
  if (sq) ctx.scale(1 + 0.18 * sq, 1 - 0.18 * sq);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = LW;
  if (cfg.type === 'eastern') drawEastern(ctx, cfg, P, o);
  else drawQuad(ctx, cfg, P, o);
  ctx.restore();
}
