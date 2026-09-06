# Hambidextrous

**Go HAM with both hands!**

A chaotic, kawaii, WarioWare-style micro-game frenzy for phones that secretly trains
ambidexterity. Every mini game is played **twice in a row: once with your LEFT hand,
once with your RIGHT.** The hand that wins more games is crowned the **CHAMPION HAND**. 👑

A full session is 6 random mini games (12 rounds) and runs in **under 2 minutes**,
with a metronome ticking under everything and a beat-synced 3‑2‑1 count before each swap.
The tempo speeds up as the session goes on.

## Play it

Open `index.html` on a phone (or serve the folder with any static host, e.g. GitHub Pages).
Tap **Add to Home Screen** for a full-screen app feel. Sound needs a first tap to unlock.

- Use **only the hand the screen tells you to** (the HUD bar and hand icon change colour: 🔵 left, 🩷 right).
- Each round lasts 4–6 seconds. Beat the score your other hand got!

## The 10 mini games

| | Game | How to play | Trains |
|---|---|---|---|
| 🪙 | **Coin Toss** | Tap the coins while they're flying | moving-target taps |
| 🎯 | **Dizzy Darts** | Tap the bullseye of a board that won't sit still | precision |
| ✂️ | **Coupon Cut** | Trace the dotted line to cut the coupon out | line tracing |
| 🌱 | **Weed Whack** | Pull weeds as they sprout (whack-a-mole) | reaction taps |
| 🥞 | **Pancake Flip** | Tap exactly when the pancake turns golden | timing |
| 🍣 | **Sushi Slice** | Swipe through the flying sushi | swipes |
| 🐱 | **Pet the Cat** | Rub the kitty back and forth | oscillating strokes |
| 🎈 | **Balloon Pump** | Tap as fast as you can to inflate it | tap speed |
| 🐝 | **Bee Line** | Drag the bee along a wiggly path to the honey | steady drag |
| 🍬 | **Candy Sort** | Drag each candy into the same-colour jar | drag & drop |

## Tech

Single self-contained `index.html`: vanilla JS, a 2D canvas, Web Audio for the metronome,
count-ins and all sound effects (no assets, no build step, no dependencies).
`manifest.webmanifest` + `icon.svg` make it installable.

Tweakables live at the top of the script: `GAMES_PER_SESSION`, per-game `dur`, and `bpmFor()`.
`window.HAM.startSession(['coin','cat'])` starts a session with specific games for testing.
