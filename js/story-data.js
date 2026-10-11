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
      "dur": 8.9,
      "lines": [
        {
          "who": "narrator",
          "text": "Once upon a time, in a land called Parcor Place, there lived a dragon who loved to fly!",
          "t": 0.25
        },
        {
          "who": "dragon",
          "text": "Woo-hoo! Zoom! Loop-de-loop!",
          "t": 6.82
        }
      ],
      "cues": {
        "loop": 6.07
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
      "dur": 8.15,
      "lines": [
        {
          "who": "dragon",
          "text": "Hey! What happened? My wings won't work!",
          "t": 0.25
        },
        {
          "who": "dragon",
          "text": "Flap, flap, flap...",
          "t": 2.93
        },
        {
          "who": "dragon",
          "text": "Oh no.",
          "t": 7.19
        }
      ],
      "cues": {
        "flap": 2.93,
        "flop": 4.49
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
      "dur": 13.61,
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
      "dur": 6.11,
      "lines": [
        {
          "who": "dragon",
          "text": "My wings feel all tingly! I think... I think I can...",
          "t": 0.25
        },
        {
          "who": "dragon",
          "text": "I CAN FLY! Yippee!",
          "t": 4.32
        }
      ],
      "cues": {
        "liftoff": 3.87
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
      "dur": 10.73,
      "lines": [
        {
          "who": "dragon",
          "text": "That's okay! I'm sorry I knocked over your pancakes.",
          "t": 0.25
        },
        {
          "who": "dragon",
          "text": "Want to make some more? Together?",
          "t": 3.7
        },
        {
          "who": "wizard",
          "text": "Pancakes? With extra syrup? Oh, yes please!",
          "t": 6.29,
          "mood": "happy"
        }
      ],
      "cues": {
        "happy": 5.79
      }
    },
    {
      "scene": "ride",
      "music": "triumph",
      "clip": "audio/ending-5.mp3",
      "dur": 10.93,
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
  ],
  "world-2": [
    {
      "scene": "arrive",
      "world": 1,
      "music": "wizard",
      "clip": "audio/world-2-1.mp3",
      "dur": 9.19,
      "lines": [
        {
          "who": "wizard",
          "text": "Ten gems? Ha! Beginner's luck.",
          "t": 0.6,
          "mood": "laugh"
        },
        {
          "who": "wizard",
          "text": "You'll never get past my prickly treetops!",
          "t": 4.11,
          "mood": "grumpy"
        },
        {
          "who": "dragon",
          "text": "Watch me hop!",
          "t": 8.0
        }
      ],
      "cues": {
        "enter": 0.25
      }
    }
  ],
  "world-3": [
    {
      "scene": "arrive",
      "world": 2,
      "music": "wizard",
      "clip": "audio/world-3-1.mp3",
      "dur": 10.45,
      "lines": [
        {
          "who": "wizard",
          "text": "Twenty gems?! Grr!",
          "t": 0.6,
          "mood": "shock"
        },
        {
          "who": "wizard",
          "text": "Nobody gets through the spiky old castle. Nobody!",
          "t": 3.81,
          "mood": "grumpy"
        },
        {
          "who": "dragon",
          "text": "Spiky? I'll just jump!",
          "t": 8.58
        }
      ],
      "cues": {
        "enter": 0.25
      }
    }
  ],
  "world-4": [
    {
      "scene": "arrive",
      "world": 3,
      "music": "wizard",
      "clip": "audio/world-4-1.mp3",
      "dur": 8.03,
      "lines": [
        {
          "who": "narrator",
          "text": "Up, up, up into the clouds!",
          "t": 0.25
        },
        {
          "who": "wizard",
          "text": "Thirty gems! How are you doing that without flying?",
          "t": 2.55,
          "mood": "shock"
        },
        {
          "who": "dragon",
          "text": "Parkour!",
          "t": 7.07
        }
      ],
      "cues": {
        "enter": 2.2
      }
    }
  ],
  "world-5": [
    {
      "scene": "arrive",
      "world": 4,
      "music": "wizard",
      "clip": "audio/world-5-1.mp3",
      "dur": 10.82,
      "lines": [
        {
          "who": "wizard",
          "text": "Forty gems?! Well, Lava Land is hot, hot, HOT!",
          "t": 0.6,
          "mood": "grumpy"
        },
        {
          "who": "dragon",
          "text": "Whoa! Was that a volcano?",
          "t": 6.16
        },
        {
          "who": "wizard",
          "text": "No... that was my tummy.",
          "t": 8.07,
          "mood": "sorry"
        }
      ],
      "cues": {
        "enter": 0.25,
        "rumble": 5.26
      }
    }
  ],
  "world-6": [
    {
      "scene": "arrive",
      "world": 5,
      "music": "wizard",
      "clip": "audio/world-6-1.mp3",
      "dur": 10.5,
      "lines": [
        {
          "who": "narrator",
          "text": "Fifty gems! Halfway there!",
          "t": 0.25
        },
        {
          "who": "wizard",
          "text": "Brrr! Watch out for slippery ice, and pointy icicles!",
          "t": 2.67,
          "mood": "grumpy"
        },
        {
          "who": "wizard",
          "text": "Not that I care!",
          "t": 8.07,
          "mood": "grumpy"
        }
      ],
      "cues": {
        "enter": 2.32
      }
    }
  ],
  "world-7": [
    {
      "scene": "arrive",
      "world": 6,
      "music": "wizard",
      "clip": "audio/world-7-1.mp3",
      "dur": 9.38,
      "lines": [
        {
          "who": "wizard",
          "text": "Sixty gems! My plan is ruined!",
          "t": 0.6,
          "mood": "shock"
        },
        {
          "who": "wizard",
          "text": "And I'm so hungry!",
          "t": 5.26,
          "mood": "sorry"
        },
        {
          "who": "dragon",
          "text": "Ooh, sparkly caves!",
          "t": 7.8
        }
      ],
      "cues": {
        "enter": 0.25,
        "rumble": 4.36
      }
    }
  ],
  "world-8": [
    {
      "scene": "arrive",
      "world": 7,
      "music": "wizard",
      "clip": "audio/world-8-1.mp3",
      "dur": 10.43,
      "lines": [
        {
          "who": "wizard",
          "text": "Seventy gems?! The desert is full of prickly cactuses. You'll never...",
          "t": 0.6,
          "mood": "grumpy"
        },
        {
          "who": "wizard",
          "text": "Hmm. You might, actually.",
          "t": 6.5,
          "mood": "sorry"
        },
        {
          "who": "dragon",
          "text": "Woo-hoo!",
          "t": 9.47
        }
      ],
      "cues": {
        "enter": 0.25
      }
    }
  ],
  "world-9": [
    {
      "scene": "arrive",
      "world": 8,
      "music": "wizard",
      "clip": "audio/world-9-1.mp3",
      "dur": 10.93,
      "lines": [
        {
          "who": "wizard",
          "text": "Eighty gems! Quick, to my Spike Factory!",
          "t": 0.6,
          "mood": "shock"
        },
        {
          "who": "wizard",
          "text": "Nobody can get past all those spinning saws!",
          "t": 4.79,
          "mood": "zap"
        },
        {
          "who": "dragon",
          "text": "I can! Parkour!",
          "t": 9.29
        }
      ],
      "cues": {
        "enter": 0.25
      }
    }
  ],
  "world-10": [
    {
      "scene": "arrive",
      "world": 9,
      "music": "wizard",
      "clip": "audio/world-10-1.mp3",
      "dur": 12.05,
      "lines": [
        {
          "who": "narrator",
          "text": "Ninety gems! Only ten more!",
          "t": 0.25
        },
        {
          "who": "wizard",
          "text": "This is my tower. The last ten gems are all the way at the top.",
          "t": 2.85,
          "mood": "grumpy"
        },
        {
          "who": "wizard",
          "text": "Is it lunchtime yet?",
          "t": 9.31,
          "mood": "sorry"
        }
      ],
      "cues": {
        "enter": 2.5,
        "rumble": 8.41
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
    "dur": 2.97,
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
    "dur": 4.53,
    "who": "narrator",
    "text": "Every great parkour dragon falls down sometimes. You've got this!",
    "t": 0.25
  },
  {
    "clip": "audio/lost-6.mp3",
    "dur": 2.68,
    "who": "dragon",
    "text": "Whoa, wobbly! Let's try that again!",
    "t": 0.25
  }
];
