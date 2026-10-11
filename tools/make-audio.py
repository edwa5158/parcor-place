#!/usr/bin/env python3
"""Makes all the cutscene audio for Parcor Place: the voices, the music, and the sound effects.

The story script is in this file (INTRO, ENDING, LOST below). Change it here and run this again.
It writes audio/*.mp3 and js/story-data.js (the captions and timings the game uses).

Voices come from Kokoro, an open text-to-speech model that runs on this computer.
Music and sound effects are made from scratch with numpy, no samples.

One-time setup (the model files are big, so they stay out of the repo):
  uv venv ~/.cache/parcor-tts/venv
  VIRTUAL_ENV=~/.cache/parcor-tts/venv uv pip install kokoro-onnx soundfile numpy scipy lameenc
  cd ~/.cache/parcor-tts
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin

Run:
  ~/.cache/parcor-tts/venv/bin/python tools/make-audio.py
  ~/.cache/parcor-tts/venv/bin/python tools/make-audio.py --models DIR --wav DIR   # other model folder; also save WAVs
"""

import argparse
import json
import re
import shutil
import tempfile
from fractions import Fraction
from pathlib import Path

import lameenc
import numpy as np
from scipy.signal import lfilter, resample_poly

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / 'audio'
DATA_JS = ROOT / 'js' / 'story-data.js'
VOICE_SR = 24000  # Kokoro's sample rate. Voice clips and their sound effects use it.
MUSIC_SR = 32000
rng = np.random.default_rng(7)

# ---------------------------------------------------------------------------
# The cast. pitch is in semitones; the voice is made faster or slower first so the
# talking speed stays the same after the pitch change.
CAST = {
    'narrator': dict(label='Narrator', voice='af_heart', lang='en-us', pitch=0, speed=0.92),
    'wizard': dict(label='Wizard Grumbleboots', voice='bm_george', lang='en-gb', pitch=-3, speed=0.9, echo=0.22),
    'dragon': dict(label='{name}', voice='am_puck', lang='en-us', pitch=4, speed=0.9),
}

# ---------------------------------------------------------------------------
# The story. Each panel is one picture. Steps play in order:
#   (who, text[, mood])  a line of talking. mood is for the wizard's face.
#   ('sfx', name)        a sound effect
#   ('cue', name)        something happens in the picture right here
#   ('pause', seconds)
# Lines can't say the dragon's name (the player picks it), so they say "the dragon"
# and the game shows the name on screen.

INTRO = [
    dict(scene='sky', music='once', steps=[
        ('narrator', "Once upon a time, in a land called Parcor Place, there lived a dragon who loved to fly!"),
        ('cue', 'loop'), ('sfx', 'whoosh'), ('pause', 0.3),
        ('dragon', "Woo-hoo! Zoom! Loop-de-loop!"),
    ]),
    dict(scene='tower', music='wizard', steps=[
        ('narrator', "But nearby, in a wobbly old tower, lived the grumpiest wizard in the whole wide world."),
        ('cue', 'enter'), ('sfx', 'sting'),
        ('wizard', "I am Wizard Grumbleboots! And I am VERY grumpy!", 'grumpy'),
    ]),
    dict(scene='tower', music='wizard', pancakes=True, steps=[
        ('wizard', "Ooh, breakfast time! A big stack of pancakes, with extra syrup. Yum, yum, yum!", 'happy'),
        ('cue', 'whoosh'), ('sfx', 'whoosh'),
        ('narrator', "Then, whoosh! The dragon zoomed by so fast, the pancakes flew right off the plate!"),
        ('cue', 'splat'), ('sfx', 'splat'),
        ('wizard', "My... PANCAKES!", 'shock'),
    ]),
    dict(scene='tower', music='wizard', hatPancake=True, dragon='hover', steps=[
        ('wizard', "That's it, dragon! No more flying for you!", 'grumpy'),
        ('wizard', "Abra... ca... GRUMPY!", 'zap'),
        ('cue', 'zap'), ('sfx', 'zap'),
        ('pause', 0.8),
    ]),
    dict(scene='ground', music=None, steps=[
        ('dragon', "Hey! What happened? My wings won't work!"),
        ('cue', 'flap'),
        ('dragon', "Flap, flap, flap..."),
        ('cue', 'flop'), ('sfx', 'wahwah'),
        ('dragon', "Oh no."),
    ]),
    dict(scene='tower', music='wizard', hatPancake=True, steps=[
        ('wizard', "Mwah-ha-ha-ha! I hid one hundred magic gems all over the land.", 'laugh'),
        ('cue', 'gems'), ('sfx', 'shimmer'),
        ('wizard', "Only all one hundred gems can break my spell. And you will NEVER find them all!", 'grumpy'),
        ('wizard', "Mwah-ha-ha-ha-ha! Ahem. Ha.", 'laugh'),
    ]),
    dict(scene='worlds', music='adventure', steps=[
        ('narrator', "Never find them? Ha! He doesn't know about YOU!"),
        ('narrator', "Run, jump, climb and slide over rooftops, treetops, castles, and even lava!"),
        ('narrator', "Find all one hundred gems, and break the spell!"),
        ('dragon', "Will you help me? Let's go!"),
    ]),
]

