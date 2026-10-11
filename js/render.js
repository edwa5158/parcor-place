// Drawing the worlds: backgrounds, ground, crates, spikes, lava, springs, flags and gems.

import { shade } from './dragon.js';
import { SLOPE, tileAt } from './physics.js';

const TAU = Math.PI * 2;

// Simple repeatable random numbers so backgrounds don't flicker.
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Draws one repeating layer of background shapes that scrolls slower than the ground.
function layer(ctx, w, h, camX, parallax, spacing, draw) {
  const off = camX * parallax;
  const first = Math.floor(off / spacing) - 1;
  const last = Math.ceil((off + w) / spacing) + 1;
  for (let i = first; i <= last; i++) draw(i * spacing - off, i, hash(i + parallax * 1000));
}

function cloud(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 22 * s, 0, TAU);
  ctx.arc(x + 25 * s, y - 12 * s, 28 * s, 0, TAU);
  ctx.arc(x + 55 * s, y, 22 * s, 0, TAU);
  ctx.rect(x, y - 2 * s, 55 * s, 22 * s);
  ctx.fill();
}

const BACKGROUNDS = {
  city(ctx, w, h, camX, t, th) {
    ctx.fillStyle = 'rgba(255,240,200,0.9)';
    ctx.beginPath(); ctx.arc(w * 0.75, h * 0.25, h * 0.09, 0, TAU); ctx.fill();
    layer(ctx, w, h, camX, 0.15, 130, (x, i, r) => {
      const bh = h * (0.3 + r * 0.25);
      ctx.fillStyle = '#d98a6a';
      ctx.fillRect(x, h - bh, 100, bh);
    });
    // All the buildings in one shape, then all the lit windows in one shape
    ctx.fillStyle = '#b06a55';
    ctx.beginPath();
    layer(ctx, w, h, camX, 0.3, 110, (x, i, r) => {
      const bh = h * (0.22 + r * 0.22);
      ctx.rect(x, h - bh, 85, bh);
    });
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    layer(ctx, w, h, camX, 0.3, 110, (x, i, r) => {
      const bh = h * (0.22 + r * 0.22);
      for (let wy = h - bh + 15; wy < h - 20; wy += 28)
        for (let wx = x + 12; wx < x + 75; wx += 22)
          if (hash(wx * 3 + wy) > 0.45) ctx.rect(wx, wy, 10, 14);
    });
    ctx.fill();
  },
  trees(ctx, w, h, camX) {
    layer(ctx, w, h, camX, 0.15, 120, (x, i, r) => {
      ctx.fillStyle = '#9bd49a';
      ctx.beginPath(); ctx.arc(x + 60, h * (0.62 + r * 0.1), 80 + r * 30, 0, TAU); ctx.fill();
    });
    layer(ctx, w, h, camX, 0.35, 140, (x, i, r) => {
      const top = h * (0.45 + r * 0.15);
      ctx.fillStyle = '#7a5a3a';
      ctx.fillRect(x + 60, top, 18, h - top);
      ctx.fillStyle = '#5fae5c';
      ctx.beginPath();
      ctx.arc(x + 69, top, 55, 0, TAU);
      ctx.arc(x + 35, top + 25, 38, 0, TAU);
      ctx.arc(x + 105, top + 25, 38, 0, TAU);
      ctx.fill();
    });
  },
  castle(ctx, w, h, camX) {
    layer(ctx, w, h, camX, 0.1, 260, (x, i, r) => cloud(ctx, x, h * (0.15 + r * 0.15), 1.2, 'rgba(255,255,255,0.8)'));
    layer(ctx, w, h, camX, 0.3, 200, (x, i, r) => {
      const th = h * (0.35 + r * 0.25);
      ctx.fillStyle = '#9aa3b8';
      ctx.fillRect(x, h - th * 0.6, 200, th * 0.6);
      ctx.fillRect(x + 20, h - th, 60, th);
      for (let k = 0; k < 4; k++) ctx.fillRect(x + 20 + k * 17, h - th - 14, 10, 14);
      ctx.fillStyle = '#7d869b';
      ctx.beginPath(); ctx.moveTo(x + 15, h - th - 14); ctx.lineTo(x + 50, h - th - 70); ctx.lineTo(x + 85, h - th - 14); ctx.fill();
      ctx.fillStyle = '#e53935';
      ctx.fillRect(x + 50, h - th - 95, 3, 25);
      ctx.beginPath(); ctx.moveTo(x + 53, h - th - 95); ctx.lineTo(x + 75, h - th - 88); ctx.lineTo(x + 53, h - th - 81); ctx.fill();
      ctx.fillStyle = '#5a6275';
      ctx.fillRect(x + 42, h - th + 30, 16, 26);
    });
  },
  clouds(ctx, w, h, camX, t) {
    layer(ctx, w, h, camX - t * 8, 0.1, 230, (x, i, r) => cloud(ctx, x, h * (0.15 + r * 0.5), 1.4, 'rgba(255,255,255,0.6)'));
    layer(ctx, w, h, camX - t * 15, 0.3, 300, (x, i, r) => cloud(ctx, x, h * (0.3 + r * 0.5), 2.2, 'rgba(255,255,255,0.85)'));
    // Rainbow
    const off = camX * 0.05;
    for (let k = 0; k < 6; k++) {
      ctx.strokeStyle = ['#ff5252', '#ffab40', '#ffee58', '#69f0ae', '#40c4ff', '#b388ff'][k];
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 12;
      ctx.beginPath(); ctx.arc(w * 0.7 - off, h * 0.9, h * 0.55 - k * 12, Math.PI, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  volcano(ctx, w, h, camX, t) {
    layer(ctx, w, h, camX, 0.15, 420, (x, i, r) => {
      const vh = h * (0.45 + r * 0.2);
      ctx.fillStyle = '#2b1414';
      ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 170, h - vh); ctx.lineTo(x + 230, h - vh); ctx.lineTo(x + 400, h); ctx.fill();
      ctx.fillStyle = '#ff7043';
      ctx.beginPath(); ctx.moveTo(x + 175, h - vh); ctx.lineTo(x + 225, h - vh); ctx.lineTo(x + 215, h - vh + 30); ctx.lineTo(x + 185, h - vh + 30); ctx.fill();
    });
    // Embers floating up
    ctx.fillStyle = '#ffb74d';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (let k = 0; k < 25; k++) {
      const ex = ((hash(k) * w * 1.5 - camX * 0.4) % w + w) % w;
      const ey = h - ((t * (20 + hash(k + 9) * 30) + hash(k + 3) * h) % h);
      ctx.rect(ex, ey, 3, 3);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  },
  ice(ctx, w, h, camX, t) {
    layer(ctx, w, h, camX, 0.12, 320, (x, i, r) => {
      const mh = h * (0.4 + r * 0.3);
      ctx.fillStyle = '#b9d7ea';
      ctx.beginPath(); ctx.moveTo(x - 60, h); ctx.lineTo(x + 160, h - mh); ctx.lineTo(x + 380, h); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(x + 160, h - mh); ctx.lineTo(x + 110, h - mh + 50); ctx.lineTo(x + 140, h - mh + 40);
      ctx.lineTo(x + 165, h - mh + 55); ctx.lineTo(x + 210, h - mh + 50); ctx.fill();
    });
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (let k = 0; k < 40; k++) {
      const sx = ((hash(k) * w * 2 - camX * 0.5 + Math.sin(t + k) * 15) % w + w) % w;
      const sy = (t * (25 + hash(k + 5) * 25) + hash(k + 2) * h) % h;
      const r = 2 + hash(k + 7) * 2;
      ctx.moveTo(sx + r, sy);
      ctx.arc(sx, sy, r, 0, TAU);
    }
    ctx.fill();
  },
  crystals(ctx, w, h, camX, t) {
    layer(ctx, w, h, camX, 0.2, 150, (x, i, r) => {
      const ch = h * (0.15 + r * 0.25);
      const colors = ['#7e57c2', '#26c6da', '#ec407a', '#66bb6a'];
      ctx.fillStyle = colors[i & 3 & 3] || colors[0];
      ctx.globalAlpha = 0.4 + 0.15 * Math.sin(t * 2 + i);
      ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 25, h - ch); ctx.lineTo(x + 50, h); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 40, h); ctx.lineTo(x + 58, h - ch * 0.6); ctx.lineTo(x + 76, h); ctx.fill();
      // Hanging from the ceiling
      ctx.beginPath(); ctx.moveTo(x + 70, 0); ctx.lineTo(x + 85, ch * 0.7); ctx.lineTo(x + 100, 0); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    for (let k = 0; k < 20; k++) {
      ctx.globalAlpha = Math.max(0, Math.sin(t * 2 + k * 1.7));
      const sx = ((hash(k) * w * 2 - camX * 0.25) % w + w) % w;
      ctx.fillRect(sx, hash(k + 1) * h * 0.8, 3, 3);
    }
    ctx.globalAlpha = 1;
  },
  desert(ctx, w, h, camX) {
    ctx.fillStyle = 'rgba(255,250,220,0.95)';
    ctx.beginPath(); ctx.arc(w * 0.2, h * 0.2, h * 0.1, 0, TAU); ctx.fill();
    layer(ctx, w, h, camX, 0.12, 500, (x, i, r) => {
      const ph = h * (0.25 + r * 0.15);
      ctx.fillStyle = '#e0a95a';
      ctx.beginPath(); ctx.moveTo(x + 100, h * 0.85); ctx.lineTo(x + 100 + ph, h * 0.85 - ph); ctx.lineTo(x + 100 + ph * 2, h * 0.85); ctx.fill();
      ctx.fillStyle = '#c98f45';
      ctx.beginPath(); ctx.moveTo(x + 100 + ph, h * 0.85 - ph); ctx.lineTo(x + 100 + ph * 2, h * 0.85); ctx.lineTo(x + 100 + ph * 1.3, h * 0.85); ctx.fill();
    });
    const off = camX * 0.3;
    ctx.fillStyle = '#efc27a';
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, h * 0.8 + Math.sin((x + off) / 120) * 25);
    ctx.lineTo(w, h); ctx.fill();
  },
  factory(ctx, w, h, camX, t) {
    layer(ctx, w, h, camX, 0.2, 240, (x, i, r) => {
      const cx = x + 100, cy = h * (0.3 + r * 0.4), R = 40 + r * 40;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * (i % 2 ? 0.5 : -0.5));
      ctx.fillStyle = '#78909c';
      for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-R * 0.15, -R * 1.2, R * 0.3, R * 0.4); }
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      ctx.fillStyle = '#90a4ae';
      ctx.beginPath(); ctx.arc(0, 0, R * 0.35, 0, TAU); ctx.fill();
      ctx.restore();
    });
    layer(ctx, w, h, camX, 0.35, 180, (x, i, r) => {
      ctx.fillStyle = '#607d8b';
      ctx.fillRect(x, h * (0.2 + r * 0.3), 180, 16);
      ctx.fillRect(x + 140, h * (0.2 + r * 0.3), 16, h);
    });
  },
  tower(ctx, w, h, camX, t) {
    ctx.fillStyle = '#fff';
    for (let k = 0; k < 60; k++) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + k);
      const sx = ((hash(k) * w * 3 - camX * 0.05) % w + w) % w;
      ctx.fillRect(sx, hash(k + 1) * h * 0.7, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff8e1';
    ctx.beginPath(); ctx.arc(w * 0.8, h * 0.2, h * 0.08, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a2a7a';
    ctx.beginPath(); ctx.arc(w * 0.8 + h * 0.03, h * 0.19, h * 0.07, 0, TAU); ctx.fill();
    layer(ctx, w, h, camX, 0.15, 600, (x, i, r) => {
      const tx = x + 250;
      ctx.fillStyle = '#2a2058';
      ctx.fillRect(tx, h * 0.3, 90, h * 0.7);
      ctx.beginPath(); ctx.moveTo(tx - 15, h * 0.3); ctx.lineTo(tx + 45, h * 0.05); ctx.lineTo(tx + 105, h * 0.3); ctx.fill();
      ctx.fillStyle = '#ffd54f';
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3);
      ctx.fillRect(tx + 35, h * 0.4, 20, 28);
      ctx.globalAlpha = 1;
    });
  },
};

