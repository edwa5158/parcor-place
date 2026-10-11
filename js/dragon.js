// Draws a dragon from its settings. Used by the dragon maker and the game.
// Drawing units: 1 = one tile. (0, 0) is between the dragon's feet; it faces right.

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

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = c => Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt))));
  r = f(r); g = f(g); b = f(b);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}
function fillStroke(ctx, fill, stroke) {
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = stroke; ctx.stroke();
}

// ---------- Wings ----------
// Drawn from the shoulder, pointing up and back. `open` 0 = folded, 1 = wide open.
function drawWing(ctx, style, color, x, y, size, open, back) {
  if (style === 'none') return;
  const fill = back ? shade(color, -0.25) : color;
  const line = shade(color, -0.45);
  ctx.save();
  ctx.translate(x, y);
  const s = style === 'tiny' ? size * 0.55 : size;
  ctx.scale(s, s);
  ctx.rotate(-0.5 + open * -0.9 + (back ? -0.15 : 0));
  ctx.lineWidth = 0.05 / s;
  if (style === 'bat' || style === 'tiny') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0.05, -0.75);
    ctx.lineTo(-0.15, -0.8);
    ctx.quadraticCurveTo(-0.3, -0.5, -0.45, -0.62);
    ctx.quadraticCurveTo(-0.5, -0.3, -0.7, -0.35);
    ctx.quadraticCurveTo(-0.55, -0.1, -0.6, 0.05);
    ctx.quadraticCurveTo(-0.3, -0.05, 0, 0);
    fillStroke(ctx, fill, line);
    ctx.beginPath();
    ctx.moveTo(0.02, -0.1); ctx.lineTo(-0.45, -0.62);
    ctx.moveTo(0.02, -0.1); ctx.lineTo(-0.7, -0.35);
    ctx.stroke();
  } else if (style === 'feather') {
    for (let i = 0; i < 5; i++) {
      const a = -0.25 - i * 0.28;
      const len = 0.85 - i * 0.08;
      ctx.save();
      ctx.rotate(a);
      ellipse(ctx, 0, -len / 2, 0.13, len / 2);
      fillStroke(ctx, i % 2 ? shade(fill, 0.15) : fill, line);
      ctx.restore();
    }
  } else if (style === 'butterfly') {
    ellipse(ctx, -0.25, -0.5, 0.3, 0.38, -0.5);
    fillStroke(ctx, fill, line);
    ellipse(ctx, -0.35, -0.08, 0.22, 0.16, 0.3);
    fillStroke(ctx, shade(fill, 0.15), line);
    ellipse(ctx, -0.3, -0.52, 0.1, 0.12, -0.5);
    ctx.fillStyle = shade(fill, 0.5); ctx.fill();
  }
  ctx.restore();
}

// ---------- Horns ----------
function drawHorns(ctx, style, x, y, scale = 1) {
  if (style === 'none') return;
  const fill = '#fff3c4';
  const line = '#a1887f';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineWidth = 0.04;
  const horn = (dx, h, lean) => {
    ctx.beginPath();
    ctx.moveTo(dx - 0.06, 0);
    ctx.quadraticCurveTo(dx - 0.06 - lean * 0.5, -h * 0.6, dx - lean, -h);
    ctx.quadraticCurveTo(dx + 0.02 - lean * 0.3, -h * 0.5, dx + 0.06, 0);
    ctx.closePath();
    fillStroke(ctx, fill, line);
  };
  if (style === 'small') { horn(-0.08, 0.16, 0.06); horn(0.06, 0.18, 0.06); }
  else if (style === 'long') { horn(-0.1, 0.38, 0.18); horn(0.05, 0.42, 0.2); }
  else if (style === 'curly') {
    ctx.lineWidth = 0.11;
    ctx.lineCap = 'round';
    ctx.strokeStyle = line;
    ctx.beginPath();
    ctx.moveTo(-0.02, 0);
    ctx.bezierCurveTo(-0.2, -0.38, -0.52, -0.25, -0.45, 0.02);
    ctx.bezierCurveTo(-0.4, 0.14, -0.24, 0.1, -0.27, -0.03);
    ctx.stroke();
    ctx.lineWidth = 0.065;
    ctx.strokeStyle = fill;
    ctx.stroke();
  } else if (style === 'antlers') {
    ctx.lineCap = 'round';
    for (const [dx, k] of [[-0.08, 0.9], [0.06, 1]]) {
      ctx.strokeStyle = line; ctx.lineWidth = 0.075;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(dx, 0); ctx.lineTo(dx - 0.12 * k, -0.35 * k);
        ctx.moveTo(dx - 0.05 * k, -0.15 * k); ctx.lineTo(dx + 0.07 * k, -0.25 * k);
        ctx.moveTo(dx - 0.1 * k, -0.28 * k); ctx.lineTo(dx - 0.25 * k, -0.36 * k);
      };
      path(); ctx.stroke();
      ctx.strokeStyle = '#d7b98e'; ctx.lineWidth = 0.04;
      path(); ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------- Eye ----------
function drawEye(ctx, x, y, r, color, blink) {
  if (blink) {
    ctx.beginPath();
    ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y + r * 0.6, x + r, y);
    ctx.strokeStyle = '#222'; ctx.lineWidth = r * 0.35; ctx.stroke();
    return;
  }
  ellipse(ctx, x, y, r, r * 1.1);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.lineWidth = r * 0.2; ctx.strokeStyle = '#222'; ctx.stroke();
  ellipse(ctx, x + r * 0.25, y + r * 0.05, r * 0.68, r * 0.78);
  ctx.fillStyle = color; ctx.fill();
  ellipse(ctx, x + r * 0.32, y + r * 0.08, r * 0.35, r * 0.45);
  ctx.fillStyle = '#111'; ctx.fill();
  ellipse(ctx, x + r * 0.05, y - r * 0.3, r * 0.2, r * 0.2);
  ctx.fillStyle = '#fff'; ctx.fill();
}

function drawLeg(ctx, hx, hy, len, w, angle, fill, line) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.roundRect(-w / 2, -w / 3, w, len + w / 3, w / 2);
  fillStroke(ctx, fill, line);
  ellipse(ctx, w * 0.25, len, w * 0.7, w * 0.4);
  fillStroke(ctx, fill, line);
  ctx.restore();
}