ENDING = [
    dict(scene='glow', music='magic', steps=[
        ('narrator', "One hundred magic gems! You found them all!"),
        ('cue', 'glow'), ('sfx', 'shimmer'),
        ('narrator', "The gems began to sparkle... and glow... brighter, and brighter, and..."),
        ('cue', 'boom'), ('sfx', 'spellbreak'),
        ('narrator', "POP! The spell is broken!"),
    ]),
    dict(scene='liftoff', music='triumph', steps=[
        ('dragon', "My wings feel all tingly! I think... I think I can..."),
        ('cue', 'liftoff'), ('sfx', 'whoosh'),
        ('dragon', "I CAN FLY! Yippee!"),
    ]),
    dict(scene='tower', music='once', dragon='perch', sky='day', steps=[
        ('wizard', "Oh, fiddlesticks. You really did it.", 'sorry'),
        ('wizard', "Um, dragon? I'm sorry I was so grumpy. I was just really, really hungry.", 'sorry'),
    ]),
    dict(scene='friends', music='once', steps=[
        ('dragon', "That's okay! I'm sorry I knocked over your pancakes."),
        ('dragon', "Want to make some more? Together?"),
        ('cue', 'happy'), ('sfx', 'boing'),
        ('wizard', "Pancakes? With extra syrup? Oh, yes please!", 'happy'),
    ]),
    dict(scene='ride', music='triumph', steps=[
        ('narrator', "And so, the dragon and the wizard became best friends."),
        ('narrator', "They ate lots of pancakes, and flew happily ever after."),
        ('cue', 'theend'), ('sfx', 'tada'),
        ('narrator', "The end!"),
        ('dragon', "Now let's go fly!"),
    ]),
]

# Short lines for when all three hearts are gone. The game takes turns playing them.
LOST = [
    ('wizard', "Oopsie daisy! Try again, little dragon!", 'laugh'),
    ('narrator', "Oops! Shake it off, and try again!"),
    ('dragon', "Ouch, my tail! Okay, one more time!"),
    ('wizard', "Mwah-ha-ha-ha! My gems are safe! For now...", 'laugh'),
    ('narrator', "Every great parkour dragon falls down sometimes. You've got this!"),
    ('dragon', "Whoa, wobbly! Let's try that again!"),
]


# ---------------------------------------------------------------------------
# Little helpers

def secs(sec, sr):
    return np.arange(int(sec * sr)) / sr


def normalize(x, peak=0.9):
    m = np.max(np.abs(x)) if len(x) else 0
    return x * (peak / m) if m > 0 else x


def soft_limit(x):
    return np.tanh(x * 1.1) / np.tanh(1.1)


def comb(x, d, g):
    """y[n] = x[n] + g*y[n-d], done a block at a time so it's fast."""
    y = x.copy()
    for i in range(d, len(y), d):
        n = min(d, len(y) - i)
        y[i:i + n] += g * y[i - d:i - d + n]
    return y


def allpass(x, d, g):
    y = np.zeros_like(x)
    xp = np.concatenate([np.zeros(d), x])
    for i in range(0, len(y), d):
        n = min(d, len(y) - i)
        prev = y[i - d:i - d + n] if i >= d else np.zeros(n)
        y[i:i + n] = -g * x[i:i + n] + xp[i:i + n] + g * prev
    return y


def reverb(x, sr, decay=0.8):
    wet = sum(comb(x, int(sr * ms / 1000), decay) for ms in (29.7, 37.1, 41.1, 43.7)) / 4
    wet = lfilter([0.45], [1, -0.55], wet)  # duller echoes
    for ms in (5.0, 1.7):
        wet = allpass(wet, int(sr * ms / 1000), 0.7)
    return wet


def write_mp3(path, x, sr, kbps):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps)
    enc.set_in_sample_rate(sr)
    enc.set_channels(1)
    enc.set_quality(2)
    path.write_bytes(enc.encode(pcm) + enc.flush())


def write_wav(path, x, sr):
    import soundfile as sf
    sf.write(str(path), np.clip(x, -1, 1), sr)


# ---------------------------------------------------------------------------
# Instruments. Each makes one note: (frequency, seconds held, sample rate) -> samples, with a tail.

NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(name):
    n, i = NOTE[name[0]], 1
    while name[i] in '#b':
        n += 1 if name[i] == '#' else -1
        i += 1
    return n + 12 * (int(name[i:]) + 1)


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def notes(text):
    """'C5:1 E5+G5:.5 r:1' -> [(beat, beats, [midi...])]. + makes a chord, r is a rest."""
    out, b = [], 0.0
    for tok in text.split():
        name, d = tok.split(':')
        if name != 'r':
            out.append((b, float(d), [midi(x) for x in name.split('+')]))
        b += float(d)
    return out