let skyCache = { theme: null, h: 0, ctx: null, g: null };
export function drawBackground(ctx, theme, w, h, camXpx, t) {
  if (skyCache.theme !== theme || skyCache.h !== h || skyCache.ctx !== ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, theme.sky[0]);
    g.addColorStop(1, theme.sky[1]);
    skyCache = { theme, h, ctx, g };
  }
  ctx.fillStyle = skyCache.g;
  ctx.fillRect(0, 0, w, h);
  BACKGROUNDS[theme.bg](ctx, w, h, camXpx, t, theme);
}

// ---------- Tiles ----------
// Every drawing function below gets the tile's top-left corner (px, py) and its size s.
// `nb(dx, dy)` is the letter next to this tile, for things that join up (bushes, roofs, stacks).

const isGroundish = c => c === '#' || !!SLOPE[c.charCodeAt(0)];

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}

function groundTexture(ctx, theme, px, py, s, tx, ty) {
  ctx.strokeStyle = theme.groundLine;
  ctx.lineWidth = Math.max(1, s * 0.04);
  const tex = theme.texture;
  if (tex === 'brick' || tex === 'stone') {
    const rows = tex === 'brick' ? 3 : 2;
    const rh = s / rows;
    ctx.beginPath();
    for (let r = 0; r < rows; r++) {
      ctx.moveTo(px, py + r * rh); ctx.lineTo(px + s, py + r * rh);
      const shift = ((ty * rows + r) % 2) * 0.5;
      ctx.moveTo(px + s * shift, py + r * rh); ctx.lineTo(px + s * shift, py + (r + 1) * rh);
    }
    ctx.stroke();
  } else if (tex === 'wood') {
    ctx.beginPath();
    ctx.moveTo(px + s * 0.33, py); ctx.lineTo(px + s * 0.33, py + s);
    ctx.moveTo(px + s * 0.66, py); ctx.lineTo(px + s * 0.66, py + s);
    ctx.stroke();
  } else if (tex === 'metal') {
    ctx.strokeRect(px + s * 0.08, py + s * 0.08, s * 0.84, s * 0.84);
    ctx.fillStyle = theme.groundLine;
    const b = s * 0.06;
    for (const [a, c] of [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]]) ctx.fillRect(px + s * a - b / 2, py + s * c - b / 2, b, b);
  } else if (tex === 'sand') {
    // Little wind ripples
    const n = hash(tx * 13 + ty * 7);
    ctx.beginPath();
    for (const k of [0.3, 0.7]) {
      const y = py + s * (k + n * 0.15);
      ctx.moveTo(px + s * 0.1, y); ctx.quadraticCurveTo(px + s * 0.35, y - s * 0.08, px + s * 0.6, y);
    }
    ctx.stroke();
  } else if (tex !== 'cloud') {
    ctx.fillStyle = theme.groundLine;
    const n = hash(tx * 31 + ty * 17);
    ctx.beginPath();
    ctx.arc(px + s * (0.2 + n * 0.5), py + s * (0.3 + hash(n) * 0.4), s * 0.07, 0, TAU);
    ctx.arc(px + s * (0.7 - n * 0.3), py + s * (0.75 - n * 0.2), s * 0.05, 0, TAU);
    ctx.fill();
  }
}

