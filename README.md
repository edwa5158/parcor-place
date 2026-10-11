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
| `js/themes.js` | The 10 worlds: colors, backgrounds, which obstacles appear, and how each world draws them |
| `js/levels.js` | Builds all 100 levels from their level number (same level every time): gaps, crates, bushes, hills, dunes, tall walls, tunnels, spikes, cactuses, crystals, icicles |
| `js/physics.js` | Running, jumping, parkour moves (wall jumps, ledge grabs, vaults), hills and dunes, springs, and what the dragon touches (each kind of ouchy has its own shape) |
| `js/dragon.js` | Draws the dragon from its settings (type, colors, horns, wings, eyes) in each pose (run, jump, wall slide, climb, vault, slide, roll) |
| `js/render.js` | Draws the backgrounds, ground, hills, obstacles (a different look in each world), lava, flags, and gems |
| `js/game.js` | Plays a level (hearts, checkpoints, camera, smooth drawing between physics steps) and the flying ending |
| `js/main.js` | The screens: title, dragon maker, level map, pause/win |
| `js/cutscene.js` | The story cutscenes: draws each picture (the dragon, Wizard Grumbleboots, pancakes...) and plays the voices, music, and captions |
| `js/story-data.js` | Captions and timings for the cutscenes. Made by `tools/make-audio.py`, don't edit by hand |
| `audio/` | Voices, music, and sound effects for the cutscenes. Also made by `tools/make-audio.py` |
| `js/input.js` | Multi-touch buttons and keyboard |

## Checking the levels

```sh
node tools/verify.mjs      # robot dragon tries to beat all 100 levels
node tools/verify.mjs 12   # check level 13 and print its map
```

The robot plays with weaker jumps and slower running than the real dragon.
If it can win, a kid has some room for mistakes. Run this after changing
`levels.js`, `themes.js`, or `physics.js`.

## Story voices and music

The cutscenes (the story at the start, the ending after 100 gems, and the short lines
when all the hearts are gone) are written in `tools/make-audio.py`. The voices come from
[Kokoro](https://github.com/thewh1teagle/kokoro-onnx), a free text-to-speech model that runs
on your own computer. The music and sound effects are made from scratch in the same script.
To change a line or the music, edit the script and run it again (setup steps are at the top of the file):

```sh
~/.cache/parcor-tts/venv/bin/python tools/make-audio.py
```

The lines can't say the dragon's name, since the player picks it, so they say "the dragon"
and the name shows on screen.

## App icons

`icons/` is made from `tools/make-icons.html?size=180` (also 192 and 512),
screenshotted at that size.