def release(t, held, r):
    return np.where(t < held, 1.0, np.exp(-(t - held) / r))


def additive(f, t, weights, sr, phase=None):
    ph = 2 * np.pi * f * t if phase is None else phase
    out = np.zeros_like(t)
    for k, w in enumerate(weights, 1):
        if f * k < sr / 2 and w:
            out += w * np.sin(k * ph)
    return out


def celesta(f, held, sr):
    t = secs(held + 1.4, sr)
    out = np.zeros_like(t)
    for ratio, amp, dec in ((1, 1, 2.2), (2, 0.35, 4), (3, 0.12, 6), (4.2, 0.07, 9)):
        if f * ratio < sr / 2:
            out += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-dec * t)
    return out * np.minimum(1, t / 0.003)


def pluck(f, held, sr, bright=0.6, decay=0.996):
    """Karplus-Strong string: a harp or a pizzicato violin."""
    n = int((held + 0.9) * sr)
    p = max(2, int(round(sr / f - 0.5)))
    y = np.zeros(n + p + 1)
    burst = rng.uniform(-1, 1, p + 1)
    y[:p + 1] = lfilter([bright], [1, -(1 - bright)], burst)
    i = p + 1
    while i < len(y):
        j = min(i + p, len(y))
        y[i:j] = decay * 0.5 * (y[i - p:j - p] + y[i - p - 1:j - p - 1])
        i = j
    t = secs(len(y) / sr, sr)[:len(y)]
    y = y * release(t, held, 0.12) * np.minimum(1, t / 0.002)
    return y[:n]


def flute(f, held, sr):
    t = secs(held + 0.3, sr)
    vib = f * 0.004 * np.clip((t - 0.2) / 0.3, 0, 1)
    ph = 2 * np.pi * f * t + vib / 5 * np.sin(2 * np.pi * 5 * t)
    x = additive(f, t, (1, 0.18, 0.05), sr, ph)
    x += 0.03 * rng.standard_normal(len(t)) * np.exp(-t * 20)  # breath
    return x * np.minimum(1, t / 0.06) * release(t, held, 0.08)


def brass(f, held, sr, plunger=False):
    t = secs(held + 0.3, sr)
    vib = f * 0.006 * np.clip((t - 0.25) / 0.3, 0, 1)
    ph = 2 * np.pi * f * t + vib / 5.5 * np.sin(2 * np.pi * 5.5 * t)
    if plunger:  # wah: dull, bright, dull
        b = 1.6 - 1.25 * np.sin(np.pi * np.clip(t / max(held, 0.05), 0, 1))
    else:
        b = 0.42 + 1.2 * np.exp(-t / 0.05)  # starts soft and gets bright, like a trumpet
    out = np.zeros_like(t)
    for k in range(1, 13):
        if f * k < sr / 2:
            out += (1 / k) * np.exp(-(k - 1) * b) * np.sin(k * ph)
    return out * np.minimum(1, t / 0.025) * release(t, held, 0.1)


def bassoon(f, held, sr):
    t = secs(held + 0.2, sr)
    x = additive(f, t, (1, 0.7, 0.9, 0.4, 0.5, 0.25, 0.2, 0.1), sr)
    return x * np.minimum(1, t / 0.01) * np.exp(-t * 2) * release(t, held, 0.05)


def chip(f, held, sr):
    """A soft video-game square lead."""
    t = secs(held + 0.2, sr)
    vib = f * 0.005 * np.clip((t - 0.15) / 0.2, 0, 1)
    ph = 2 * np.pi * f * t + vib / 6 * np.sin(2 * np.pi * 6 * t)
    x = additive(f, t, (1, 0.05, 0.33, 0, 0.2, 0, 0.14, 0, 0.1), sr, ph)
    return x * np.minimum(1, t / 0.005) * (0.7 + 0.3 * np.exp(-t * 8)) * release(t, held, 0.06)


def bass(f, held, sr):
    t = secs(held + 0.2, sr)
    x = np.tanh(1.5 * additive(f, t, (1, 0.4, 0.15), sr))
    return x * np.minimum(1, t / 0.004) * np.exp(-t * 2.5) * release(t, held, 0.04)


def pad(f, held, sr):
    t = secs(held + 0.6, sr)
    x = sum(additive(f * (1 + d), t, [(1 / k) ** 1.3 for k in range(1, 9)], sr) for d in (-0.006, 0, 0.007))
    return x / 3 * np.minimum(1, t / 0.3) * release(t, held, 0.4)


def timpani(f, held, sr):
    t = secs(1.6, sr)
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.03 * np.exp(-t * 10))) / sr
    x = (np.sin(ph) + 0.3 * np.sin(1.5 * ph)) * np.exp(-t * 2.4)
    x += lfilter([0.1], [1, -0.9], rng.standard_normal(len(t))) * np.exp(-t * 30)
    return x