function groundTile(ctx, theme, px, py, s, tx, ty, topOpen, bottomOpen) {
  ctx.fillStyle = theme.ground;
  ctx.fillRect(px, py, s + 1, s + 1);
  groundTexture(ctx, theme, px, py, s, tx, ty);
  if (bottomOpen) {
    // The underside of a ceiling: a shadowy edge so it reads as a roof
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(px, py + s * 0.8, s + 1, s * 0.2);
    ctx.fillStyle = theme.groundLine;
    ctx.fillRect(px, py + s * 0.92, s + 1, s * 0.08);
  }
  if (topOpen) {
    ctx.fillStyle = theme.groundTop;
    ctx.fillRect(px, py, s + 1, s * 0.26);
    if (theme.texture === 'cloud') {
      ctx.beginPath();
      for (let k = 0; k < 3; k++) ctx.arc(px + s * (0.2 + k * 0.3), py + s * 0.05, s * 0.22, 0, TAU);
      ctx.fill();
    } else if (theme.texture === 'ice') {
      ctx.fillStyle = '#e6f7ff';
      ctx.beginPath(); ctx.moveTo(px + s * 0.2, py + s * 0.26); ctx.lineTo(px + s * 0.3, py + s * 0.5); ctx.lineTo(px + s * 0.4, py + s * 0.26); ctx.fill();
    } else if (theme.bg === 'trees') {
      ctx.fillStyle = shade(theme.groundTop, -0.2);
      ctx.fillRect(px, py + s * 0.22, s + 1, s * 0.06);
    } else {
      ctx.fillStyle = shade(theme.groundTop, 0.25);
      ctx.fillRect(px, py, s + 1, s * 0.07);
    }
  }
}

// Hills and dunes. The inside looks like the ground; the top edge depends on the world:
// shingles on the rooftops, puffs on clouds, snow on the mountain, stripes on factory ramps.
function slopeTile(ctx, theme, px, py, s, tx, ty, sl, nb) {
  const yl = py + s * (1 - sl[0]), yr = py + s * (1 - sl[1]);
  const body = [px, py + s + 1, px, yl, px + s + 1, yr, px + s + 1, py + s + 1];
  ctx.save();
  poly(ctx, body);
  ctx.clip();
  ctx.fillStyle = theme.ground;
  ctx.fillRect(px, py, s + 1, s + 1);
  groundTexture(ctx, theme, px, py, s, tx, ty);
  ctx.restore();

  const band = theme.roofs ? s * 0.34 : s * 0.26;
  ctx.fillStyle = theme.groundTop;
  poly(ctx, [px, yl, px + s + 1, yr, px + s + 1, yr + band, px, yl + band]);
  ctx.fill();
  const lw = Math.max(1, s * 0.04);
  if (theme.roofs) {
    // Roof shingles, and a ridge cap on the very top
    ctx.strokeStyle = shade(theme.groundTop, -0.35);
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let k = 1; k < 4; k++) {
      const x = px + (s * k) / 4, y = yl + (yr - yl) * (k / 4);
      ctx.moveTo(x, y); ctx.lineTo(x - s * 0.05, y + band);
    }
    ctx.moveTo(px, yl + band * 0.5); ctx.lineTo(px + s, yr + band * 0.5);
    ctx.stroke();
    const peak = sl[1] === 1 ? (nb(1, 0) === '\\' ? 1 : 0) : sl[0] === 1 && nb(-1, 0) === '/' ? -1 : 0;
    if (peak) {
      const x = peak > 0 ? px + s : px;
      ctx.fillStyle = shade(theme.groundTop, -0.3);
      ctx.beginPath(); ctx.arc(x, py + s * 0.04, s * 0.13, 0, TAU); ctx.fill();
    }
  } else if (theme.texture === 'cloud') {
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const f = 0.2 + k * 0.3;
      ctx.arc(px + s * f, yl + (yr - yl) * f + s * 0.05, s * 0.2, 0, TAU);
    }
    ctx.fill();
  } else if (theme.texture === 'metal') {
    // Yellow and black hazard stripes on the ramp
    ctx.save();
    poly(ctx, [px, yl, px + s + 1, yr, px + s + 1, yr + band, px, yl + band]);
    ctx.clip();
    ctx.fillStyle = '#263238';
    for (let k = -1; k < 4; k++) {
      const x = px + k * s * 0.3;
      poly(ctx, [x, py + s, x + s * 0.14, py + s, x + s * 0.44, py, x + s * 0.3, py]);
      ctx.fill();
    }
    ctx.restore();
  } else {
    const edge = theme.bg === 'trees' ? shade(theme.groundTop, -0.2) : shade(theme.groundTop, 0.25);
    ctx.strokeStyle = edge;
    ctx.lineWidth = theme.bg === 'trees' ? s * 0.06 : s * 0.07;
    const off = theme.bg === 'trees' ? band - s * 0.03 : s * 0.035;
    ctx.beginPath(); ctx.moveTo(px, yl + off); ctx.lineTo(px + s + 1, yr + off); ctx.stroke();
  }
}

function platformTile(ctx, theme, px, py, s) {
  if (theme.texture === 'cloud') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px + s * 0.25, py + s * 0.45, s * 0.38, 0, TAU);
    ctx.arc(px + s * 0.7, py + s * 0.4, s * 0.42, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#dbe8fa';
    ctx.fillRect(px - 1, py + s * 0.6, s + 2, s * 0.25);
    return;
  }
  ctx.fillStyle = theme.platform;
  ctx.beginPath();
  ctx.roundRect(px, py, s + 1, s * 0.6, s * 0.12);
  ctx.fill();
  ctx.fillStyle = theme.groundTop;
  ctx.fillRect(px, py, s + 1, s * 0.18);
  ctx.strokeStyle = shade(theme.platform, -0.35);
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.beginPath(); ctx.moveTo(px, py + s * 0.6); ctx.lineTo(px + s, py + s * 0.6); ctx.stroke();
}