// ---------- The whole dragon ----------
// opts: { t: time in seconds, walk: walking phase, moving, airborne, flying, hurt }
export function drawDragon(ctx, cfg, x, y, scale, facing = 1, opts = {}) {
  const t = opts.t || 0;
  const walk = opts.walk || 0;
  const moving = !!opts.moving;
  const airborne = !!opts.airborne;
  const flying = !!opts.flying;
  const blink = (t % 3.2) > 3.05;
  const body = cfg.body;
  const line = shade(body, -0.5);
  const belly = shade(body, 0.45);
  const far = shade(body, -0.22);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.045;

  const bob = moving && !airborne ? Math.abs(Math.sin(walk)) * -0.04 : 0;
  const swing = moving && !airborne ? Math.sin(walk) * 0.5 : 0;
  const tuck = airborne ? 0.6 : 0;
  const flap = flying ? (Math.sin(t * 9) + 1) / 2 : 0;
  const wingOpen = flying ? 0.3 + flap * 0.9 : (airborne ? 0.25 : 0);
  ctx.translate(0, bob);

  if (cfg.type === 'eastern') {
    drawEastern(ctx, cfg, { t, walk, moving, airborne, flying, swing, tuck, blink, line, belly, far, wingOpen });
    ctx.restore();
    return;
  }

  const baby = cfg.type === 'baby';
  const spiky = cfg.type === 'spiky';
  const bodyX = baby ? -0.08 : -0.08;
  const bodyY = baby ? -0.42 : -0.5;
  const bodyRx = baby ? 0.36 : 0.46;
  const bodyRy = baby ? 0.3 : 0.29;
  const legLen = baby ? 0.22 : 0.32;
  const headX = baby ? 0.32 : 0.48;
  const headY = baby ? -0.88 : -1.02;
  const headR = baby ? 0.3 : 0.23;

  // Far wing
  drawWing(ctx, cfg.wings, cfg.wingColor, bodyX + 0.05, bodyY - bodyRy + 0.06, baby ? 0.8 : 1.05, wingOpen, true);

  // Far legs
  drawLeg(ctx, bodyX + bodyRx * 0.55 + 0.04, bodyY + 0.1, legLen, 0.14, -swing - tuck, far, line);
  drawLeg(ctx, bodyX - bodyRx * 0.55 + 0.04, bodyY + 0.1, legLen, 0.15, swing - tuck * 0.5, far, line);

  // Tail
  const wag = Math.sin(t * 3) * 0.08;
  const tx0 = bodyX - bodyRx * 0.8, ty0 = bodyY + 0.02;
  const tipX = baby ? -0.75 : -1.05, tipY = (baby ? -0.5 : -0.75) + wag;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tx0, ty0);
  ctx.quadraticCurveTo(tipX * 0.75, bodyY + 0.2, tipX, tipY);
  ctx.strokeStyle = line; ctx.lineWidth = 0.2 + 0.045 * 2; ctx.stroke();
  ctx.strokeStyle = body; ctx.lineWidth = 0.2; ctx.stroke();
  ctx.lineWidth = 0.045;
  // Tail tip
  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(-0.9 + wag);
  ctx.beginPath();
  ctx.moveTo(0, 0.08); ctx.lineTo(-0.1, -0.16); ctx.lineTo(0.0, -0.08); ctx.lineTo(0.12, -0.16); ctx.closePath();
  fillStroke(ctx, spiky ? cfg.wingColor : body, line);
  ctx.restore();

  // Body
  ellipse(ctx, bodyX, bodyY, bodyRx, bodyRy);
  fillStroke(ctx, body, line);
  ellipse(ctx, bodyX + 0.06, bodyY + bodyRy * 0.38, bodyRx * 0.72, bodyRy * 0.5);
  ctx.fillStyle = belly; ctx.fill();

  // Back spikes (along the back, neck and tail)
  if (spiky) {
    ctx.fillStyle = cfg.wingColor;
    ctx.strokeStyle = shade(cfg.wingColor, -0.45);
    const spike = (sx, sy, ang, size) => {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(-0.08 * size, 0.04); ctx.lineTo(0, -0.24 * size); ctx.lineTo(0.08 * size, 0.04);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    };
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (0.3 + i * 0.11);
      spike(bodyX + Math.cos(a) * bodyRx * 0.92, bodyY - Math.sin(a) * bodyRy * 0.92, Math.PI / 2 - a, 1.45);
    }
    for (let i = 1; i <= 3; i++) {
      const k = i / 4;
      const cx = tipX * 0.75, cy = bodyY + 0.2;
      const px = (1 - k) * (1 - k) * tx0 + 2 * (1 - k) * k * cx + k * k * tipX;
      const py = (1 - k) * (1 - k) * ty0 + 2 * (1 - k) * k * cy + k * k * tipY;
      spike(px, py - 0.06, -0.6, 1.3 - k * 0.5);
    }
  }

  // Neck
  if (!baby) {
    ctx.beginPath();
    ctx.moveTo(bodyX + bodyRx * 0.55, bodyY - 0.05);
    ctx.quadraticCurveTo(headX - 0.02, bodyY - 0.15, headX - 0.04, headY + 0.1);
    ctx.strokeStyle = line; ctx.lineWidth = 0.28 + 0.09; ctx.stroke();
    ctx.strokeStyle = body; ctx.lineWidth = 0.28; ctx.stroke();
    ctx.lineWidth = 0.045;
  }

  // Near legs
  drawLeg(ctx, bodyX + bodyRx * 0.55, bodyY + 0.12, legLen, 0.15, swing - tuck, body, line);
  drawLeg(ctx, bodyX - bodyRx * 0.55, bodyY + 0.12, legLen, 0.17, -swing - tuck * 0.5, body, line);

  // Head
  drawHorns(ctx, cfg.horns, headX - headR * 0.25, headY - headR * 0.75, baby ? 1.05 : 1);
  ellipse(ctx, headX, headY, headR, headR * 0.88);
  fillStroke(ctx, body, line);
  const snX = headX + headR * 0.85, snY = headY + headR * 0.25;
  ellipse(ctx, snX, snY, headR * 0.7, headR * 0.5);
  fillStroke(ctx, body, line);
  ellipse(ctx, snX + headR * 0.42, snY - headR * 0.18, headR * 0.07, headR * 0.05);
  ctx.fillStyle = line; ctx.fill();
  // Smile
  ctx.beginPath();
  ctx.arc(snX + headR * 0.05, snY + headR * 0.05, headR * 0.4, 0.3, 1.4);
  ctx.strokeStyle = line; ctx.stroke();
  // Cheek
  ellipse(ctx, headX + headR * 0.15, headY + headR * 0.42, headR * 0.18, headR * 0.12);
  ctx.fillStyle = 'rgba(255,120,150,0.35)'; ctx.fill();
  drawEye(ctx, headX + headR * 0.2, headY - headR * 0.15, headR * (baby ? 0.42 : 0.36), cfg.eyes, blink);

  // Near wing
  drawWing(ctx, cfg.wings, cfg.wingColor, bodyX - 0.02, bodyY - bodyRy + 0.08, baby ? 0.8 : 1.05, wingOpen, false);

  ctx.restore();
}

