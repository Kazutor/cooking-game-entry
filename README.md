[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/Kazutor/cooking-game-entry/rank.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/Kazutor/cooking-game-entry/reward.svg)](https://make.fun/c/best-cooking-game-20261125-0137)

# Sate Senja — Night Market Grill

A complete, original cooking game for the [Make the best cooking game](https://make.fun/c/best-cooking-game-20261125-0137) bounty ($250 total, top 10 share it).

You run a satay stall at a night market. Tickets come in on the order board — each one wants 1–3 skewers (Ayam, Sapi, Tahu, Sayur) with one sauce (Kacang, Kecap, Sambal). Grab a raw skewer off the counter, grill it on the charcoal until it hits the golden window, plate it, pour the sauce, and serve before the customer's patience runs out. A correct plate pays 20 coins plus a tip for the patience left; a wrong plate costs 5 and scares the customer. Three walk-offs, or missing the shift's coin target when the clock hits zero, closes the stall. Win the shift and the next day comes faster, with more tickets and a bigger target.

## Play

- `node serve.ts`, then open <http://localhost:8080> in desktop Chrome.
- Mouse: click a tray (or press `1`–`4`) to grab a skewer, click a grill slot to cook it, click a golden skewer to plate it, click a sauce bowl (`Q`/`W`/`E`) then the plate to sauce it, click SERVE (or `Space`) to serve the selected ticket. Click a ticket to choose which one to serve. `P` pauses, `M` mutes.
- The game is static files under `game/` — no build step, no network requests, all art drawn in code and all sound synthesised.

## Files

- `game/` — the game: `index.html` plus `src/` split by job (`config.js` layout and tuning, `recipes.js` menu and tickets, `world.js` rules, `input.js` mouse and keys, `audio.js` synth, `render.js` all drawing, `shots.js` staged screenshots, `main.js` boot and loop).
- `screenshots/` — 4 real renders of the game's own code in headless Chrome: the busy stall (cover), the title screen, a plate ready to serve, and the shift summary.
- `main.ts` — the entry point: copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with `buildDossier` from `vendor/makefun-game.ts`.
- `serve.ts` — a tiny static server for local playtesting.

## License

MIT — see [LICENSE](LICENSE).