// ---------- Boxes: something to vault over, different in every world ----------
const CRATES = {
  // Brick chimney with a cap on top
  chimney(ctx, x, y, w, h, s, top) {
    ctx.fillStyle = '#a5523f'; ctx.strokeStyle = '#5d2a20';
    ctx.fillRect(x + w * 0.08, y, w * 0.84, h);
    ctx.beginPath();
    for (let r = 1; r < 4; r++) {
      const yy = y + (h * r) / 4;
      ctx.moveTo(x + w * 0.08, yy); ctx.lineTo(x + w * 0.92, yy);
    }
    for (let r = 0; r < 4; r++) {
      const xx = x + w * (r % 2 ? 0.36 : 0.64);
      ctx.moveTo(xx, y + (h * r) / 4); ctx.lineTo(xx, y + (h * (r + 1)) / 4);
    }
    ctx.stroke();
    ctx.strokeRect(x + w * 0.08, y, w * 0.84, h);
    if (top) {
      ctx.fillStyle = '#6d6d6d'; ctx.strokeStyle = '#3e3e3e';
      ctx.beginPath(); ctx.roundRect(x, y, w, h * 0.2, s * 0.04); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2b2b2b';
      ctx.fillRect(x + w * 0.25, y + h * 0.03, w * 0.5, h * 0.08);
    }
  },
  // Tree stump: bark on the sides, rings on top
  stump(ctx, x, y, w, h, s, top) {
    ctx.fillStyle = '#8d5b33'; ctx.strokeStyle = '#4e3018';
    ctx.beginPath(); ctx.roundRect(x + w * 0.04, y + (top ? h * 0.1 : 0), w * 0.92, h * (top ? 0.9 : 1), s * 0.05); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    for (const k of [0.25, 0.5, 0.75]) { ctx.moveTo(x + w * k, y + h * 0.3); ctx.lineTo(x + w * (k + 0.03), y + h * 0.95); }
    ctx.stroke();
    if (top) {
      ctx.fillStyle = '#e8c48f';
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.13, w * 0.46, h * 0.13, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#b8864f';
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.13, w * 0.28, h * 0.075, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.13, w * 0.12, h * 0.035, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#66bb6a'; // a little sprout
      ctx.beginPath(); ctx.ellipse(x + w * 0.78, y + h * 0.02, w * 0.1, h * 0.05, -0.6, 0, TAU); ctx.fill();
    }
  },
  // Castle stone block
  stone(ctx, x, y, w, h, s, top, theme) {
    const base = shade(theme.platform, 0.1);
    ctx.fillStyle = base;
    ctx.strokeStyle = shade(base, -0.45);
    ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.08); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade(base, 0.25);
    ctx.fillRect(x + s * 0.05, y + s * 0.05, w - s * 0.1, h * 0.16);
    ctx.strokeStyle = shade(base, -0.3);
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.5); ctx.lineTo(x + w, y + h * 0.5);
    ctx.moveTo(x + w * 0.5, y + h * 0.16); ctx.lineTo(x + w * 0.5, y + h * 0.5);
    ctx.moveTo(x + w * 0.25, y + h * 0.5); ctx.lineTo(x + w * 0.25, y + h);
    ctx.moveTo(x + w * 0.75, y + h * 0.5); ctx.lineTo(x + w * 0.75, y + h);
    ctx.stroke();
  },
  // A present with a ribbon (and a bow on the top one)
  gift(ctx, x, y, w, h, s, top, theme, tx) {
    const colors = ['#ff7eb6', '#7ec8ff', '#b39dff', '#8be0a4'];
    const c = colors[(tx * 7) % colors.length];
    ctx.fillStyle = c; ctx.strokeStyle = shade(c, -0.45);
    ctx.beginPath(); ctx.roundRect(x, y + (top ? h * 0.12 : 0), w, h * (top ? 0.88 : 1), s * 0.06); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff59d';
    ctx.fillRect(x + w * 0.42, y + (top ? h * 0.12 : 0), w * 0.16, h * (top ? 0.88 : 1));
    if (top) {
      ctx.fillRect(x, y + h * 0.34, w, h * 0.13);
      ctx.strokeStyle = '#f9a825';
      ctx.beginPath();
      ctx.ellipse(x + w * 0.36, y + h * 0.08, w * 0.14, h * 0.08, -0.3, 0, TAU);
      ctx.ellipse(x + w * 0.64, y + h * 0.08, w * 0.14, h * 0.08, 0.3, 0, TAU);
      ctx.fill(); ctx.stroke();
    }
  },
  // Round boulder with glowing lava cracks
  boulder(ctx, x, y, w, h, s, top, theme) {
    ctx.fillStyle = '#5d4b47'; ctx.strokeStyle = '#2f2523';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.1, y + h);
    ctx.quadraticCurveTo(x - w * 0.04, y + h * 0.35, x + w * 0.35, y + h * 0.06);
    ctx.quadraticCurveTo(x + w * 0.75, y - h * 0.02, x + w * 0.95, y + h * 0.4);
    ctx.quadraticCurveTo(x + w * 1.04, y + h * 0.8, x + w * 0.92, y + h);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.ellipse(x + w * 0.38, y + h * 0.28, w * 0.2, h * 0.1, -0.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = theme.liquidTop || '#ffc107';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.55); ctx.lineTo(x + w * 0.45, y + h * 0.7); ctx.lineTo(x + w * 0.4, y + h * 0.92);
    ctx.moveTo(x + w * 0.45, y + h * 0.7); ctx.lineTo(x + w * 0.7, y + h * 0.62);
    ctx.stroke();
  },
  // A see-through block of ice
  iceblock(ctx, x, y, w, h, s) {
    ctx.fillStyle = 'rgba(200,240,255,0.85)';
    ctx.strokeStyle = '#6fb6d6';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    poly(ctx, [x + w * 0.15, y + h * 0.75, x + w * 0.15, y + h * 0.2, x + w * 0.4, y + h * 0.15, x + w * 0.25, y + h * 0.3]);
    ctx.fill();
  },
  // A rock with a purple crystal growing inside
  geode(ctx, x, y, w, h, s) {
    ctx.fillStyle = '#5e4a85'; ctx.strokeStyle = '#2a1f40';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a2b57';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.55, w * 0.3, h * 0.27, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ce93d8';
    poly(ctx, [x + w * 0.35, y + h * 0.75, x + w * 0.42, y + h * 0.38, x + w * 0.5, y + h * 0.3, x + w * 0.58, y + h * 0.4, x + w * 0.65, y + h * 0.75]);
    ctx.fill();
    ctx.fillStyle = '#f3e5f5';
    poly(ctx, [x + w * 0.45, y + h * 0.7, x + w * 0.5, y + h * 0.36, x + w * 0.53, y + h * 0.7]);
    ctx.fill();
  },
  // Carved sandstone with an eye on it
  sandstone(ctx, x, y, w, h, s) {
    ctx.fillStyle = '#e3b871'; ctx.strokeStyle = '#9c6f2f';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.04); ctx.fill(); ctx.stroke();
    ctx.strokeRect(x + w * 0.12, y + h * 0.12, w * 0.76, h * 0.76);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.24, y + h * 0.5);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.28, x + w * 0.76, y + h * 0.5);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.7, x + w * 0.24, y + h * 0.5);
    ctx.stroke();
    ctx.fillStyle = '#9c6f2f';
    ctx.beginPath(); ctx.arc(x + w * 0.5, y + h * 0.5, w * 0.07, 0, TAU); ctx.fill();
  },
  // Factory crate with hazard stripes
  metal(ctx, x, y, w, h, s) {
    ctx.fillStyle = '#90a4ae';
    ctx.strokeStyle = '#455a64';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.06); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.rect(x + w * 0.1, y + h * 0.62, w * 0.8, h * 0.24); ctx.clip();
    ctx.fillStyle = '#ffb300'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#263238';
    for (let k = -1; k < 5; k++) {
      poly(ctx, [x + w * (k * 0.25), y + h, x + w * (k * 0.25 + 0.12), y + h, x + w * (k * 0.25 + 0.32), y + h * 0.5, x + w * (k * 0.25 + 0.2), y + h * 0.5]);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#455a64';
    for (const [a, b] of [[0.14, 0.14], [0.86, 0.14], [0.14, 0.48], [0.86, 0.48]]) {
      ctx.beginPath(); ctx.arc(x + w * a, y + h * b, s * 0.04, 0, TAU); ctx.fill();
    }
  },
  // A pile of the wizard's spell books
  books(ctx, x, y, w, h, s, top, theme, tx, ty) {
    const colors = ['#e53935', '#43a047', '#1e88e5', '#8e24aa', '#fb8c00'];
    const n = 3;
    for (let i = 0; i < n; i++) {
      const bh = h / n, by = y + h - (i + 1) * bh;
      const shift = (hash(tx * 5 + ty * 3 + i) - 0.5) * w * 0.12;
      const c = colors[(tx + ty * 2 + i) % colors.length];
      ctx.fillStyle = c; ctx.strokeStyle = shade(c, -0.5);
      ctx.beginPath(); ctx.roundRect(x + w * 0.03 + shift, by + s * 0.01, w * 0.94, bh - s * 0.02, s * 0.04); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff3e0'; // pages
      ctx.fillRect(x + w * 0.8 + shift, by + bh * 0.2, w * 0.12, bh * 0.6);
      ctx.fillStyle = '#ffd54f'; // a gold band on the spine
      ctx.fillRect(x + w * 0.2 + shift, by + bh * 0.15, w * 0.06, bh * 0.7);
    }
  },
  // Plain wooden crate
  wood(ctx, x, y, w, h, s) {
    const wood = '#c8894a';
    ctx.fillStyle = wood;
    ctx.strokeStyle = shade(wood, -0.5);
    ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.06); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = shade(wood, -0.25);
    ctx.beginPath();
    for (const k of [0.33, 0.66]) { ctx.moveTo(x, y + h * k); ctx.lineTo(x + w, y + h * k); }
    ctx.stroke();
    const b = s * 0.13;
    ctx.fillStyle = shade(wood, -0.15);
    ctx.strokeStyle = shade(wood, -0.5);
    ctx.beginPath();
    ctx.rect(x, y, w, b); ctx.rect(x, y + h - b, w, b);
    ctx.moveTo(x + b * 0.4, y + h - b); ctx.lineTo(x + w - b * 1.4, y + b); ctx.lineTo(x + w - b * 0.4, y + b); ctx.lineTo(x + b * 1.4, y + h - b); ctx.closePath();
    ctx.fill(); ctx.stroke();
  },
};