def kick(sr):
    t = secs(0.35, sr)
    ph = 2 * np.pi * np.cumsum(48 + 110 * np.exp(-t * 28)) / sr
    return np.sin(ph) * np.exp(-t * 9)


def snare(sr):
    t = secs(0.25, sr)
    n = np.diff(rng.standard_normal(len(t) + 1))
    return 0.5 * n * np.exp(-t * 18) + 0.6 * np.sin(2 * np.pi * 185 * t) * np.exp(-t * 28)


def hat(sr):
    t = secs(0.06, sr)
    return 0.4 * np.diff(rng.standard_normal(len(t) + 2), 2) * np.exp(-t * 60)


def crash(sr):
    t = secs(1.6, sr)
    return 0.35 * np.diff(rng.standard_normal(len(t) + 1)) * np.exp(-t * 2.5)


def shaker(sr):
    t = secs(0.09, sr)
    n = lfilter([1, -1], [1, -0.3], rng.standard_normal(len(t)))
    return 0.3 * n * np.minimum(1, t / 0.015) * np.exp(-t * 40)


# ---------------------------------------------------------------------------
# Music. Each track is a loop. It's rendered so its end flows into its start
# (notes and echoes that ring past the end are wrapped around to the beginning).

class Track:
    def __init__(self, bpm, beats, sr=MUSIC_SR):
        self.sr = sr
        self.spb = 60 / bpm
        self.length = int(round(beats * self.spb * sr))
        self.buf = np.zeros(self.length + 4 * sr)

    def add(self, beat, sig, gain):
        i = int(round(beat * self.spb * self.sr))
        n = min(len(sig), len(self.buf) - i)
        self.buf[i:i + n] += gain * sig[:n]

    def play(self, instr, score, gain, offset=0.0, octave=0, **kw):
        for b, d, ms in score:
            for m in ms:
                self.add(offset + b, instr(hz(m + 12 * octave), d * self.spb, self.sr, **kw), gain)

    def hit(self, drum, beats, gain):
        sig = drum(self.sr)
        for b in beats:
            self.add(b, sig, gain)

    def render(self, wet=0.25):
        L = self.length
        loop = self.buf[:L].copy()
        tail = self.buf[L:]
        loop[:len(tail)] += tail
        if wet:
            loop = loop + wet * reverb(np.tile(loop, 2), self.sr)[L:]
        return normalize(soft_limit(normalize(loop, 1.0)), 0.8)


def bars(n, beats_per_bar, pattern):
    return [bar * beats_per_bar + p for bar in range(n) for p in pattern]


def music_once():
    """Storybook waltz in F: harp, celesta, and a soft flute."""
    tr = Track(126, 24)
    chords = [('F2', 'F3+A3+C4'), ('D2', 'D3+F3+A3'), ('Bb1', 'Bb2+D3+F3'), ('C2', 'C3+E3+G3'),
              ('F2', 'F3+A3+C4'), ('D2', 'D3+F3+A3'), ('G1', 'G2+Bb2+D3'), ('F2', 'F3+A3+C4')]
    for i, (root, triad) in enumerate(chords):
        tr.play(pluck, notes(f'{root}:1'), 0.55, offset=i * 3, octave=1)
        tr.play(pluck, notes(f'r:1 {triad}:1 {triad}:1'), 0.22, offset=i * 3, octave=1, bright=0.4)
        tr.play(pad, notes(f'{triad}:3'), 0.05, offset=i * 3, octave=1)
    tune = notes('C5:1 F5:1 A5:1 A5:2 G5:1 F5:1 D5:1 F5:1 G5:2 E5:1 '
                 'C5:1 F5:1 A5:1 D6:2 C6:1 Bb5:1 A5:1 G5:1 F5:3')
    tr.play(celesta, tune, 0.32)
    tr.play(flute, tune, 0.14, octave=-1)
    tr.hit(shaker, bars(8, 3, (1, 2)), 0.12)
    return tr.render(0.3)


def music_wizard():
    """Sneaky, silly villain music in D minor: tiptoeing bassoon and pizzicato."""
    tr = Track(100, 16)
    tr.play(bassoon, notes('D3:.5 r:.5 A2:.5 r:.5 D3:.5 r:.5 F3:.5 E3:.5 '
                           'D3:.5 r:.5 A2:.5 r:.5 D3:.5 r:.5 C#3:.5 r:.5 '
                           'Bb2:.5 r:.5 F2:.5 r:.5 Bb2:.5 r:.5 D3:.5 C#3:.5 '
                           'A2:.5 r:.5 A2:.5 Bb2:.5 B2:.5 C3:.5 C#3:1'), 0.42)
    for i, triad in enumerate(['D4+F4+A4', 'D4+F4+A4', 'Bb3+D4+F4', 'A3+C#4+E4']):
        tr.play(pluck, notes(f'r:1 {triad}:.4 r:1.6 {triad}:.4'), 0.2, offset=i * 4, bright=0.8)
    tr.play(celesta, notes('r:2 A5:.5 Bb5:.5 A5:1 r:2 F5:.5 E5:.5 D5:1 '
                           'r:2 G5:.5 Bb5:.5 D6:1 C#6:2 A5:2'), 0.22)
    tr.play(timpani, notes('D2:4 D2:4 Bb1:4 A1:4'), 0.4)
    tr.hit(hat, bars(4, 4, (1.5, 3.5)), 0.12)
    return tr.render(0.28)


