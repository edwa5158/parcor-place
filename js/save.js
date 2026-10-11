// Progress is saved on this device (iPad) in localStorage.

import { TOTAL_LEVELS } from './levels.js';

const KEY = 'parcorPlace.save';
const VERSION = 1;

function fresh() {
  return { version: VERSION, dragon: null, gems: [], muted: false, seenEnding: false };
}

export function loadSave() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && data.version === VERSION) return { ...fresh(), ...data };
  } catch (e) { /* start fresh */ }
  return fresh();
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* storage full or blocked */ }
}

export const gemCount = save => save.gems.length;
export const hasGem = (save, i) => save.gems.includes(i);
export const isUnlocked = (save, i) => i === 0 || hasGem(save, i - 1) || hasGem(save, i);
export const allGems = save => save.gems.length >= TOTAL_LEVELS;

export function addGem(save, i) {
  if (!save.gems.includes(i)) save.gems.push(i);
  writeSave(save);
}