function crateTile(ctx, theme, px, py, s, tx, ty, nb) {
  const inset = s * 0.04;
  ctx.lineWidth = Math.max(1, s * 0.05);
  const draw = CRATES[theme.look.crate] || CRATES.wood;
  draw(ctx, px + inset, py + inset, s - inset * 2, s - inset, s, nb(0, -1) !== 'X', theme, tx, ty);
}

// ---------- Spikes: short and wide. They look different in every world ----------
const SPIKES = {
  metal(ctx, px, py, s, theme) {
    ctx.fillStyle = theme.spike;
    ctx.strokeStyle = shade(theme.spike, -0.45);
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      ctx.moveTo(px + s * (k / 3), py + s);
      ctx.lineTo(px + s * (k / 3 + 1 / 6), py + s * 0.4);
      ctx.lineTo(px + s * ((k + 1) / 3), py + s);
      ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
  },
  // A twisty bramble with curved thorns
  thorns(ctx, px, py, s) {
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = s * 0.1;
    ctx.beginPath(); ctx.moveTo(px, py + s * 0.9);
    ctx.bezierCurveTo(px + s * 0.3, py + s * 0.62, px + s * 0.6, py + s * 1.05, px + s, py + s * 0.8); ctx.stroke();
    ctx.fillStyle = '#795548'; ctx.strokeStyle = '#3e2723'; ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    for (const [x, y, dir] of [[0.12, 0.85, 1], [0.38, 0.8, -1], [0.62, 0.86, 1], [0.86, 0.82, -1]]) {
      const bx = px + s * x, by = py + s * y;
      ctx.moveTo(bx - s * 0.07, by);
      ctx.quadraticCurveTo(bx, by - s * 0.15, bx + dir * s * 0.08, by - s * 0.42);
      ctx.quadraticCurveTo(bx + s * 0.02, by - s * 0.15, bx + s * 0.07, by);
      ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath(); ctx.ellipse(px + s * 0.5, py + s * 0.8, s * 0.09, s * 0.04, -0.5, 0, TAU); ctx.fill();
  },
  // Iron spear tips on a bar
  spears(ctx, px, py, s) {
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(px, py + s * 0.85, s + 1, s * 0.15);
    for (const k of [0.25, 0.75]) {
      const x = px + s * k;
      ctx.fillStyle = '#78909c';
      ctx.fillRect(x - s * 0.03, py + s * 0.62, s * 0.06, s * 0.25);
      ctx.fillStyle = '#eceff1'; ctx.strokeStyle = '#455a64';
      poly(ctx, [x, py + s * 0.38, x + s * 0.11, py + s * 0.66, x, py + s * 0.62, x - s * 0.11, py + s * 0.66]);
      ctx.fill(); ctx.stroke();
    }
  },
  // Zappy lightning bolts coming out of a little storm cloud
  bolts(ctx, px, py, s) {
    ctx.fillStyle = '#ffeb3b'; ctx.strokeStyle = '#e65100';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    for (const k of [0.3, 0.72]) {
      const x = px + s * k;
      poly(ctx, [x + s * 0.1, py + s * 0.3, x - s * 0.14, py + s * 0.66, x, py + s * 0.66, x - s * 0.08, py + s * 0.98,
        x + s * 0.17, py + s * 0.56, x + s * 0.03, py + s * 0.56, x + s * 0.17, py + s * 0.3]);
      ctx.fill(); ctx.stroke();
    }
    ctx.lineJoin = 'miter';
    ctx.fillStyle = '#607d8b';
    for (const [x, y, r] of [[0.2, 0.93, 0.17], [0.5, 0.88, 0.22], [0.82, 0.93, 0.16]]) {
      ctx.beginPath(); ctx.arc(px + s * x, py + s * y, s * r, 0, TAU); ctx.fill();
    }
  },
  // Shiny black glass shards with hot orange edges
  obsidian(ctx, px, py, s) {
    ctx.lineWidth = Math.max(1, s * 0.04);
    for (const [x, w, top] of [[0.05, 0.36, 0.48], [0.32, 0.38, 0.4], [0.62, 0.34, 0.52]]) {
      ctx.fillStyle = '#26181c'; ctx.strokeStyle = '#ff7043';
      poly(ctx, [px + s * x, py + s, px + s * (x + w * 0.35), py + s * top, px + s * (x + w), py + s]);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      poly(ctx, [px + s * (x + w * 0.3), py + s * 0.95, px + s * (x + w * 0.35), py + s * (top + 0.1), px + s * (x + w * 0.45), py + s * 0.95]);
      ctx.fill();
    }
  },
  // Ice spikes
  ice(ctx, px, py, s) {
    ctx.lineWidth = Math.max(1, s * 0.03);
    for (const [x, w, top] of [[0.02, 0.32, 0.5], [0.3, 0.4, 0.4], [0.66, 0.32, 0.48]]) {
      ctx.fillStyle = 'rgba(210,240,255,0.92)'; ctx.strokeStyle = '#6fb6d6';
      poly(ctx, [px + s * x, py + s, px + s * (x + w / 2), py + s * top, px + s * (x + w), py + s]);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      poly(ctx, [px + s * (x + w * 0.35), py + s * 0.95, px + s * (x + w / 2), py + s * (top + 0.08), px + s * (x + w * 0.45), py + s * 0.95]);
      ctx.fill();
    }
  },
  // A spiky desert plant
  agave(ctx, px, py, s) {
    ctx.fillStyle = '#7cb342'; ctx.strokeStyle = '#33691e'; ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    for (const [a, len] of [[-1.1, 0.45], [-0.5, 0.55], [0, 0.58], [0.5, 0.55], [1.1, 0.45]]) {
      const bx = px + s * 0.5, by = py + s;
      const tx = bx + Math.sin(a) * s * len, ty = by - Math.cos(a) * s * len;
      ctx.moveTo(bx - s * 0.08, by);
      ctx.quadraticCurveTo(bx + (tx - bx) * 0.4 - s * 0.05, by + (ty - by) * 0.5, tx, ty);
      ctx.quadraticCurveTo(bx + (tx - bx) * 0.4 + s * 0.05, by + (ty - by) * 0.5, bx + s * 0.08, by);
    }
    ctx.fill(); ctx.stroke();
  },
  // Little crystal points
  shards(ctx, px, py, s, theme) {
    crystalCluster(ctx, px, py, s, theme.spike, 0.55);
  },
  // Purple magic spikes with gold star tips
  magic(ctx, px, py, s, theme, t) {
    ctx.fillStyle = '#7e57c2'; ctx.strokeStyle = '#311b92'; ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      ctx.moveTo(px + s * (k / 3), py + s);
      ctx.lineTo(px + s * (k / 3 + 1 / 6), py + s * 0.45);
      ctx.lineTo(px + s * ((k + 1) / 3), py + s);
      ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = theme.spike;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) ctx.arc(px + s * (k / 3 + 1 / 6), py + s * 0.45, s * 0.05, 0, TAU);
    ctx.fill();
  },
};

// Spinning saw blades poking out of the floor (Spike Factory). These move, so they're drawn every frame.
function sawTile(ctx, px, py, s, t, tx) {
  const cx = px + s * 0.5, cy = py + s * 0.98, r = s * 0.56;
  ctx.save();
  ctx.beginPath(); ctx.rect(px - s * 0.1, py, s * 1.2, s * 0.9); ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(t * 6 + tx);
  ctx.fillStyle = '#eceff1'; ctx.strokeStyle = '#263238'; ctx.lineWidth = Math.max(1.5, s * 0.045);
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU, b = ((i + 0.5) / 12) * TAU;
    ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
    ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e53935';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#263238';
  ctx.fillRect(px - 1, py + s * 0.86, s + 2, s * 0.14);
}

function spikeTile(ctx, theme, px, py, s) {
  (SPIKES[theme.look.spikes] || SPIKES.metal)(ctx, px, py, s, theme);
}

