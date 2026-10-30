# Core Gameplay — Plan Brief

> Full plan: `context/changes/core-gameplay/plan.md`

## What & Why

Build the actual Ridiculous Routes game: players plan a ship route with waypoints and per-leg speeds, watch it sail, and get stars or a game-over reason. The goal is for new employees with no shipping background to learn, by playing, that good routing balances cost, time, safety and emissions.

## Starting Point

Phaser 3 + TypeScript + Vite app with a finished HTML start screen, a level select that has one hardcoded card, and empty Planning, Sailing, Results and Game-over scenes. The world map (`map3.svg`) is currently stretched to 16:9. There's no test runner.

## Desired End State

Levels 1–7 sit on the world map with stars and lock states. Each level zooms into a region where the player edits a route (click, drag, right-click to delete, undo) and sees live meters for budget, time and CO₂ against limits and targets. Wind, storms, regulated areas (ECAs) and currents are drawn on the map. Pressing Go replays a simulated voyage, ending in Results (1–3 stars) or Game Over (one-line reason) with Retry. Level 1 is a 5-step tutorial where each step waits for the player's action. Progress is saved in localStorage.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Level maps | Zoomed regions of the shared world map | One art asset; markers fit naturally on the level select map |
| Land detection | Land mask PNG baked offline from `#continents .st1`, plus a distance field | Matches the art exactly, can be tested in Node, and handles both crossing land and nearness to the coast |
| Coordinates | World units = SVG viewBox; map rasterised at 3× | Fixes the aspect stretch and stays sharp when zoomed |
| Engine | Pure TypeScript `simulate()` → timeline; sailing just replays it | One source of truth for live estimates, playback and tests |
| UI tech | HTML HUD layer (300 px sidebar); Phaser for map, route and ship | Follows the start-screen pattern; crisp text that's easy to translate |
| Planning feedback | Land crossing blocks Go; over budget or late only turns meters red; storm danger shown only on the map | Players learn by failing, with no tips |
| Tutorial | Level 1, 5 steps, each waiting for the player's action | "One idea per screen, try it straight away" |
| Units | k€, days/hours, tonnes CO₂ | Builds intuition for real shipping |
| Scope | Full game, levels 1–7 | Covers all five learning goals |
| Tests | Vitest for the engine, plus reference-route tests for each level | Balance changes can't silently break levels |

## Scope

**In scope:** engine (speed, wind, currents, ECA, coastal-wind failure, budget and deadline, stars), route editing with undo, hazard rendering and legend, planning and sailing HUDs, Results and Game-over overlays, level select with progression, intro cards, tutorial, levels 1–7, saved progress, `?debug=1` authoring overlay.

**Out of scope:** fuel meter, ports and refuelling, ship types, tips and facts, branding, Finnish translation (strings stay separate so it can be added), sound, touch-specific controls, route auto-suggest, backend.

## Architecture / Approach

`src/game/` (pure TS: world, landField, geometry, environment, simulate, scoring, planningState, progress, tutorial, levels/*) ← used by `src/scenes/` (Phaser: map, hazards, route, ship) and `src/ui/hud/` (HTML views in a new `#hud-layer`, scaled to 1280×720). Scenes own the state; HUD views emit intents. All numbers live in `tuning.ts`; all text lives in `i18n/en.ts`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Foundations | Vitest, land mask and distance field, world coordinates and aspect fix, level schema, progress store, HUD layer, debug overlay | Land mask and art misaligned |
| 2. Simulation engine | Tested `simulate`/`validateRoute`/stars | Formulas feel wrong; fixed later via tuning |
| 3. Map and route editing | Interactive route editor plus hazard rendering | Click and drag accuracy at different zoom levels |
| 4. Planning HUD | Live meters, speed controls, legend, Undo/Go | DOM and canvas input conflicts |
| 5. Sail, Results, Game Over | Playback, end screens, Retry, saved stars | Playback not matching the estimate |
| 6. Level select and progression | Markers on the world map, locks, intro cards | — |
| 7. Tutorial | 5 steps, each waiting for the player's action | Step conditions too strict or too loose |
| 8. Levels 2–7 and balancing | Authored levels plus validity tests | Balancing time |

**Prerequisites:** existing app runs (`npm run dev`); ability to add npm devDeps (`vitest`, `@resvg/resvg-js`, `pngjs`).
**Estimated effort:** about 6–9 focused sessions; phases 1–5 make the game playable, 6–8 complete it.

## Open Risks & Assumptions

- The physics constants are first guesses; they will need tuning in phase 8 (all of them are in `tuning.ts`).
- Very small islands may be only a few pixels wide in the mask (2 px per world unit); ports and straits should be placed with `?debug=1`.
- A 3077×2080 map texture assumes a WebGL max texture size of at least 4096, which is true on all modern desktops.
- The tutorial needs a suitable small region of the existing map with an island, a strait and space for an ECA.

## Success Criteria (Summary)

- A new player finishes the level 1 tutorial without outside help and understands each of the five ideas.
- Every level can be 3-starred with its intended trade-off, while the naïve shortest route can't (enforced by tests).
- Full playthrough 1→7 works from a fresh profile, with stars kept after a reload.