def music_adventure():
    """Bouncy run-and-jump music in G with drums."""
    tr = Track(132, 32)
    prog = [('G', 'G3+B3+D4'), ('E', 'E3+G3+B3'), ('C', 'C3+E3+G3'), ('D', 'D3+F#3+A3'),
            ('G', 'G3+B3+D4'), ('E', 'E3+G3+B3'), ('C', 'C3+E3+G3'), ('G', 'G3+B3+D4')]
    for i, (root, triad) in enumerate(prog):
        r2, r3 = f'{root}2', f'{root}3'
        tr.play(bass, notes(f'{r2}:.5 {r2}:.5 {r3}:.5 {r2}:.5 {r2}:.5 {r3}:.5 {r2}:.5 {r3}:.5'), 0.45, offset=i * 4)
        tr.play(brass, notes(f'{triad}:.4 r:1.1 {triad}:.4 r:2.1'), 0.1, offset=i * 4)
        tr.play(pad, notes(f'{triad}:4'), 0.04, offset=i * 4, octave=1)
    tune = notes('G5:.5 G5:.5 D5:.5 G5:.5 B5:1 A5:1 '
                 'G5:.5 E5:.5 B4:.5 E5:.5 G5:2 '
                 'E5:.5 E5:.5 C5:.5 E5:.5 G5:1 E5:1 '
                 'F#5:.5 F#5:.5 D5:.5 F#5:.5 A5:2 '
                 'G5:.5 G5:.5 D5:.5 G5:.5 B5:1 A5:1 '
                 'B5:.5 B5:.5 G5:.5 B5:.5 E6:2 '
                 'C6:1 B5:.5 A5:.5 D6:1 C6:.5 A5:.5 '
                 'B5:1 A5:.5 F#5:.5 G5:2')
    tr.play(chip, tune, 0.2)
    tr.play(celesta, tune, 0.1, octave=1)
    tr.hit(kick, bars(8, 4, (0, 1.5, 2)), 0.6)
    tr.hit(snare, bars(8, 4, (1, 3)), 0.35)
    tr.hit(hat, bars(8, 4, (0, .5, 1, 1.5, 2, 2.5, 3, 3.5)), 0.12)
    return tr.render(0.18)


def music_magic():
    """Twinkly, floaty music for the gems glowing."""
    tr = Track(84, 16)
    arps = ['C5 E5 G5 B5 D6 B5 G5 E5', 'D5 F#5 A5 C6 E6 C6 A5 F#5',
            'B4 E5 G5 B5 E6 B5 G5 E5', 'D5 F#5 A5 D6 F#6 D6 A5 F#5']
    for i, arp in enumerate(arps):
        tr.play(celesta, notes(' '.join(f'{n}:.25' for n in arp.split() * 2)), 0.16, offset=i * 4)
    for i, chord in enumerate(['C3+G3+B3+E4', 'C3+D4+F#4+A4', 'C3+E4+G4+B4', 'D3+F#4+A4+D5']):
        tr.play(pad, notes(f'{chord}:4'), 0.09, offset=i * 4)
        tr.play(flute, notes(f'{chord.split("+")[-1]}:4'), 0.12, offset=i * 4, octave=1)
    for b in rng.uniform(0, 16, 14):  # extra sparkles
        tr.add(b, celesta(hz(rng.integers(88, 100)), 0.1, tr.sr), 0.05)
    return tr.render(0.45)


