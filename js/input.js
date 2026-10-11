// On-screen buttons (with multi-touch, so you can hold ➡️ and press JUMP
// at the same time) plus keyboard arrows/space for playing on a computer.

export const input = { left: false, right: false, jump: false };

const fingers = new Map(); // pointerId -> button name
const keys = { left: false, right: false, jump: false };

function buttonAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const btn = el && el.closest('[data-btn]');
  return btn ? btn.dataset.btn : null;
}

function refresh() {
  const held = { left: false, right: false, jump: false };
  for (const b of fingers.values()) if (b) held[b] = true;
  for (const k of ['left', 'right', 'jump']) {
    input[k] = held[k] || keys[k];
    const el = document.querySelector(`[data-btn="${k}"]`);
    if (el) el.classList.toggle('down', held[k] || keys[k]);
  }
}

export function setupInput(controlsEl) {
  const down = e => {
    e.preventDefault();
    fingers.set(e.pointerId, buttonAt(e.clientX, e.clientY));
    refresh();
  };
  const move = e => {
    if (!fingers.has(e.pointerId)) return;
    e.preventDefault();
    fingers.set(e.pointerId, buttonAt(e.clientX, e.clientY)); // slide your thumb between buttons
    refresh();
  };
  const up = e => { fingers.delete(e.pointerId); refresh(); };

  controlsEl.addEventListener('pointerdown', down, { passive: false });
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  // Safari: stop long-press menus and double-tap zoom on the buttons
  controlsEl.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  controlsEl.addEventListener('contextmenu', e => e.preventDefault());

  const keyMap = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ' ': 'jump', ArrowUp: 'jump', w: 'jump' };
  window.addEventListener('keydown', e => {
    const k = keyMap[e.key];
    if (k && !(e.target instanceof HTMLInputElement)) { keys[k] = true; refresh(); e.preventDefault(); }
  });
  window.addEventListener('keyup', e => {
    const k = keyMap[e.key];
    if (k) { keys[k] = false; refresh(); }
  });
  const clear = () => { fingers.clear(); keys.left = keys.right = keys.jump = false; refresh(); };
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', clear);
}

export function clearInput() {
  fingers.clear();
  keys.left = keys.right = keys.jump = false;
  refresh();
}
