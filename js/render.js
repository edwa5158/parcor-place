// Drawing the worlds: backgrounds, ground, spikes, lava, springs, flags and gems.

import { shade } from './dragon.js';

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
  ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 25 * s, y - 12 * s, 28 * s, 0, Math.PI * 2);
  ctx.arc(x + 55 * s, y, 22 * s, 0, Math.PI * 2);
  ctx.rect(x, y - 2 * s, 55 * s, 22 * s);
  ctx.fill();
}

const BACKGROUNDS = {
  city(ctx, w, h, camX, t, th) {
    ctx.fillStyle = 'rgba(255,240,200,0.9)';
    ctx.beginPath(); ctx.arc(w * 0.75, h * 0.25, h * 0.09, 0, Math.PI * 2); ctx.fill();
    layer(ctx, w, h, camX, 0.15, 130, (x, i, r) => {
      const bh = h * (0.3 + r * 0.25);
      ctx.fillStyle = '#d98a6a';
      ctx.fillRect(x, h - bh, 100, bh);
    });
    layer(ctx, w, h, camX, 0.3, 110, (x, i, r) => {
      const bh = h * (0.22 + r * 0.22);
      ctx.fillStyle = '#b06a55';
      ctx.fillRect(x, h - bh, 85, bh);
      ctx.fillStyle = '#ffe9a8';
      for (let wy = h - bh + 15; wy < h - 20; wy += 28)
        for (let wx = x + 12; wx < x + 75; wx += 22)
          if (hash(wx * 3 + wy) > 0.45) ctx.fillRect(wx, wy, 10, 14);
    });
  },
  trees(ctx, w, h, camX) {
    layer(ctx, w, h, camX, 0.15, 120, (x, i, r) => {
      ctx.fillStyle = '#9bd49a';
      ctx.beginPath(); ctx.arc(x + 60, h * (0.62 + r * 0.1), 80 + r * 30, 0, Math.PI * 2); ctx.fill();
    });
    layer(ctx, w, h, camX, 0.35, 140, (x, i, r) => {
      const top = h * (0.45 + r * 0.15);
      ctx.fillStyle = '#7a5a3a';
      ctx.fillRect(x + 60, top, 18, h - top);
      ctx.fillStyle = '#5fae5c';
      ctx.beginPath();
      ctx.arc(x + 69, top, 55, 0, Math.PI * 2);
      ctx.arc(x + 35, top + 25, 38, 0, Math.PI * 2);
      ctx.arc(x + 105, top + 25, 38, 0, Math.PI * 2);
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
      ctx.beginPath(); ctx.arc(w * 0.7 - off, h * 0.9, h * 0.55 - k * 12, Math.PI, Math.PI * 2); ctx.stroke();
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
    for (let k = 0; k < 25; k++) {
      const ex = ((hash(k) * w * 1.5 - camX * 0.4) % w + w) % w;
      const ey = h - ((t * (20 + hash(k + 9) * 30) + hash(k + 3) * h) % h);
      ctx.globalAlpha = 0.7;
      ctx.fillRect(ex, ey, 3, 3);
    }
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
    for (let k = 0; k < 40; k++) {
      const sx = ((hash(k) * w * 2 - camX * 0.5 + Math.sin(t + k) * 15) % w + w) % w;
      const sy = (t * (25 + hash(k + 5) * 25) + hash(k + 2) * h) % h;
      ctx.beginPath(); ctx.arc(sx, sy, 2 + hash(k + 7) * 2, 0, Math.PI * 2); ctx.fill();
    }
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
    ctx.beginPath(); ctx.arc(w * 0.2, h * 0.2, h * 0.1, 0, Math.PI * 2); ctx.fill();
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
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#90a4ae';
      ctx.beginPath(); ctx.arc(0, 0, R * 0.35, 0, Math.PI * 2); ctx.fill();
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
    ctx.beginPath(); ctx.arc(w * 0.8, h * 0.2, h * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2a7a';
    ctx.beginPath(); ctx.arc(w * 0.8 + h * 0.03, h * 0.19, h * 0.07, 0, Math.PI * 2); ctx.fill();
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

export function drawBackground(ctx, theme, w, h, camXpx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, theme.sky[0]);
  g.addColorStop(1, theme.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  BACKGROUNDS[theme.bg](ctx, w, h, camXpx, t, theme);
}

function groundTile(ctx, theme, px, py, s, tx, ty, topOpen) {
  ctx.fillStyle = theme.ground;
  ctx.fillRect(px, py, s + 1, s + 1);
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
    for (const [a, b] of [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]]) ctx.fillRect(px + s * a - 2, py + s * b - 2, 4, 4);
  } else if (tex === 'cloud') {
    // Nothing; clouds are smooth
  } else {
    ctx.fillStyle = theme.groundLine;
    const n = hash(tx * 31 + ty * 17);
    ctx.beginPath();
    ctx.arc(px + s * (0.2 + n * 0.5), py + s * (0.3 + hash(n) * 0.4), s * 0.07, 0, Math.PI * 2);
    ctx.arc(px + s * (0.7 - n * 0.3), py + s * (0.75 - n * 0.2), s * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  if (topOpen) {
    ctx.fillStyle = theme.groundTop;
    ctx.fillRect(px, py, s + 1, s * 0.26);
    if (theme.texture === 'cloud') {
      ctx.beginPath();
      for (let k = 0; k < 3; k++) ctx.arc(px + s * (0.2 + k * 0.3), py + s * 0.05, s * 0.22, 0, Math.PI * 2);
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

function platformTile(ctx, theme, px, py, s, t, tx) {
  if (theme.texture === 'cloud') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px + s * 0.25, py + s * 0.45, s * 0.38, 0, Math.PI * 2);
    ctx.arc(px + s * 0.7, py + s * 0.4, s * 0.42, 0, Math.PI * 2);
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

function spikeTile(ctx, theme, px, py, s) {
  ctx.fillStyle = theme.spike;
  ctx.strokeStyle = shade(theme.spike, -0.45);
  ctx.lineWidth = Math.max(1, s * 0.04);
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(px + s * (k / 3), py + s);
    ctx.lineTo(px + s * (k / 3 + 1 / 6), py + s * 0.4);
    ctx.lineTo(px + s * ((k + 1) / 3), py + s);
    ctx.closePath(); ctx.fill(); ctx.stroke();
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
  ctx.beginPath(); ctx.arc(px + s * hash(tx + 3), top + s * 0.5 - b * s * 0.5, s * 0.07, 0, Math.PI * 2); ctx.fill();
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
    ctx.beginPath(); ctx.arc(px + s * 0.35, py + s * (0.92 - 0.45 * k), s * 0.06, 0, Math.PI * 2);
    ctx.arc(px + s * 0.6, py + s * (0.85 - 0.45 * k), s * 0.07, 0, Math.PI * 2); ctx.fill();
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

export function drawGem(ctx, cx, cy, s, t) {
  const bob = Math.sin(t * 3) * s * 0.08;
  cy += bob;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.9);
  glow.addColorStop(0, 'rgba(255,255,255,0.8)');
  glow.addColorStop(0.4, 'rgba(255,80,220,0.35)');
  glow.addColorStop(1, 'rgba(255,80,220,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.9, 0, Math.PI * 2); ctx.fill();
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
  ctx.beginPath(); ctx.arc(cx + r * 0.55, cy - r * 0.9, s * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// Draws all visible tiles. `state` has which checkpoints are active and spring squish.
export function drawTiles(ctx, level, camX, camY, s, vw, vh, t, state) {
  const x0 = Math.max(0, Math.floor(camX) - 1), x1 = Math.min(level.W - 1, Math.ceil(camX + vw) + 1);
  const y0 = Math.max(0, Math.floor(camY) - 1), y1 = Math.min(level.H - 1, Math.ceil(camY + vh) + 1);
  const theme = level.theme;
  const later = [];
  for (let ty = y0; ty <= y1; ty++) {
    const row = level.grid[ty];
    const above = ty > 0 ? level.grid[ty - 1] : null;
    for (let tx = x0; tx <= x1; tx++) {
      const c = row[tx];
      if (c === '.') continue;
      const px = Math.floor((tx - camX) * s), py = Math.floor((ty - camY) * s);
      if (c === '#') groundTile(ctx, theme, px, py, s, tx, ty, !above || (above[tx] !== '#'));
      else if (c === '=') platformTile(ctx, theme, px, py, s, t, tx);
      else if (c === '^') spikeTile(ctx, theme, px, py, s);
      else if (c === '~') liquidTile(ctx, theme, px, py, s, t, tx);
      else if (c === 'B') springTile(ctx, theme, px, py, s, state.springSquash[`${tx},${ty}`] || 0);
      else if (c === 'C') later.push(() => flagTile(ctx, px, py, s, state.checkpoints.has(`${tx},${ty}`), t));
      else if (c === 'G' && !state.gemTaken) later.push(() => drawGem(ctx, px + s / 2, py + s / 2, s, t));
    }
  }
  for (const f of later) f();
}

export function drawHints(ctx, level, camX, camY, s) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(s * 0.42)}px "Trebuchet MS", sans-serif`;
  for (const h of level.hints) {
    const px = (h.x + 0.5 - camX) * s, py = (h.y + 0.5 - camY) * s;
    const w = ctx.measureText(h.text).width + s * 0.6;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.roundRect(px - w / 2, py - s * 0.4, w, s * 0.8, s * 0.3); ctx.fill();
    ctx.fillStyle = '#4a2c82';
    ctx.fillText(h.text, px, py + 1);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
