// The 10 worlds. Each world has 10 levels.
// `segs` are how often each kind of obstacle shows up in that world's levels.
// `pit` is what's at the bottom of gaps: 'void' (fall off) or 'liquid' (lava, quicksand, goo).

export const WORLDS = [
  {
    name: 'Rooftops', emoji: '🏠', bg: 'city',
    intro: 'Run and jump across the rooftops!',
    sky: ['#ffb36b', '#ffe3b0'], ground: '#8d5a4a', groundTop: '#b23a2e', groundLine: '#6e4236',
    platform: '#9e9e9e', spike: '#cfd8dc', pit: 'void', texture: 'brick',
    segs: { gap: 4, steps: 3, spikes: 1, platforms: 1 },
  },
  {
    name: 'Treetops', emoji: '🌳', bg: 'trees',
    intro: 'Hop along the treetops!',
    sky: ['#7ec8f0', '#d6f2ff'], ground: '#7a5230', groundTop: '#4caf50', groundLine: '#5e3e22',
    platform: '#8d6e3f', spike: '#a1887f', pit: 'void', texture: 'wood',
    segs: { gap: 2, steps: 2, platforms: 3, spring: 2, spikes: 1 },
  },
  {
    name: 'Castle', emoji: '🏰', bg: 'castle',
    intro: 'Sneak through the old castle!',
    sky: ['#8fa8d8', '#dfe8f7'], ground: '#8a8f9c', groundTop: '#a7adba', groundLine: '#6b707c',
    platform: '#7d8290', spike: '#eceff1', pit: 'void', texture: 'stone',
    segs: { gap: 2, steps: 3, spikes: 3, platforms: 1, spring: 1 },
  },
  {
    name: 'Cloud Kingdom', emoji: '☁️', bg: 'clouds',
    intro: 'Bounce across the clouds!',
    sky: ['#5fb3ff', '#e4f3ff'], ground: '#f4f8ff', groundTop: '#ffffff', groundLine: '#d5e2f5',
    platform: '#ffffff', spike: '#ffd54f', pit: 'void', texture: 'cloud',
    segs: { gap: 2, platforms: 4, spring: 3, steps: 1, spikes: 1 },
  },
  {
    name: 'Lava Land', emoji: '🌋', bg: 'volcano',
    intro: "Don't touch the lava!",
    sky: ['#3b0d0d', '#b8401f'], ground: '#4a3b38', groundTop: '#6d5a55', groundLine: '#2f2523',
    platform: '#5d4b47', spike: '#ff8a65', pit: 'liquid', liquid: '#ff5722', liquidTop: '#ffc107', texture: 'rock',
    segs: { gap: 4, platforms: 3, steps: 2, spikes: 1, spring: 1 },
  },
  {
    name: 'Ice Mountain', emoji: '❄️', bg: 'ice',
    intro: 'Careful, the ice is slippery!', slippery: true,
    sky: ['#9fc9e8', '#eef7ff'], ground: '#9fd3ea', groundTop: '#ffffff', groundLine: '#7fb9d4',
    platform: '#c8ecfa', spike: '#e1f5fe', pit: 'void', texture: 'ice',
    segs: { gap: 3, steps: 3, spikes: 2, platforms: 2, spring: 1 },
  },
  {
    name: 'Crystal Caves', emoji: '💎', bg: 'crystals',
    intro: 'Explore the sparkly crystal caves!',
    sky: ['#1b1036', '#3d2470'], ground: '#4b3a6b', groundTop: '#7e57c2', groundLine: '#36294f',
    platform: '#5e4a85', spike: '#80deea', pit: 'void', texture: 'rock',
    segs: { gap: 2, spikes: 3, platforms: 3, spring: 2, steps: 2 },
  },
  {
    name: 'Desert Ruins', emoji: '🏜️', bg: 'desert',
    intro: 'Watch out for quicksand!',
    sky: ['#ffb74d', '#fff3d6'], ground: '#d9a85b', groundTop: '#f0c987', groundLine: '#b98b45',
    platform: '#c49a5c', spike: '#689f38', pit: 'liquid', liquid: '#c58b3f', liquidTop: '#e6b36a', texture: 'sand',
    segs: { gap: 3, spikes: 3, steps: 2, platforms: 2, spring: 1 },
  },
  {
    name: 'Spike Factory', emoji: '⚙️', bg: 'factory',
    intro: 'So many spikes! Jump carefully!',
    sky: ['#546e7a', '#b0bec5'], ground: '#5f6b73', groundTop: '#ffb300', groundLine: '#47525a',
    platform: '#78909c', spike: '#eceff1', pit: 'void', texture: 'metal',
    segs: { spikes: 5, gap: 2, platforms: 2, spring: 2, steps: 1 },
  },
  {
    name: "Wizard's Tower", emoji: '🧙', bg: 'tower',
    intro: 'The last world! Break the spell!',
    sky: ['#0d1440', '#3a2a7a'], ground: '#4a4170', groundTop: '#9c7cf0', groundLine: '#352e55',
    platform: '#6a5aa8', spike: '#ffd54f', pit: 'liquid', liquid: '#b040e0', liquidTop: '#f080ff', texture: 'stone',
    segs: { gap: 3, spikes: 3, platforms: 3, spring: 2, steps: 2 },
  },
];