def music_triumph():
    """Big happy fanfare in C for breaking the spell."""
    tr = Track(120, 32)
    prog = [('C', 'C4+E4+G4'), ('F', 'F3+A3+C4'), ('G', 'G3+B3+D4'), ('C', 'C4+E4+G4'),
            ('A', 'A3+C4+E4'), ('F', 'F3+A3+C4'), ('G', 'G3+B3+D4'), ('C', 'C4+E4+G4')]
    for i, (root, triad) in enumerate(prog):
        tr.play(bass, notes(f'{root}2:1 {root}2:1 {root}3:1 {root}2:1'), 0.4, offset=i * 4)
        tr.play(brass, notes(f'{triad}:1.5 {triad}:.5 {triad}:2'), 0.09, offset=i * 4)
        tr.play(timpani, notes(f'{root}2:2 {root}2:2'), 0.25, offset=i * 4)
    tune = notes('G4:.5 C5:.5 E5:.5 G5:.5 C6:1.5 G5:.5 '
                 'A5:1 C6:1 A5:1 F5:1 '
                 'G5:.5 A5:.5 B5:.5 C6:.5 D6:1 B5:1 '
                 'C6:3 r:1 '
                 'E6:1 C6:1 A5:1 C6:1 '
                 'F6:1 E6:.5 D6:.5 C6:1 A5:1 '
                 'B5:1 D6:1 G6:1 F6:1 '
                 'E6:1 C6:1 C6:2')
    tr.play(brass, tune, 0.26, octave=-1)
    tr.play(celesta, tune, 0.12)
    tr.hit(kick, bars(8, 4, (0, 2)), 0.5)
    tr.hit(snare, bars(8, 4, (1, 3)) + [15.25, 15.5, 15.75, 31.25, 31.5, 31.75], 0.3)
    tr.hit(crash, [0], 0.5)
    tr.hit(hat, bars(8, 4, (0.5, 1.5, 2.5, 3.5)), 0.1)
    return tr.render(0.22)


MUSIC = {
    'once': music_once, 'wizard': music_wizard, 'adventure': music_adventure,
    'magic': music_magic, 'triumph': music_triumph,
}


# ---------------------------------------------------------------------------
# Sound effects for the cutscenes (made at the voice sample rate so they mix into the clips).
# Each returns (samples, how many seconds to wait before the next step).

def swept_noise(d, sr, f_lo, f_hi, shape):
    """Noise through a resonant filter whose pitch follows shape(0..1)."""
    t = secs(d, sr)
    n = rng.standard_normal(len(t))
    out = np.zeros_like(t)
    zi = np.zeros(2)
    blk = 128
    for i in range(0, len(t), blk):
        fc = f_lo + (f_hi - f_lo) * shape(i / len(t))
        r, th = 0.96, 2 * np.pi * fc / sr
        out[i:i + blk], zi = lfilter([1 - r], [1, -2 * r * np.cos(th), r * r], n[i:i + blk], zi=zi)
    return t, out


def sparkles(d, sr, count, lo=1800, hi=5200, decay=1.0):
    x = np.zeros(int(d * sr))
    for start in np.sort(rng.uniform(0, d * 0.85, count)):
        i = int(start * sr)
        b = celesta(rng.uniform(lo, hi), 0.05, sr)[: len(x) - i]
        x[i:i + len(b)] += b * np.exp(-decay * start)
    return x


def sfx_whoosh(sr):
    t, x = swept_noise(0.9, sr, 250, 2600, lambda p: np.sin(np.pi * p) ** 2)
    return normalize(x * np.sin(np.pi * t / 0.9) ** 2, 0.7), 0.45


def sfx_splat(sr):
    t = secs(0.6, sr)
    wet = lfilter([0.08], [1, -0.92], rng.standard_normal(len(t))) * np.exp(-t * 11)
    thump = np.sin(2 * np.pi * np.cumsum(140 * np.exp(-t * 12) + 50) / sr) * np.exp(-t * 14)
    squelch = np.sin(2 * np.pi * np.cumsum(700 * np.exp(-t * 9) + 140) / sr) * np.exp(-t * 10) * 0.35
    return normalize(normalize(wet) * 0.7 + thump + squelch, 0.85), 0.55


def sfx_zap(sr):
    t = secs(1.3, sr)
    f = (1700 * np.exp(-t * 3) + 160) * (1 + 0.18 * np.sin(2 * np.pi * 26 * t))
    ph = 2 * np.pi * np.cumsum(f) / sr
    laser = (np.sin(ph) + 0.25 * np.sin(3 * ph)) * np.exp(-t * 2.2)
    crackle = rng.standard_normal(len(t)) * (rng.random(len(t)) < 0.03) * np.exp(-t * 3)
    x = laser + 0.6 * crackle + sparkles(1.3, sr, 22, decay=1.5) * 0.5
    return normalize(x, 0.85), 1.1


def sfx_sting(sr):
    """Dun, dun, DUNNN!"""
    x = np.zeros(int(2.4 * sr))
    for start, held, chord in ((0.0, 0.18, 'D3+A3'), (0.3, 0.18, 'D3+A3'), (0.6, 1.3, 'C#3+G3+Bb3')):
        for n in chord.split('+'):
            b = brass(hz(midi(n)), held, sr)
            i = int(start * sr)
            x[i:i + len(b)] += b[: len(x) - i]
    tim = timpani(hz(midi('D2')), 1, sr)
    i = int(0.6 * sr)
    x[i:i + len(tim)] += 0.7 * tim[: len(x) - i]
    return normalize(x, 0.75), 1.9