// A bunch of pointy crystals standing up from the bottom of the tile. `tall` is the tallest one.
function crystalCluster(ctx, px, py, s, color, tall) {
  ctx.lineWidth = Math.max(1, s * 0.03);
  for (const [x, w, k, lean] of [[0.06, 0.3, 0.6, -0.1], [0.62, 0.3, 0.7, 0.1], [0.3, 0.38, 1, 0]]) {
    const h = s * tall * k, bx = px + s * x, bw = s * w, top = py + s - h;
    ctx.fillStyle = color; ctx.strokeStyle = shade(color, -0.5);
    poly(ctx, [bx, py + s, bx, top + h * 0.25, bx + bw / 2 + lean * s, top, bx + bw, top + h * 0.25, bx + bw, py + s]);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    poly(ctx, [bx + bw * 0.18, py + s, bx + bw * 0.18, top + h * 0.3, bx + bw / 2 + lean * s, top + h * 0.08, bx + bw * 0.45, py + s]);
    ctx.fill();
  }
}

// Crystals: taller than spikes
function crystalTile(ctx, theme, px, py, s) {
  crystalCluster(ctx, px, py, s, theme.crystal || theme.spike, 0.8);
}

// Cactus: thin and tall. Two stacked tiles make one big cactus with arms.
function cactusTile(ctx, px, py, s, nb) {
  const top = nb(0, -1) !== 'Y', bottom = nb(0, 1) !== 'Y';
  const x = px + s * 0.32, w = s * 0.36;
  ctx.fillStyle = '#43a047'; ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = Math.max(1, s * 0.035);
  ctx.beginPath();
  if (top) ctx.roundRect(x, py + s * 0.1, w, s * 0.9 + 1, [w / 2, w / 2, 0, 0]);
  else ctx.rect(x, py, w, s + 1);
  ctx.fill(); ctx.stroke();
  // An arm: on the right of a small cactus, and one on each side of a big one
  if (top || bottom) {
    const left = bottom && !top, armY = py + s * 0.5;
    const ax = left ? x - s * 0.17 : x + w + s * 0.06;
    ctx.beginPath();
    ctx.rect(left ? ax + s * 0.05 : x + w - 1, armY, s * 0.12 + 1, s * 0.1);
    ctx.roundRect(ax, armY - s * 0.26, s * 0.11, s * 0.36, s * 0.055);
    ctx.fill(); ctx.stroke();
  }
  // Ribs and prickles
  ctx.strokeStyle = '#2e7d32';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.33, py + s * (top ? 0.25 : 0)); ctx.lineTo(x + w * 0.33, py + s);
  ctx.moveTo(x + w * 0.67, py + s * (top ? 0.25 : 0)); ctx.lineTo(x + w * 0.67, py + s);
  ctx.stroke();
  ctx.fillStyle = '#fff9c4';
  for (let k = 0; k < 4; k++) {
    const yy = py + s * (0.3 + k * 0.18);
    ctx.fillRect(x - s * 0.04, yy, s * 0.06, s * 0.02);
    ctx.fillRect(x + w - s * 0.02, yy + s * 0.08, s * 0.06, s * 0.02);
  }
  if (top) {
    ctx.fillStyle = '#ff80ab'; // a flower on top
    ctx.beginPath(); ctx.arc(x + w / 2, py + s * 0.1, s * 0.07, 0, TAU); ctx.fill();
  }
}

// Things hanging down from a ceiling: icicles, stalactites, crystals, ceiling spikes, goo.
const HANGING = {
  icicle(ctx, px, py, s) {
    ctx.lineWidth = Math.max(1, s * 0.03);
    for (const [x, w, len] of [[0.12, 0.26, 0.45], [0.38, 0.3, 0.62], [0.68, 0.24, 0.4]]) {
      ctx.fillStyle = 'rgba(215,242,255,0.95)'; ctx.strokeStyle = '#6fb6d6';
      poly(ctx, [px + s * x, py, px + s * (x + w), py, px + s * (x + w * 0.55), py + s * len]);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      poly(ctx, [px + s * (x + w * 0.25), py, px + s * (x + w * 0.42), py, px + s * (x + w * 0.52), py + s * len * 0.8]);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px, py, s + 1, s * 0.07);
  },
  stalactite(ctx, px, py, s) {
    ctx.lineWidth = Math.max(1, s * 0.03);
    for (const [x, w, len] of [[0.05, 0.4, 0.5], [0.4, 0.4, 0.62], [0.72, 0.26, 0.36]]) {
      ctx.fillStyle = '#5d4b47'; ctx.strokeStyle = '#2f2523';
      ctx.beginPath();
      ctx.moveTo(px + s * x, py);
      ctx.quadraticCurveTo(px + s * (x + w * 0.2), py + s * len * 0.6, px + s * (x + w * 0.5), py + s * len);
      ctx.quadraticCurveTo(px + s * (x + w * 0.8), py + s * len * 0.6, px + s * (x + w), py);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#ff8a65'; // a drip of hot rock on the longest one
    ctx.beginPath(); ctx.arc(px + s * 0.6, py + s * 0.6, s * 0.035, 0, TAU); ctx.fill();
  },
  crystal(ctx, px, py, s, theme) {
    ctx.save();
    ctx.translate(px, py + s * 0.78);
    ctx.scale(1, -1);
    crystalCluster(ctx, 0, -s * 0.22, s, theme.crystal || theme.spike, 0.78);
    ctx.restore();
  },
  // Metal spikes pointing down from the factory ceiling
  drill(ctx, px, py, s) {
    ctx.fillStyle = '#607d8b';
    ctx.fillRect(px, py, s + 1, s * 0.14);
    ctx.fillStyle = '#eceff1'; ctx.strokeStyle = '#455a64'; ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      ctx.moveTo(px + s * (k / 3), py + s * 0.12);
      ctx.lineTo(px + s * (k / 3 + 1 / 6), py + s * 0.62);
      ctx.lineTo(px + s * ((k + 1) / 3), py + s * 0.12);
      ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
  },
  // Gloopy purple goo dripping down
  goo(ctx, px, py, s, theme) {
    ctx.fillStyle = theme.liquid || '#b040e0';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + s + 1, py);
    for (const [x, len, r] of [[0.85, 0.32, 0.09], [0.55, 0.52, 0.11], [0.2, 0.4, 0.1]]) {
      ctx.lineTo(px + s * (x + r), py + s * 0.08);
      ctx.lineTo(px + s * (x + r * 0.7), py + s * (len - r));
      ctx.arc(px + s * x, py + s * (len - r), s * r, 0, Math.PI);
      ctx.lineTo(px + s * (x - r), py + s * 0.08);
    }
    ctx.lineTo(px, py + s * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = theme.liquidTop || '#f080ff';
    ctx.beginPath(); ctx.arc(px + s * 0.52, py + s * 0.38, s * 0.035, 0, TAU); ctx.fill();
  },
};

function hangingTile(ctx, theme, px, py, s) {
  (HANGING[theme.look.hang] || HANGING.stalactite)(ctx, px, py, s, theme);
}

// Bushes join up with the bush next to them, with round ends.
const BUSHES = {
  berry: { leaf: '#4caf50', dark: '#2e7d32', dot: '#e53935' },
  hedge: { leaf: '#388e3c', dark: '#1b5e20', dot: '#f8bbd0' },
  snowy: { leaf: '#3f8f6b', dark: '#25604a', snow: true },
  tumbleweed: { leaf: '#b98b45', dark: '#7a5a2a', tumble: true },
};

function bushTile(ctx, theme, px, py, s, tx, nb) {
  const b = BUSHES[theme.look.bush] || BUSHES.berry;
  const L = nb(-1, 0) === 'U', R = nb(1, 0) === 'U';
  ctx.lineWidth = Math.max(1, s * 0.04);
  if (b.tumble) {
    // One tangly tumbleweed ball per tile
    const cx = px + s * 0.5, cy = py + s * 0.52, r = s * 0.47;
    ctx.fillStyle = 'rgba(185,139,69,0.35)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = b.dark;
    ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const a = hash(tx * 9 + k) * TAU, rr = r * (0.4 + 0.55 * hash(tx + k * 3));
      ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      ctx.quadraticCurveTo(cx, cy, cx + Math.cos(a + 2.4) * rr, cy + Math.sin(a + 2.4) * rr);
    }
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    return;
  }
  ctx.save();
  ctx.beginPath(); // each tile only draws inside itself where it joins the next bush
  ctx.rect(L ? px : px - s, py - s, s * (L ? 1 : 2) + (R ? 0 : s), s * 2 + 1);
  ctx.clip();
  const lw = Math.max(1, s * 0.045);
  const shape = grow => {
    ctx.beginPath();
    const x0 = px + (L ? -1 : s * 0.1), x1 = px + s + (R ? 1 : -s * 0.1);
    ctx.rect(x0 - grow, py + s * 0.45 - grow, x1 - x0 + grow * 2, s * 0.55 + grow);
    for (const [cx, cy, r] of [[0.3, 0.45, 0.35], [0.72, 0.4, 0.38]]) {
      ctx.moveTo(px + s * cx + s * r + grow, py + s * cy);
      ctx.arc(px + s * cx, py + s * cy, s * r + grow, 0, TAU);
    }
  };
  ctx.fillStyle = b.dark; shape(lw); ctx.fill();
  ctx.fillStyle = b.leaf; shape(0); ctx.fill();
  ctx.restore();
  ctx.fillStyle = b.dark; // leafy shadows
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(px + s * (0.3 + hash(tx) * 0.4), py + s * 0.65, s * 0.12, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + s * (0.25 + hash(tx + 1) * 0.5), py + s * 0.4, s * 0.08, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (b.dot) {
    ctx.fillStyle = b.dot;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(px + s * (0.2 + hash(tx * 3 + k) * 0.6), py + s * (0.3 + hash(tx * 5 + k) * 0.5), s * 0.05, 0, TAU);
      ctx.fill();
    }
  }
  if (b.snow) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px + s * 0.3, py + s * 0.12, s * 0.16, Math.PI, 0);
    ctx.arc(px + s * 0.65, py + s * 0.1, s * 0.18, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  }
}

