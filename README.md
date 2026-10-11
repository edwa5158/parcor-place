# Parcor Place 🐉💎

A parkour game for iPad. A dragon has been put under a spell and can't fly.
Run and jump through 100 levels, collect 100 magic gems, and break the spell!

The game design is in [GAME_DESIGN.md](GAME_DESIGN.md).

## Playing it

It's a plain web page with no build step. To try it on a computer:

```sh
python3 -m http.server 8000
# open http://localhost:8000  (arrow keys + space work too)
```

On the iPad, open the GitHub Pages address in Safari, then tap **Share → Add to Home Screen**.
It then opens full screen like an app. Progress is saved on the iPad.
Adding it to the Home Screen also keeps Safari from clearing the save after a few weeks without play.

Add `?unlock` to the address to open every level (for grown-up testing).

## How it's built

| File | What it does |
|---|---|
| `js/themes.js` | The 10 worlds: colors, backgrounds, and which obstacles appear |
| `js/levels.js` | Builds all 100 levels from their level number (same level every time) |
| `js/physics.js` | Running, jumping, springs, and what the dragon touches |
| `js/dragon.js` | Draws the dragon from its settings (type, colors, horns, wings, eyes) |
| `js/render.js` | Draws the backgrounds, ground, spikes, lava, flags, and gems |
| `js/game.js` | Plays a level (hearts, checkpoints, camera) and the flying ending |
| `js/main.js` | The screens: title, dragon maker, story, level map, pause/win |
| `js/input.js` | Multi-touch buttons and keyboard |

## Checking the levels

```sh
node tools/verify.mjs      # robot dragon tries to beat all 100 levels
node tools/verify.mjs 12   # check level 13 and print its map
```

The robot plays with weaker jumps and slower running than the real dragon.
If it can win, a kid has some room for mistakes. Run this after changing
`levels.js`, `themes.js`, or `physics.js`.

## App icons

`icons/` is made from `tools/make-icons.html?size=180` (also 192 and 512),
screenshotted at that size.