def sfx_wahwah(sr):
    """Sad trombone."""
    x = np.zeros(int(3.0 * sr))
    for start, held, n in ((0.0, 0.42, 'G3'), (0.48, 0.42, 'F#3'), (0.96, 0.42, 'F3'), (1.44, 1.1, 'E3')):
        f = hz(midi(n))
        t = secs(held + 0.3, sr)
        wobble = 0.025 * np.sin(2 * np.pi * 6 * t) * np.clip((t - 0.15) / 0.2, 0, 1) if held > 1 else 0
        ph = 2 * np.pi * np.cumsum(f * (1 + wobble)) / sr
        b = 1.6 - 1.25 * np.sin(np.pi * np.clip(t / held, 0, 1))
        note = sum((1 / k) * np.exp(-(k - 1) * b) * np.sin(k * ph) for k in range(1, 12))
        note *= np.minimum(1, t / 0.03) * release(t, held, 0.12)
        i = int(start * sr)
        x[i:i + len(note)] += note[: len(x) - i]
    return normalize(x, 0.75), 2.7


def sfx_shimmer(sr):
    x = np.zeros(int(2.0 * sr))
    for k, n in enumerate(['C6', 'E6', 'G6', 'B6', 'D7', 'F#7', 'A7']):
        b = celesta(hz(midi(n)), 0.1, sr)
        i = int(k * 0.09 * sr)
        x[i:i + len(b)] += b[: len(x) - i]
    x += 0.6 * sparkles(2.0, sr, 18, 2500, 6000)
    return normalize(x, 0.45), 0.4


def sfx_spellbreak(sr):
    d = 2.8
    x = np.zeros(int(d * sr))
    t, rise = swept_noise(0.7, sr, 300, 3500, lambda p: p * p)
    x[:len(rise)] += normalize(rise * (t / 0.7) ** 2, 0.5)
    i = int(0.7 * sr)
    tt = secs(0.9, sr)
    boom = np.sin(2 * np.pi * np.cumsum(30 + 90 * np.exp(-tt * 10)) / sr) * np.exp(-tt * 4)
    x[i:i + len(boom)] += boom
    glass = sparkles(0.5, sr, 45, 2500, 7500, decay=4) + 0.3 * np.diff(rng.standard_normal(int(0.5 * sr) + 1)) * np.exp(-secs(0.5, sr) * 10)
    x[i:i + len(glass)] += 0.8 * glass
    tail = sparkles(d - 0.8, sr, 30, 1500, 5000, decay=1.2)
    j = int(0.8 * sr)
    x[j:j + len(tail)] += 0.5 * tail[: len(x) - j]
    return normalize(x, 0.9), 1.3


def sfx_boing(sr):
    t = secs(0.7, sr)
    f = 260 * (1 + 0.45 * np.exp(-t * 4) * np.sin(2 * np.pi * 13 * t)) * (1 + t * 0.6)
    x = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t * 4.5)
    return normalize(x, 0.6), 0.5


def sfx_tada(sr):
    x = np.zeros(int(2.2 * sr))
    for start, held, chord in ((0.0, 0.14, 'C5+E5'), (0.2, 1.3, 'C4+G4+C5+E5+G5')):
        for n in chord.split('+'):
            i = int(start * sr)
            for b in (brass(hz(midi(n)), held, sr), 0.5 * celesta(hz(midi(n) + 12), held, sr)):
                x[i:i + len(b)] += b[: len(x) - i]
    x += 0.4 * sparkles(2.2, sr, 16)
    return normalize(x, 0.8), 1.4


SFX = {
    'whoosh': sfx_whoosh, 'splat': sfx_splat, 'zap': sfx_zap, 'sting': sfx_sting, 'wahwah': sfx_wahwah,
    'shimmer': sfx_shimmer, 'spellbreak': sfx_spellbreak, 'boing': sfx_boing, 'tada': sfx_tada,
}


# ---------------------------------------------------------------------------
# Voices

def spoken(text):
    """Words in CAPS are shouty in the captions, but the voice would spell them out, so say them normally."""
    return re.sub(r'\b[A-Z]{2,}\b', lambda m: m.group().lower(), text)


def trim(x, sr):
    loud = np.flatnonzero(np.abs(x) > 0.02 * np.max(np.abs(x)))
    if not len(loud):
        return x
    pad = int(0.03 * sr)
    return x[max(0, loud[0] - pad): loud[-1] + pad]


