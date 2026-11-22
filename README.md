# The Gilded Hour

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?ref=xdr8gw0z)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/boboiday/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?ref=xdr8gw0z)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/boboiday/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?ref=xdr8gw0z)

A top-down 2D bank heist game, made for the [make.fun best heist game bounty](https://make.fun/bounty/best-heist-game-20261122-0559?ref=xdr8gw0z).

You are Kit, a thief in the Grand Meridian Bank after hours. Three rooms stand
between you and the night's take: the Lobby, the Vault Hall, and the Vault
itself. In each room, take every gold bar and the named prize — the Brass Key,
the Sapphire Brooch, the Star Sapphire — then slip out the GETAWAY door before
the alarm peaks.

## How to play

- **Move:** WASD / arrow keys, or click the floor (click-to-move).
- **Sneak:** hold SHIFT (or C) — slower, quieter, harder to spot.
- **Toss a coin:** E, or right-click a spot — 3 per room. The nearest guard
  within range comes to investigate the clink.
- **Start / continue:** SPACE or ENTER, or click. **Pause:** P or ESC.
  **Mute:** M.

Guards patrol with vision cones and chase when their suspicion fills; bumping
into one counts as seen. Cameras sweep their cones and raise the alarm fast —
about 2.5 seconds of camera exposure peaks it. The alarm decays when nobody
sees you, so time your crossings to the sweeps. At 100% the bank locks down and
you lose a life. Keep the alarm peak under 50% in a room for a +400 clean
bonus; finish under the 75-second par for +250 more.

## Screenshots

The four screenshots in `screenshots/` are real renders of the game running in
headless Chrome, taken with the `?shot=` scenes in `game/src/shots.js`:

1. `1-start.jpg` — title over the Lobby after 5 seconds of patrol.
2. `2-play.jpg` — the autopilot mid-heist, loot taken, alarm climbing.
3. `3-alert.jpg` — caught in a camera lens, alarm near 90%, a guard
   suspicious.
4. `4-end.jpg` — all loot taken, door open, ROOM CLEARED at 1500 points.

## Structure

- `game/index.html` — full-screen canvas, one module script, no network loads.
- `game/src/config.js` — every tuning number, colour and level.
- `game/src/random.js` — seeded RNG so screenshot scenes repeat.
- `game/src/input.js` — keyboard + pointer, held keys and one-shot flags.
- `game/src/world.js` — rules only: thief, guards, cameras, loot, alarm,
  coins, getaway door. One fixed 1/60s step, no drawing, no browser.
- `game/src/render.js` — drawing only: room, HUD, panels.
- `game/src/audio.js` — WebAudio synth blips, no audio files.
- `game/src/shots.js` — deterministic screenshot scenes + autopilot.
- `game/src/main.js` — boot, the one loop, six screens, best score.
- `main.ts` — hands the game in: copies `game/` + `screenshots/` to the
  output dir and writes `dossier.json`.
- `serve.ts` — tiny static server for local playtesting (`node serve.ts`).

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` directly in desktop Chrome.
