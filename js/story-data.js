// Made by tools/make-audio.py. Change the story there and run it again.

export const CAST = {
  "narrator": "Narrator",
  "wizard": "Wizard Grumbleboots",
  "dragon": "{name}"
};

export const MUSIC = {
  "once": {
    "file": "audio/music-once.mp3",
    "loop": 11.42856
  },
  "wizard": {
    "file": "audio/music-wizard.mp3",
    "loop": 9.6
  },
  "adventure": {
    "file": "audio/music-adventure.mp3",
    "loop": 14.54547
  },
  "magic": {
    "file": "audio/music-magic.mp3",
    "loop": 11.42856
  },
  "triumph": {
    "file": "audio/music-triumph.mp3",
    "loop": 16.0
  }
};

export const CUTSCENES = {
  "intro": [
    {
      "scene": "sky",
      "music": "once",
      "clip": "audio/intro-1.mp3",
      "dur": 8.43,
      "lines": [
        {
          "who": "narrator",
          "text": "Once upon a time, in a land called Parcor Place, there lived a dragon who loved to fly!",
          "t": 0.25
        },
        {
          "who": "dragon",
          "text": "Woo-hoo! Zoom! Loop-de-loop!",
          "t": 6.7
        }
      ],
      "cues": {
        "loop": 5.95
      }
    },
    {
      "scene": "tower",
      "music": "wizard",
      "clip": "audio/intro-2.mp3",
      "dur": 12.48,
      "lines": [
        {
          "who": "narrator",
          "text": "But nearby, in a wobbly old tower, lived the grumpiest wizard in the whole wide world.",
          "t": 0.25
        },
        {
          "who": "wizard",
          "text": "I am Wizard Grumbleboots! And I am VERY grumpy!",
          "t": 7.86,
          "mood": "grumpy"
        }
      ],
      "cues": {
        "enter": 5.96
      }
    },
    {
      "scene": "tower",
      "music": "wizard",
      "pancakes": true,
      "clip": "audio/intro-3.mp3",
      "dur": 16.25,
      "lines": [
        {
          "who": "wizard",
          "text": "Ooh, breakfast time! A big stack of pancakes, with extra syrup. Yum, yum, yum!",
          "t": 0.25,
          "mood": "happy"
        },
        {
          "who": "narrator",
          "text": "Then, whoosh! The dragon zoomed by so fast, the pancakes flew right off the plate!",
          "t": 7.76
        },
        {
          "who": "wizard",
          "text": "My... PANCAKES!",
          "t": 13.8,
          "mood": "shock"
        }
      ],
      "cues": {
        "whoosh": 7.31,
        "splat": 13.25
      }
    },
    {
      "scene": "tower",
      "music": "wizard",
      "hatPancake": true,
      "dragon": "hover",
      "clip": "audio/intro-4.mp3",
      "dur": 9.15,
      "lines": [
        {
          "who": "wizard",
          "text": "That's it, dragon! No more flying for you!",
          "t": 0.25,
          "mood": "grumpy"
        },
        {
          "who": "wizard",
          "text": "Abra... ca... GRUMPY!",
          "t": 4.27,
          "mood": "zap"
        }
      ],
      "cues": {
        "zap": 7.25
      }
    },
    {
      "scene": "ground",
      "music": null,
      "clip": "audio/intro-5.mp3",
      "dur": 7.69,
      "lines": [
        {
          "who": "dragon",
          "text": "Hey! What happened? My wings won't work!",
          "t": 0.25
        },
        {
          "who": "dragon",
          "text": "Flap, flap, flap...",
          "t": 2.54
        },
        {
          "who": "dragon",
          "text": "Oh no.",
          "t": 6.76
        }
      ],
      "cues": {
        "flap": 2.54,
        "flop": 4.06
      }
    },
    {
      "scene": "tower",
      "music": "wizard",
      "hatPancake": true,
      "clip": "audio/intro-6.mp3",
      "dur": 16.83,
      "lines": [
        {
          "who": "wizard",
          "text": "Mwah-ha-ha-ha! I hid one hundred magic gems all over the land.",
          "t": 0.25,
          "mood": "laugh"
        },
        {
          "who": "wizard",
          "text": "Only all one hundred gems can break my spell. And you will NEVER find them all!",
          "t": 6.69,
          "mood": "grumpy"
        },
        {
          "who": "wizard",
          "text": "Mwah-ha-ha-ha-ha! Ahem. Ha.",
          "t": 13.45,
          "mood": "laugh"
        }
      ],
      "cues": {
        "gems": 6.29
      }
    },
    {
      "scene": "worlds",
      "music": "adventure",
      "clip": "audio/intro-7.mp3",
      "dur": 13.29,
      "lines": [
        {
          "who": "narrator",
          "text": "Never find them? Ha! He doesn't know about YOU!",
          "t": 0.25
        },
        {
          "who": "narrator",
          "text": "Run, jump, climb and slide over rooftops, treetops, castles, and even lava!",
          "t": 3.21
        },
        {
          "who": "narrator",
          "text": "Find all one hundred gems, and break the spell!",
          "t": 8.64
        },
        {
          "who": "dragon",
          "text": "Will you help me? Let's go!",
          "t": 11.66
        }
      ],
      "cues": {}
    }
  ],
  "ending": [
    {
      "scene": "glow",
      "music": "magic",
      "clip": "audio/ending-1.mp3",
      "dur": 11.2,
      "lines": [
        {
          "who": "narrator",
          "text": "One hundred magic gems! You found them all!",
          "t": 0.25
        },
        {
          "who": "narrator",
          "text": "The gems began to sparkle... and glow... brighter, and brighter, and...",
          "t": 3.62
        },
        {
          "who": "narrator",
          "text": "POP! The spell is broken!",
          "t": 9.36
        }
      ],
      "cues": {
        "glow": 3.22,
        "boom": 8.06
      }
    },
    {
      "scene": "liftoff",
      "music": "triumph",
      "clip": "audio/ending-2.mp3",
      "dur": 5.7,
      "lines": [
        {
          "who": "dragon",
          "text": "My wings feel all tingly! I think... I think I can...",
          "t": 0.25
        },
        {
          "who": "dragon",
          "text": "I CAN FLY! Yippee!",
          "t": 4.13
        }
      ],
      "cues": {
        "liftoff": 3.68
      }
    },
    {
      "scene": "tower",
      "music": "once",
      "dragon": "perch",
      "sky": "day",
      "clip": "audio/ending-3.mp3",
      "dur": 10.54,
      "lines": [
        {
          "who": "wizard",
          "text": "Oh, fiddlesticks. You really did it.",
          "t": 0.25,
          "mood": "sorry"
        },
        {
          "who": "wizard",
          "text": "Um, dragon? I'm sorry I was so grumpy. I was just really, really hungry.",
          "t": 3.96,
          "mood": "sorry"
        }
      ],
      "cues": {}
    },
    {
      "scene": "friends",
      "music": "once",
      "clip": "audio/ending-4.mp3",
      "dur": 10.19,
      "lines": [
        {
          "who": "dragon",
          "text": "That's okay! I'm sorry I knocked over your pancakes.",
          "t": 0.25
        },
        {
          "who": "dragon",
          "text": "Want to make some more? Together?",
          "t": 3.37
        },
        {
          "who": "wizard",
          "text": "Pancakes? With extra syrup? Oh, yes please!",
          "t": 5.75,
          "mood": "happy"
        }
      ],
      "cues": {
        "happy": 5.25
      }
    },
    {
      "scene": "ride",
      "music": "triumph",
      "clip": "audio/ending-5.mp3",
      "dur": 10.97,
      "lines": [
        {
          "who": "narrator",
          "text": "And so, the dragon and the wizard became best friends.",
          "t": 0.25
        },
        {
          "who": "narrator",
          "text": "They ate lots of pancakes, and flew happily ever after.",
          "t": 3.63
        },
        {
          "who": "narrator",
          "text": "The end!",
          "t": 8.56
        },
        {
          "who": "dragon",
          "text": "Now let's go fly!",
          "t": 9.5
        }
      ],
      "cues": {
        "theend": 7.16
      }
    }
  ]
};

