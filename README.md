# Hambidextrous

**Go HAM with both hands!**

A chaotic, kawaii, WarioWare-style micro-game frenzy for phones that secretly trains
ambidexterity. A session is a **two-half competition**: one hand (picked at random) plays a
shuffled set of 6 mini games, then it's **HALFTIME**, and the other hand plays the same 6 games
in the same order trying to beat each score. The finale reveals the results game by game and
crowns the **CHAMPION HAND**. 👑

A full session (12 rounds) runs in **under 2 minutes**, with a metronome ticking under
everything and a beat-synced 3‑2‑1 count before each game. The tempo speeds up every round.

## Names & world records

Tapping **TAP TO PLAY** asks for the player's name before the session starts. The name lives only
for that game: the finale's **🏠 HOME** button clears it and returns to the title screen, and the
next **TAP TO PLAY** asks again, so a phone passed around a group always credits the right kid.
Personal bests are remembered per name on the device. Every finished round is sent to a global leaderboard: per game, the
top 10 scores in the world, with the hand that set them. A round that beats the world's best
gets a **🌍 NEW WORLD RECORD!** and beating your own best gets a **⭐ personal best**.
**🌍 WORLD RECORDS** on the title screen shows the record holder for every game, and tapping a
game shows its top 10 (plus a running "lefties hold X · righties hold Y" tally).

Syncing is asynchronous and lossless: scores go into a `localStorage` outbox the instant a round
ends, then flush in the background with retry and exponential backoff. If the phone is offline
or the tab is closed, the outbox survives reloads, a `sendBeacon` fires on page hide, and
client-generated ids make every send idempotent (the server does `ON CONFLICT DO NOTHING`), so
retries never double count and nothing is lost.

### Backend: Netlify DB + Netlify Functions

- `netlify/functions/scores.mjs` serves `GET/POST /api/scores` using `@netlify/database`.
- `netlify/database/migrations/0001_create_scores/migration.sql` creates the `scores` table;
  Netlify applies migrations automatically on deploy (the function also runs a
  `CREATE TABLE IF NOT EXISTS` fallback so a fresh database never errors).
- Netlify provisions the database automatically on the first deploy; deploy previews get their
  own isolated database branch, so preview leaderboards don't mix with production.
- Run `npm test` for the function's unit tests. For local dev with a real database use
  `netlify dev` (which starts a local Postgres) instead of a plain static server.

## Play it

Hosted on Netlify: connect this repo as a new site and deploy. `netlify.toml` already sets the
publish directory to the repo root with no build command, plus caching and security headers.
Locally, just open `index.html` (or serve the folder with any static host).
Tap **Add to Home Screen** for a full-screen app feel. Sound needs a first tap to unlock.

- Use **only the hand the screen tells you to** (the HUD bar and hand icon change colour: 🔵 left, 🩷 right).
- Each round lasts 4–6 seconds. In the second half, every game card shows the other hand's score to beat.

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
count-ins and all sound effects (no assets, no build step). The only dependency is
`@netlify/database` for the high-score function.
`manifest.webmanifest` + `icon.svg` make it installable.

Tweakables live at the top of the script: `GAMES_PER_SESSION`, per-game `dur`, and `bpmFor()`.
`window.HAM.startSession(['coin','cat'])` starts a session with specific games for testing.