function liquidTile(ctx, theme, px, py, s, t, tx) {
  const top = py + s * 0.3 + Math.sin(t * 3 + tx) * s * 0.06;
  ctx.fillStyle = theme.liquid;
  ctx.fillRect(px, top, s + 1, py + s - top + 1);
  ctx.fillStyle = theme.liquidTop;
  ctx.beginPath();
  ctx.moveTo(px, top);
  ctx.quadraticCurveTo(px + s * 0.5, top - s * 0.12 * Math.sin(t * 4 + tx), px + s + 1, top);
  ctx.lineTo(px + s + 1, top + s * 0.12); ctx.lineTo(px, top + s * 0.12);
  ctx.fill();
  // Bubbles
  const b = (t * 0.8 + hash(tx)) % 1;
  ctx.globalAlpha = 1 - b;
  ctx.beginPath(); ctx.arc(px + s * hash(tx + 3), top + s * 0.5 - b * s * 0.5, s * 0.07, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}

function springTile(ctx, theme, px, py, s, squash) {
  const k = 1 - squash * 0.4;
  if (theme.bg === 'trees') {
    // Bouncy mushroom
    ctx.fillStyle = '#fff3e0';
    ctx.fillRect(px + s * 0.38, py + s * (1 - 0.45 * k), s * 0.24, s * 0.45 * k);
    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.ellipse(px + s * 0.5, py + s * (1 - 0.45 * k), s * 0.45, s * 0.25, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(px + s * 0.35, py + s * (0.92 - 0.45 * k), s * 0.06, 0, TAU);
    ctx.arc(px + s * 0.6, py + s * (0.85 - 0.45 * k), s * 0.07, 0, TAU); ctx.fill();
    return;
  }
  ctx.strokeStyle = '#90a4ae';
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  const base = py + s, h = s * 0.4 * k;
  for (let i = 0; i <= 4; i++) {
    const y = base - (h * i) / 4;
    ctx.lineTo(px + s * (i % 2 ? 0.25 : 0.75), y);
  }
  ctx.stroke();
  ctx.fillStyle = '#ff4081';
  ctx.beginPath(); ctx.roundRect(px + s * 0.08, base - h - s * 0.15, s * 0.84, s * 0.17, s * 0.06); ctx.fill();
}

function flagTile(ctx, px, py, s, active, t) {
  ctx.fillStyle = '#795548';
  ctx.fillRect(px + s * 0.45, py - s * 0.9, s * 0.08, s * 1.9);
  ctx.fillStyle = active ? '#ffd600' : '#bdbdbd';
  const wave = Math.sin(t * 5) * s * 0.06;
  ctx.beginPath();
  ctx.moveTo(px + s * 0.53, py - s * 0.9);
  ctx.quadraticCurveTo(px + s * 0.8, py - s * 0.8 + wave, px + s * 1.05, py - s * 0.68);
  ctx.lineTo(px + s * 0.53, py - s * 0.42);
  ctx.fill();
  if (active) {
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.round(s * 0.3)}px sans-serif`;
    ctx.fillText('★', px + s * 0.58, py - s * 0.55);
  }
}

// The gem's glow is the same picture every frame, so its gradient is made once per size
// (around 0, 0) and moved into place.
const glows = new Map();
function gemGlow(ctx, s) {
  const key = Math.round(s * 4);
  let g = glows.get(key);
  if (!g || g.ctx !== ctx) {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.9);
    grad.addColorStop(0, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.4, 'rgba(255,80,220,0.35)');
    grad.addColorStop(1, 'rgba(255,80,220,0)');
    g = { ctx, grad };
    if (glows.size > 16) glows.delete(glows.keys().next().value);
    glows.set(key, g);
  }
  return g.grad;
}

export function drawGem(ctx, cx, cy, s, t) {
  const bob = Math.sin(t * 3) * s * 0.08;
  cy += bob;
  ctx.translate(cx, cy);
  ctx.fillStyle = gemGlow(ctx, s);
  ctx.beginPath(); ctx.arc(0, 0, s * 0.9, 0, TAU); ctx.fill();
  ctx.translate(-cx, -cy);
  const r = s * 0.38;
  ctx.fillStyle = '#e040fb';
  ctx.strokeStyle = '#6a1b9a';
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r * 0.3); ctx.lineTo(cx - r * 0.5, cy - r * 0.85); ctx.lineTo(cx + r * 0.5, cy - r * 0.85);
  ctx.lineTo(cx + r, cy - r * 0.3); ctx.lineTo(cx, cy + r); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f8bbff';
  ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.85); ctx.lineTo(cx, cy - r * 0.3); ctx.lineTo(cx - r, cy - r * 0.3); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6);
  ctx.beginPath(); ctx.arc(cx + r * 0.55, cy - r * 0.9, s * 0.06, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}

// Draws one tile that doesn't move. Returns false for tiles that move (lava, springs, flags, gems, saws).
function drawStaticTile(ctx, level, c, tx, ty, px, py, s) {
  const theme = level.theme;
  const nb = (dx, dy) => tileAt(level, tx + dx, ty + dy);
  const sl = SLOPE[c.charCodeAt(0)];
  if (c === '#') groundTile(ctx, theme, px, py, s, tx, ty, !isGroundish(nb(0, -1)), !isGroundish(nb(0, 1)) && nb(0, 1) !== '=' && nb(0, 1) !== '~');
  else if (sl) slopeTile(ctx, theme, px, py, s, tx, ty, sl, nb);
  else if (c === 'X') crateTile(ctx, theme, px, py, s, tx, ty, nb);
  else if (c === 'U') bushTile(ctx, theme, px, py, s, tx, nb);
  else if (c === '=') platformTile(ctx, theme, px, py, s);
  else if (c === '^' && theme.look.spikes !== 'saws') spikeTile(ctx, theme, px, py, s);
  else if (c === 'K') crystalTile(ctx, theme, px, py, s);
  else if (c === 'Y') cactusTile(ctx, px, py, s, nb);
  else if (c === 'V') hangingTile(ctx, theme, px, py, s);
  else return false;
  return true;
}

// Tiles that move (lava, springs, flags, the gem, saws) are drawn fresh every frame.
// Everything else is drawn once into the tile cache.
function moves(theme, c) {
  return c === '~' || c === 'B' || c === 'C' || c === 'G' || (c === '^' && theme.look.spikes === 'saws');
}

function drawMovingTile(ctx, level, c, tx, ty, px, py, s, t, state, later) {
  const theme = level.theme, key = ty * level.W + tx;
  if (c === '^') sawTile(ctx, px, py, s, t, tx);
  else if (c === '~') liquidTile(ctx, theme, px, py, s, t, tx);
  else if (c === 'B') springTile(ctx, theme, px, py, s, state.springSquash.get(key) || 0);
  else if (c === 'C') later.push(px, py, state.checkpoints.has(key) ? 1 : 0);
  else if (c === 'G' && !state.gemTaken) later.push(px, py, -1);
}

// Flags and the gem go on top of everything else. `later` is a flat list: x, y, kind (-1 gem, 0/1 flag).
function drawLater(ctx, later, s, t) {
  for (let i = 0; i < later.length; i += 3) {
    const px = later[i], py = later[i + 1], k = later[i + 2];
    if (k < 0) drawGem(ctx, px + s / 2, py + s / 2, s, t);
    else flagTile(ctx, px, py, s, k === 1, t);
  }
}

// Draws all visible tiles directly (no cache). Used for the little scenery in cutscenes.
// `state` has which checkpoints are active and spring squish. camX and camY are in tiles.
export function drawTiles(ctx, level, camX, camY, s, vw, vh, t, state) {
  const x0 = Math.max(0, Math.floor(camX) - 1), x1 = Math.min(level.W - 1, Math.ceil(camX + vw) + 1);
  const y0 = Math.max(0, Math.floor(camY) - 1), y1 = Math.min(level.H - 1, Math.ceil(camY + vh) + 1);
  const later = [];
  for (let ty = y0; ty <= y1; ty++) {
    const row = level.grid[ty];
    for (let tx = x0; tx <= x1; tx++) {
      const c = row[tx];
      if (c === '.') continue;
      const px = tx * s - camX * s, py = ty * s - camY * s;
      if (moves(level.theme, c)) drawMovingTile(ctx, level, c, tx, ty, px, py, s, t, state, later);
      else drawStaticTile(ctx, level, c, tx, ty, px, py, s);
    }
  }
  drawLater(ctx, later, s, t);
}

// ---------- Tile cache ----------
// The ground and obstacles never move, so they're drawn once into little canvases
// ("chunks" of 8 x 6 tiles) and copied onto the screen each frame. That's a handful of
// image copies a frame instead of a hundred or so tiles, each with its own shapes.
// Chunks are made when they first scroll into view; the least recently used are thrown
// away so the iPad doesn't run out of memory. Tiles that move are kept in a list sorted
// by column, so finding the ones on screen is a quick binary search.
const CHUNK_W = 8, CHUNK_H = 6, MAX_CHUNKS = 12;

export class TileCache {
  constructor() {
    this.level = null;
    this.S = 0;
    this.chunks = new Map(); // key -> canvas (or null if there's nothing in it). Oldest first.
    this.later = [];
  }

  // S is the tile size in real screen pixels. It's a whole number, so chunks line up exactly.
  use(level, S) {
    if (this.level === level && this.S === S) return;
    this.clear();
    this.level = level;
    this.S = S;
    this.moving = [];
    for (let tx = 0; tx < level.W; tx++) {
      for (let ty = 0; ty < level.H; ty++) {
        const c = level.grid[ty][tx];
        if (moves(level.theme, c)) this.moving.push({ tx, ty, c });
      }
    }
  }

  clear() {
    // Shrinking a canvas frees its memory right away on iPads
    for (const c of this.chunks.values()) if (c) c.width = c.height = 0;
    this.chunks.clear();
  }

  chunk(cx, cy) {
    const key = cy * 65536 + cx;
    let c = this.chunks.get(key);
    if (c !== undefined) {
      this.chunks.delete(key); // move to the back: most recently used
      this.chunks.set(key, c);
      return c;
    }
    c = this.build(cx, cy);
    this.chunks.set(key, c);
    if (this.chunks.size > MAX_CHUNKS) {
      const [oldKey, old] = this.chunks.entries().next().value;
      if (old) old.width = old.height = 0;
      this.chunks.delete(oldKey);
    }
    return c;
  }

  build(cx, cy) {
    const { level, S } = this;
    const theme = level.theme;
    const tx0 = cx * CHUNK_W, ty0 = cy * CHUNK_H;
    // Some tiles poke a little past their edges (bush tops, cloud puffs), so the
    // tiles just outside the chunk are drawn too, and get cut off at its edge.
    const xa = Math.max(0, tx0 - 1), xb = Math.min(level.W - 1, tx0 + CHUNK_W);
    const ya = Math.max(0, ty0 - 1), yb = Math.min(level.H - 1, ty0 + CHUNK_H);
    let any = false;
    for (let ty = ya; ty <= yb && !any; ty++) {
      const row = level.grid[ty];
      for (let tx = xa; tx <= xb; tx++) if (row[tx] !== '.' && !moves(theme, row[tx])) { any = true; break; }
    }
    if (!any) return null;
    const c = document.createElement('canvas');
    c.width = CHUNK_W * S;
    c.height = CHUNK_H * S;
    const ctx = c.getContext('2d');
    ctx.translate(-tx0 * S, -ty0 * S);
    for (let ty = ya; ty <= yb; ty++) {
      const row = level.grid[ty];
      for (let tx = xa; tx <= xb; tx++) {
        const ch = row[tx];
        if (ch !== '.' && !moves(theme, ch)) drawStaticTile(ctx, level, ch, tx, ty, tx * S, ty * S, S);
      }
    }
    return c;
  }

  // Copies the chunks onto the screen. ctx should be in real screen pixels (no scaling),
  // and camX/camY lined up with them.
  drawStatic(ctx, camX, camY, vw, vh) {
    const { S } = this;
    const cx0 = Math.max(0, Math.floor(camX / CHUNK_W)), cx1 = Math.floor((camX + vw) / CHUNK_W);
    const cy0 = Math.max(0, Math.floor(camY / CHUNK_H)), cy1 = Math.floor((camY + vh) / CHUNK_H);
    const ox = Math.round(camX * S), oy = Math.round(camY * S);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const c = this.chunk(cx, cy);
        if (c) ctx.drawImage(c, cx * CHUNK_W * S - ox, cy * CHUNK_H * S - oy);
      }
    }
  }

  // Draws the tiles that move. ctx is in CSS pixels; s is the tile size in CSS pixels.
  drawMoving(ctx, camX, camY, s, vw, vh, t, state) {
    const list = this.moving, level = this.level;
    // First tile at or right of the left edge of the screen
    let lo = 0, hi = list.length;
    const left = Math.floor(camX) - 1, right = Math.ceil(camX + vw) + 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid].tx < left) lo = mid + 1; else hi = mid; }
    const later = this.later;
    later.length = 0;
    for (let i = lo; i < list.length && list[i].tx <= right; i++) {
      const { tx, ty, c } = list[i];
      if (ty < camY - 2 || ty > camY + vh + 1) continue;
      drawMovingTile(ctx, level, c, tx, ty, (tx - camX) * s, (ty - camY) * s, s, t, state, later);
    }
    drawLater(ctx, later, s, t);
  }
}

export function drawHints(ctx, level, camX, camY, s, vw = Infinity) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const font = `bold ${Math.round(s * 0.42)}px "Trebuchet MS", sans-serif`;
  ctx.font = font;
  for (const h of level.hints) {
    // Measuring text is slow, so remember how wide each hint is for this text size
    if (h.font !== font) { h.font = font; h.w = ctx.measureText(h.text).width + s * 0.6; }
    const w = h.w;
    const px = (h.x + 0.5 - camX) * s, py = (h.y + 0.5 - camY) * s;
    if (px + w / 2 < 0 || px - w / 2 > vw * s) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.roundRect(px - w / 2, py - s * 0.4, w, s * 0.8, s * 0.3); ctx.fill();
    ctx.fillStyle = '#4a2c82';
    ctx.fillText(h.text, px, py + 1);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