export const LOST = [
  {
    "clip": "audio/lost-1.mp3",
    "dur": 4.41,
    "who": "wizard",
    "text": "Oopsie daisy! Try again, little dragon!",
    "t": 0.25,
    "mood": "laugh"
  },
  {
    "clip": "audio/lost-2.mp3",
    "dur": 2.48,
    "who": "narrator",
    "text": "Oops! Shake it off, and try again!",
    "t": 0.25
  },
  {
    "clip": "audio/lost-3.mp3",
    "dur": 2.65,
    "who": "dragon",
    "text": "Ouch, my tail! Okay, one more time!",
    "t": 0.25
  },
  {
    "clip": "audio/lost-4.mp3",
    "dur": 4.72,
    "who": "wizard",
    "text": "Mwah-ha-ha-ha! My gems are safe! For now...",
    "t": 0.25,
    "mood": "laugh"
  },
  {
    "clip": "audio/lost-5.mp3",
    "dur": 4.47,
    "who": "narrator",
    "text": "Every great parkour dragon falls down sometimes. You've got this!",
    "t": 0.25
  },
  {
    "clip": "audio/lost-6.mp3",
    "dur": 2.38,
    "who": "dragon",
    "text": "Whoa, wobbly! Let's try that again!",
    "t": 0.25
  }
];