function drawEastern(ctx, cfg, o) {
  const body = cfg.body;
  const n = 16;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const wave = o.flying ? Math.sin(o.t * 6 - i * 0.55) * 0.14 : Math.sin(o.walk * 0.8 - i * 0.7) * (o.moving ? 0.07 : 0.03) + Math.sin(o.t * 2 - i * 0.4) * 0.02;
    pts.push({
      x: 0.32 - k * 1.45,
      y: -0.48 + wave - (o.flying ? 0 : k * k * 0.12),
      r: 0.17 - k * 0.11,
    });
  }
  // Far legs
  drawLeg(ctx, pts[3].x + 0.04, pts[3].y + 0.05, 0.3, 0.11, -o.swing - o.tuck, o.far, o.line);
  drawLeg(ctx, pts[10].x + 0.04, pts[10].y + 0.05, 0.3 + pts[10].y + 0.48, 0.1, o.swing - o.tuck, o.far, o.line);

  drawWing(ctx, cfg.wings, cfg.wingColor, pts[4].x, pts[4].y - 0.12, 0.8, o.wingOpen, true);

  // Body outline then fill, so it looks like one long snake-y body
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [color, extra] of [[o.line, 0.09], [body, 0]]) {
    for (let i = n - 1; i > 0; i--) {
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
      ctx.strokeStyle = color;
      ctx.lineWidth = (pts[i].r + pts[i - 1].r) + extra;
      ctx.stroke();
    }
  }
  // Belly stripe
  for (let i = n - 1; i > 0; i--) {
    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y + pts[i].r * 0.55);
    ctx.lineTo(pts[i - 1].x, pts[i - 1].y + pts[i - 1].r * 0.55);
    ctx.strokeStyle = o.belly;
    ctx.lineWidth = (pts[i].r + pts[i - 1].r) * 0.4;
    ctx.stroke();
  }
  // Fin tufts along the back
  ctx.fillStyle = cfg.wingColor;
  ctx.strokeStyle = shade(cfg.wingColor, -0.45);
  ctx.lineWidth = 0.03;
  for (let i = 2; i < n - 1; i += 2) {
    const p = pts[i];
    ctx.beginPath();
    ctx.moveTo(p.x + 0.05, p.y - p.r * 0.9);
    ctx.quadraticCurveTo(p.x - 0.02, p.y - p.r - 0.14, p.x - 0.1, p.y - p.r - 0.06);
    ctx.lineTo(p.x - 0.06, p.y - p.r * 0.8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // Tail tuft
  const tip = pts[n - 1];
  ellipse(ctx, tip.x - 0.06, tip.y - 0.02, 0.12, 0.06, 0.4);
  ctx.fill(); ctx.stroke();
  ctx.lineWidth = 0.045;

  // Near legs
  drawLeg(ctx, pts[3].x, pts[3].y + 0.07, 0.3, 0.12, o.swing - o.tuck, body, o.line);
  drawLeg(ctx, pts[10].x, pts[10].y + 0.07, 0.3 + pts[10].y + 0.48, 0.11, -o.swing - o.tuck, body, o.line);

  // Head
  const hx = 0.46, hy = pts[0].y - 0.22;
  // Mane
  ctx.fillStyle = cfg.wingColor;
  ctx.strokeStyle = shade(cfg.wingColor, -0.45);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(hx - 0.1, hy - 0.05 + i * 0.07);
    ctx.lineTo(hx - 0.36 - i * 0.03, hy - 0.12 + i * 0.12);
    ctx.lineTo(hx - 0.12, hy + 0.04 + i * 0.07);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  drawHorns(ctx, cfg.horns, hx - 0.06, hy - 0.13, 0.95);
  ellipse(ctx, hx, hy, 0.2, 0.16);
  fillStroke(ctx, body, o.line);
  ellipse(ctx, hx + 0.2, hy + 0.04, 0.16, 0.1);
  fillStroke(ctx, body, o.line);
  ellipse(ctx, hx + 0.3, hy, 0.022, 0.016);
  ctx.fillStyle = o.line; ctx.fill();
  // Whiskers
  ctx.strokeStyle = shade(cfg.wingColor, -0.2);
  ctx.lineWidth = 0.025;
  const wv = Math.sin(o.t * 3) * 0.04;
  ctx.beginPath();
  ctx.moveTo(hx + 0.3, hy + 0.04);
  ctx.bezierCurveTo(hx + 0.42, hy + 0.1, hx + 0.38, hy + 0.25 + wv, hx + 0.5, hy + 0.28 + wv);
  ctx.moveTo(hx + 0.28, hy + 0.07);
  ctx.bezierCurveTo(hx + 0.32, hy + 0.2, hx + 0.2, hy + 0.3 - wv, hx + 0.3, hy + 0.38 - wv);
  ctx.stroke();
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  ctx.arc(hx + 0.2, hy + 0.06, 0.08, 0.4, 1.5);
  ctx.strokeStyle = o.line; ctx.stroke();
  drawEye(ctx, hx + 0.03, hy - 0.04, 0.075, cfg.eyes, o.blink);

  drawWing(ctx, cfg.wings, cfg.wingColor, pts[4].x - 0.04, pts[4].y - 0.1, 0.8, o.wingOpen, false);
}