class Voices:
    def __init__(self, models):
        import espeakng_loader
        from kokoro_onnx import EspeakConfig, Kokoro
        # espeak-ng can't find its data in folders with long names, so copy it somewhere short.
        short = Path(tempfile.mkdtemp(prefix='esp')) / 'espeak-ng-data'
        shutil.copytree(espeakng_loader.get_data_path(), short)
        self.k = Kokoro(str(models / 'kokoro-v1.0.onnx'), str(models / 'voices-v1.0.bin'),
                        espeak_config=EspeakConfig(data_path=str(short)))
        self.cache = {}

    def say(self, who, text):
        key = (who, text)
        if key not in self.cache:
            c = CAST[who]
            r = 2 ** (c['pitch'] / 12)
            a, sr = self.k.create(spoken(text), voice=c['voice'], speed=c['speed'] / r, lang=c['lang'])
            assert sr == VOICE_SR
            a = trim(np.asarray(a, dtype=np.float64), sr)
            if c['pitch']:
                fr = Fraction(r).limit_denominator(60)
                a = resample_poly(a, fr.denominator, fr.numerator)
            if c.get('echo'):
                a = np.concatenate([a, np.zeros(int(0.6 * sr))])
                a = a + c['echo'] * reverb(a, sr, 0.75)
            loud = a[np.abs(a) > 0.05 * np.max(np.abs(a))]
            a = a * (0.11 / np.sqrt(np.mean(loud ** 2)))  # same loudness for everyone
            self.cache[key] = a
            print(f'  {who:8s} {len(a) / sr:5.2f}s  {text}')
        return self.cache[key]


def build_clip(steps, voices, sfx):
    """Lines up the talking and sound effects for one panel. Returns samples, captions, and cue times."""
    parts, lines, cues = [], [], {}
    t = 0.25
    for step in steps:
        kind = step[0]
        if kind in CAST:
            a = voices.say(kind, step[1])
            parts.append((t, a))
            line = dict(who=kind, text=step[1], t=round(t, 2))
            if len(step) > 2:
                line['mood'] = step[2]
            lines.append(line)
            t += len(a) / VOICE_SR + 0.3
        elif kind == 'sfx':
            a, wait = sfx[step[1]]
            parts.append((t, a * 0.55))
            t += wait
        elif kind == 'cue':
            cues[step[1]] = round(t, 2)
        elif kind == 'pause':
            t += step[1]
    end = max([t] + [s + len(a) / VOICE_SR for s, a in parts])
    x = np.zeros(int(end * VOICE_SR) + 1)
    for s, a in parts:
        i = int(s * VOICE_SR)
        x[i:i + len(a)] += a
    return soft_limit(x) * 0.95, lines, cues, round(end, 2)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--models', type=Path, default=Path.home() / '.cache' / 'parcor-tts',
                    help='folder with kokoro-v1.0.onnx and voices-v1.0.bin')
    ap.add_argument('--wav', type=Path, help='also save WAV copies here (for checking)')
    args = ap.parse_args()
    AUDIO.mkdir(exist_ok=True)
    if args.wav:
        args.wav.mkdir(parents=True, exist_ok=True)

    def save(name, x, sr, kbps):
        write_mp3(AUDIO / f'{name}.mp3', x, sr, kbps)
        if args.wav:
            write_wav(args.wav / f'{name}.wav', x, sr)
        return f'audio/{name}.mp3'

    print('Music')
    music = {}
    for name, make in MUSIC.items():
        loop = make()
        # Two copies back to back. The game loops the second copy, so the little gap
        # MP3 adds at the start can never land inside the loop.
        music[name] = dict(file=save(f'music-{name}', np.tile(loop, 2), MUSIC_SR, 80),
                           loop=round(len(loop) / MUSIC_SR, 5))
        print(f'  {name:9s} {len(loop) / MUSIC_SR:5.2f}s')

    print('Sound effects')
    sfx = {name: make(VOICE_SR) for name, make in SFX.items()}

    print('Voices')
    voices = Voices(args.models)
    cutscenes = {}
    for scene_name, panels in (('intro', INTRO), ('ending', ENDING)):
        out = []
        for i, panel in enumerate(panels, 1):
            x, lines, cues, dur = build_clip(panel['steps'], voices, sfx)
            info = {k: v for k, v in panel.items() if k != 'steps'}
            info.update(clip=save(f'{scene_name}-{i}', x, VOICE_SR, 56), dur=dur, lines=lines, cues=cues)
            out.append(info)
        cutscenes[scene_name] = out
    lost = []
    for i, step in enumerate(LOST, 1):
        x, lines, _, dur = build_clip([step], voices, sfx)
        lost.append(dict(clip=save(f'lost-{i}', x, VOICE_SR, 56), dur=dur, **lines[0]))

    cast = {who: c['label'] for who, c in CAST.items()}
    js = ('// Made by tools/make-audio.py. Change the story there and run it again.\n\n'
          f'export const CAST = {json.dumps(cast, indent=2)};\n\n'
          f'export const MUSIC = {json.dumps(music, indent=2)};\n\n'
          f'export const CUTSCENES = {json.dumps(cutscenes, indent=2)};\n\n'
          f'export const LOST = {json.dumps(lost, indent=2)};\n')
    DATA_JS.write_text(js)
    total = sum(f.stat().st_size for f in AUDIO.glob('*.mp3'))
    print(f'Wrote {DATA_JS.relative_to(ROOT)} and {len(list(AUDIO.glob("*.mp3")))} files in audio/ ({total / 1e6:.1f} MB)')


if __name__ == '__main__':
    main()
