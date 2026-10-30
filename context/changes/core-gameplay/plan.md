# Core Gameplay Implementation Plan

## Overview

Turn the existing start screen + scene stubs into the full Ridiculous Routes game: plan a route with waypoints and per-leg speeds, see live cost/time/emission estimates, sail it, and get a star rating or a one-line game-over reason. Includes wind/storms, emission control areas (ECAs), ocean currents, a gated level 1 tutorial, levels 1–7 placed on the world map, and saved progress.

## Current State Analysis

- Stack: Phaser 3.87 + TypeScript (strict) + Vite, 1280×720, `Scale.FIT` ([src/config/gameConfig.ts](../../../src/config/gameConfig.ts)).
- Start screen is an HTML overlay mounted into `#ui-overlay` via `container.replaceChildren(...)` ([src/ui/startScreen.ts](../../../src/ui/startScreen.ts)); `#ui-overlay` has `pointer-events: none` with panels opting in ([src/ui/startScreen.css](../../../src/ui/startScreen.css)).
- `LevelSelectScene` shows one hardcoded Level 1 card; `PlanningScene` shows only the map + title; `SailingScene`, `ResultsScene`, `GameOverScene` are empty stubs.
- i18n: `t()` returns a typed `en` dictionary ([src/i18n/en.ts](../../../src/i18n/en.ts)); already has keys for meters, speeds, undo/go/retry and three game-over reasons.
- Map: [public/assets/images/map3.svg](../../../public/assets/images/map3.svg), viewBox `1025.6×693.4`, loaded as a 1280×720 texture in `BootScene` — i.e. currently **stretched** (aspect 1.48 → 1.78). Land = `#continents > path.st1` (filled `#006838`, ~143 paths); `path.st0` are stroke-only outlines. The ocean group references `#continents` via `<use>` for coastal shelves.
- No test runner, no lint script. `npm run build` = `tsc && vite build`.

## Desired End State

A player can: Play → pick an unlocked level on the world map (stars shown) → read a one-card intro of the level's new element → plan a route on a zoomed region of the map (ports, waypoints, drag, right-click delete, undo, per-leg Slow/Normal/Fast) with live meters against limits/targets → press Go and watch the ship sail with meters ticking → land on a Results overlay (1–3 stars, values vs targets) or a Game-over overlay (one-line reason + Retry). Best stars persist across reloads; levels unlock sequentially. Level 1 walks through 5 gated tutorial steps. Levels 1–7 exist, each verified by an automated reference-route test.

Verify: `npm test` (engine + level validity), `npm run build`, and the manual playthrough in Testing Strategy.

### Key Discoveries:

- `mountStartScreen` calls `container.replaceChildren(wrapper)` on `#ui-overlay` — any new HUD must use its own sibling layer or it will wipe/be wiped by the start screen (src/ui/startScreen.ts).
- Back-to-title in `LevelSelectScene` starts `BOOT` and dispatches `show-start-screen` — keep that contract (src/scenes/LevelSelectScene.ts, src/main.ts).
- `BootScene.create()` never transitions; the start screen's PLAY triggers `LEVEL_SELECT`. Assets must be fully loaded (incl. land mask) before PLAY can be meaningful — Boot is the right place.
- Land is only `.st1` fills; `.st0` is stroke-only and must be excluded from the mask.

## What We're NOT Doing

- Fuel meter, ports/refuelling, ship types, "did you know" facts, post-loss tips, logos (spec §11).
- Finnish translation (only keep all strings in `en.ts` so it's addable).
- Sound/music, mobile/touch-specific controls, accessibility beyond keyboard focus on HTML buttons.
- Automatic route suggestion / pathfinding for the player.
- Backend, accounts, leaderboards.
- Replacing or restyling the start screen.

## Implementation Approach

1. **Pure engine, thin scenes.** All game rules live in `src/game/` as framework-free TypeScript (geometry, land field, simulation, scoring, progress) so they can be unit-tested with Vitest. Phaser scenes only render and route input; HTML views only display state and emit intents.
2. **World coordinates = SVG viewBox units** (0..1025.6 × 0..693.4). The map texture is rasterised at 3× and displayed at scale 1/3, so world units map 1:1 to Phaser world space. Each level defines a viewport rect; the camera zooms to it. This removes the current stretch.
3. **Baked land mask.** A Node script rasterises only `#continents path.st1` to a binary PNG (2 px per world unit). Runtime and tests decode the same PNG and compute a distance-to-land field, used for both "cannot cross land" and "strong wind near land".
4. **Simulate on Go, replay while sailing.** The engine produces a `VoyageResult` (sample timeline with cumulative metrics + optional failure at sample index). Planning uses the same function for live estimates; Sailing animates the timeline; failure/finish is just the end of the timeline.
5. **HTML HUD in a dedicated layer** (`#hud-layer`, a 1280×720 element CSS-scaled to the stage) with a 300 px right sidebar; Phaser map camera viewport = left 980×720.

## Critical Implementation Details

**Coordinate mapping.** Three spaces exist: world units (SVG viewBox), mask pixels (world × 2), and screen (camera). Keep conversion in one module (`src/game/world.ts`) and never convert ad hoc in scenes. Pointer → world must use `camera.getWorldPoint(pointer.x, pointer.y)`, and clicks inside the HUD sidebar (x ≥ 980 in game space) must be ignored by the map.

**Engine contract (other phases depend on it).**

```ts
type Speed = 'slow' | 'normal' | 'fast';
interface Vec { x: number; y: number }           // world units
interface Route { points: Vec[]; speeds: Speed[] } // speeds.length === points.length - 1; points[0]=start port, last=end port
interface Sample { pos: Vec; legIndex: number; costK: number; hours: number; co2T: number } // cumulative
type FailReason = 'land' | 'coastalWind' | 'overBudget' | 'missedDeadline';
interface VoyageResult {
  samples: Sample[];
  totals: { costK: number; hours: number; co2T: number };
  failure?: { reason: FailReason; sampleIndex: number };
  stars: 0 | 1 | 2 | 3;
}
function simulate(level: LevelDef, route: Route, land: LandField): VoyageResult;
function validateRoute(level: LevelDef, route: Partial<Route>, land: LandField): { blockedLegs: number[]; blockedPoints: number[] };
```

**Per-step physics** (step ≈ 2 world units along each leg; `NM_PER_UNIT ≈ 20`):
- Base speeds (kn): slow 12, normal 16, fast 20 → speed factor 0.6 / 1.0 / 1.6 (≈ v²), from spec §4.
- `along = dot(windVec + currentVec, legDir)` (kn, positive = tail). `effSpeed = max(4, v + 0.5·along_wind + 1.0·along_current)`; `hours += nm / effSpeed`.
- `cost += nm · speedFactor · FUEL_K_PER_NM · ecaPrice · (1 − 0.02·along_wind_clamped)`; `co2 += nm · speedFactor · CO2_T_PER_NM · ecaEmission · (same wind term)`. Inside ECA: `ecaPrice = 1.5`, `ecaEmission = 0.5`.
- Fail `coastalWind` when wind strength at sample ≥ `strong` AND `distToLand < COAST_DANGER_UNITS` (≈ 6). Fail `overBudget` at first sample where `cost > level.budgetK`; `missedDeadline` at first sample where `hours > level.deadlineH`. First failure in path order wins.
- Stars: failure → 0; else 1, +1 if `cost ≤ costTargetK`, +1 more only if also `co2 ≤ co2TargetT`.
All constants live in `src/game/tuning.ts` so balancing never touches logic.

**State sequencing in planning.** Undo stores full route snapshots pushed *before* each mutation (add/insert/move-end/delete/speed change), not per drag frame — push on `dragstart`, not on `drag`.

**SVG texture size.** 3× rasterisation = 3077×2080, under the 4096 WebGL limit; do not go higher.

---

## Phase 1: Foundations

### Overview

Tooling, coordinate system, land mask, level data schema, progress store, HUD layer — everything later phases build on, with no gameplay yet.

### Changes Required:

#### 1. Tooling

**File**: `package.json`, `vitest.config.ts` (new)

**Intent**: Add Vitest for engine tests and the land-mask bake script.

**Contract**: devDeps `vitest`, `@resvg/resvg-js`, `pngjs`, `@types/pngjs`. Scripts: `"test": "vitest run"`, `"bake:mask": "node scripts/bake-land-mask.mjs"`, `"typecheck": "tsc --noEmit"`. Vitest environment `node`, includes `src/**/*.test.ts`.

#### 2. Land mask bake

**File**: `scripts/bake-land-mask.mjs` (new), `public/assets/images/land-mask.png` (generated, committed)

**Intent**: Produce a deterministic binary land raster matching the art.

**Contract**: Reads `map3.svg`, keeps only `<g id="continents">` children with `class="st1"`, forces fill black on white, no strokes/ocean; renders with resvg at width `round(1025.6 × 2)`. Output PNG where dark pixel = land. Re-run whenever `map3.svg` land changes.

#### 3. World + land field

**File**: `src/game/world.ts`, `src/game/landField.ts` (new), `src/game/landField.test.ts`

**Intent**: Single source of truth for world size/coordinate conversion and land queries.

**Contract**: `WORLD = { width: 1025.6, height: 693.4, maskScale: 2 }`. `LandField` built from `(width, height, Uint8Array isLand)`; exposes `isLand(p: Vec)`, `distToLand(p: Vec): number` (world units, via two-pass chamfer distance transform at build), `segmentHitsLand(a, b): boolean` (sample every 0.5 units). Loader helpers: `landFieldFromImageData(ImageData)` (browser) and test helper `loadLandFieldFromPng(path)` (pngjs). Out-of-bounds counts as land.

#### 4. Geometry helpers

**File**: `src/game/geometry.ts` (new) + test

**Intent**: Vector math, point-in-polygon, distance-to-segment (for leg hit-testing), polyline sampling.

**Contract**: pure functions on `Vec`; polygons are `Vec[]`.

#### 5. Level schema

**File**: `src/game/levels/types.ts`, `src/game/levels/index.ts` (new)

**Intent**: Typed, data-only level definitions.

**Contract**:
`LevelDef { id: number; titleKey; introKey; viewport: {x,y,w,h} (16:9-ish matching 980×720); start: Vec; end: Vec; startName/endName keys; budgetK; deadlineH; costTargetK; co2TargetT; windZones: WindZone[]; ecas: Vec[][]; currents: CurrentZone[]; allowedSpeeds?: Speed[]; tutorial?: TutorialStepId[]; referenceRoute: Route }`
`WindZone { polygon: Vec[]; dir: Vec (unit); knots: number; strength: 'light'|'strong'|'storm' }`
`CurrentZone { polygon: Vec[]; dir: Vec; knots: number }`.
`index.ts` exports ordered `LEVELS: LevelDef[]` and `getLevel(id)`. Phase 1 ships only a placeholder level 1 (start/end + reference route) so later phases can run.

#### 6. Progress store

**File**: `src/game/progress.ts` (new) + test

**Intent**: Persist best stars and compute unlocks.

**Contract**: localStorage key `ridiculous-routes:progress:v1` → `{ stars: Record<number, 0|1|2|3>; tutorialDone: boolean }`. `getStars(id)`, `recordResult(id, stars)` (keeps max), `isUnlocked(id)` (id 1 always; else stars(id-1) ≥ 1). Corrupt/missing JSON → defaults. Storage injected for tests.

#### 7. Map texture + aspect fix

**File**: `src/scenes/BootScene.ts`, `src/scenes/LevelSelectScene.ts`, `src/scenes/PlanningScene.ts`

**Intent**: Load map at 3× native aspect, load land mask and build the `LandField` once (store in `this.registry` under `'landField'`); render the map in world units and fit cameras instead of stretching.

**Contract**: `load.svg('world-map', ..., { width: 3077, height: 2080 })`, displayed at `setOrigin(0).setScale(1/3)`. Shared helper `addWorldMap(scene)` in `src/scenes/mapView.ts`. Level select camera fits full world height with ocean-coloured background filling the side margins.

#### 8. HUD layer

**File**: `index.html`, `src/ui/hud/hudLayer.ts`, `src/ui/hud/hud.css` (new)

**Intent**: A dedicated DOM layer for game UI that never collides with the start screen.

**Contract**: `<div id="hud-layer">` sibling of `#ui-overlay` (below it in z-order). Inner fixed 1280×720 box scaled with CSS `transform: scale(stageWidth/1280)` via `ResizeObserver`. API: `mountView(view: HTMLElement): () => void` (returns unmount); scenes unmount on `shutdown`. `pointer-events: none` on layer, `auto` on panels.

#### 9. Debug overlay

**File**: `src/scenes/debugOverlay.ts` (new)

**Intent**: Level authoring aid, enabled with `?debug=1`: shows cursor world coordinates, tints land mask, outlines zones, draws reference route.

**Contract**: no effect without the query param.

### Success Criteria:

#### Automated Verification:

- `npm run bake:mask` produces `public/assets/images/land-mask.png`
- `npm test` passes (landField, geometry, progress tests — incl. a known ocean point is water, a known continent point is land, distance field monotonic away from coast)
- `npm run build` succeeds

#### Manual Verification:

- Level select map is no longer stretched (islands keep shape vs. the SVG opened in a browser)
- `?debug=1` shows world coordinates and the land tint aligns with the drawn coastline at full zoom
- Start screen still works: PLAY → level select → Back to Title → PLAY

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 2.

---

## Phase 2: Simulation Engine

### Overview

Implement the rules from Critical Implementation Details as pure, tested functions.

### Changes Required:

#### 1. Tuning constants

**File**: `src/game/tuning.ts` (new)

**Intent**: All numeric knobs in one place.

**Contract**: `SPEED_KN`, `SPEED_FACTOR`, `NM_PER_UNIT`, `FUEL_K_PER_NM`, `CO2_T_PER_NM`, `ECA_PRICE`, `ECA_EMISSION`, `WIND_SPEED_GAIN`, `CURRENT_SPEED_GAIN`, `WIND_COST_GAIN`, `COAST_DANGER_UNITS`, `STEP_UNITS`, `MIN_EFF_SPEED`. Wind strength → knots defaults: light 10, strong 25, storm 40.

#### 2. Environment sampling

**File**: `src/game/environment.ts` (new) + test

**Intent**: Query wind, current and ECA at a world point.

**Contract**: `environmentAt(level, p) → { wind: Vec /*kn*/, windStrength: 'none'|'light'|'strong'|'storm', current: Vec, inEca: boolean }`. Overlapping zones: strongest wind wins; currents add.

#### 3. Simulation + validation + stars

**File**: `src/game/simulate.ts`, `src/game/scoring.ts` (new) + tests

**Intent**: Produce `VoyageResult` and route validity per contract above.

**Contract**: as in Critical Implementation Details. `simulate` on a route that crosses land returns `failure.reason = 'land'` at first land sample (defensive; UI blocks it earlier). Incomplete route (no end) → `simulateEstimate` returns partial totals for the legs drawn, no failure, used for live meters.

### Success Criteria:

#### Automated Verification:

- `npm test` passes, covering at least:
  - Straight open-water leg: cost/time/CO₂ match hand-computed values for each speed
  - Slow vs Fast on same route: slow is cheaper and lower CO₂, longer time
  - Tailwind lowers time and cost; headwind raises both
  - ECA: same route inside ECA costs 1.5× and emits 0.5×
  - Strong wind near land → `coastalWind` failure; same wind in open sea → no failure
  - Budget/deadline failure at the correct sample index; earliest failure wins
  - Star thresholds (0/1/2/3, including "under CO₂ target but over cost target" = 1 star)
- `npm run build` succeeds

#### Manual Verification:

- None (engine only)

---

## Phase 3: Map & Route Editing

### Overview

Rewrite `PlanningScene` into an interactive level map with route editing and hazard rendering.

### Changes Required:

#### 1. Planning state

**File**: `src/game/planningState.ts` (new) + test

**Intent**: Framework-free route editor model with undo, so interaction logic is testable.

**Contract**: `PlanningState` with `route`, `stage: 'pickStart' | 'drawing' | 'complete'`, `selectedLeg`, `undoStack`. Operations: `clickStart()`, `addWaypoint(p)`, `clickEnd()`, `insertWaypoint(legIndex, p)`, `moveWaypoint(i, p)` (+ `beginMove(i)` to push undo), `deleteWaypoint(i)` (ports not deletable; deleting merges speeds of the two legs to the first leg's speed), `setLegSpeed(i, speed)`, `setAllSpeeds(speed)`, `undo()`, `reset()`. Emits change events. New legs default to `normal` (or the level's single allowed speed).

#### 2. Scene interaction

**File**: `src/scenes/PlanningScene.ts`, `src/scenes/routeView.ts` (new)

**Intent**: Map input → state operations; render route.

**Contract**:
- Camera viewport `(0,0,980,720)`, zoom/centre from `level.viewport`; disable browser context menu.
- Left-click on start port → `clickStart`; on water while drawing → `addWaypoint`; on end port → `clickEnd`; on a leg when complete → `insertWaypoint`; on a leg label → select leg. Drag a waypoint → move (snap back if released on land). Right-click waypoint → delete.
- Route rendering: legs coloured by speed (slow green, normal blue, fast orange), blocked legs/points red with dashed stroke (from `validateRoute`), selected leg highlighted, small speed label at leg midpoint.
- Hit radii defined in screen pixels (divide by camera zoom).

#### 3. Hazard rendering

**File**: `src/scenes/hazardView.ts` (new)

**Intent**: Make danger visible before sailing.

**Contract**: Wind zones: semi-transparent fill + grid of arrows (length ∝ knots), storms dark purple with animated swirl/lightning tint; ECAs: diagonal hatching in a distinct yellow-green (never green/teal like land/sea); currents: flowing dashed streamlines. Ports: anchor icons with names. All colours exported from `src/ui/palette.ts` and reused by the legend.

### Success Criteria:

#### Automated Verification:

- `npm test` passes (planningState: add/insert/move/delete/undo sequences, undo after drag restores pre-drag position, ports undeletable)
- `npm run build` succeeds

#### Manual Verification:

- Can build a route start → waypoints → end on level 1; legs over land show red
- Drag, right-click delete, insert-on-leg, and Undo all behave; right-click never opens browser menu
- Clicks on the sidebar area never add waypoints
- Hazards are distinguishable from land/sea at a glance

**Implementation Note**: Pause for manual confirmation before Phase 4.

---

## Phase 4: Planning HUD

### Overview

HTML sidebar with live meters, speed controls, legend and actions.

### Changes Required:

#### 1. Planning HUD view

**File**: `src/ui/hud/planningHud.ts`, `src/ui/hud/meter.ts` (new), `hud.css`

**Intent**: Show live estimates vs limits/targets and expose controls.

**Contract**:
- Header: level title + back to level select.
- Meters (bar + value): **Budget** `€ 123k / 150k` with limit marker and cost-target marker; **Time** `5 d 4 h / 7 d` with deadline marker; **Emissions** `412 t CO₂` with target marker. Bar turns amber near and red over a limit/target.
- Speed: three buttons for the selected leg (+ "All legs" toggle); disabled speeds hidden when `allowedSpeeds` set.
- Legend (always visible): land, sea, storm/strong wind, wind arrows, ECA, current, route speeds.
- Buttons: Undo (disabled when stack empty), Go (disabled unless route complete and no blocked legs).
- API: `createPlanningHud(callbacks) → { update(state, estimate), destroy() }`; scene owns state, HUD emits `onSpeed`, `onUndo`, `onGo`, `onBack`.

#### 2. Strings

**File**: `src/i18n/en.ts`

**Intent**: All new text keys (HUD, legend, units, helper hint like "Click the departure port").

**Contract**: new sections `hud`, `legend`, `units`, `hints`; formatters in `src/i18n/format.ts` (`formatCost`, `formatDuration`, `formatCo2`) so units are translatable.

### Success Criteria:

#### Automated Verification:

- `npm run build` succeeds; `npm test` passes (formatters)

#### Manual Verification:

- Meters update live while adding/dragging waypoints and changing speeds
- Over-budget/late estimate shows red but Go stays enabled; land crossing disables Go
- No hardcoded user-facing strings outside `src/i18n/`

**Implementation Note**: Pause for manual confirmation before Phase 5.

---

## Phase 5: Sail, Results, Game Over

### Overview

Play back the simulation and end the voyage.

### Changes Required:

#### 1. Sailing scene

**File**: `src/scenes/SailingScene.ts`, `src/ui/hud/sailingHud.ts` (new)

**Intent**: Animate the ship along `VoyageResult.samples` with meters ticking.

**Contract**: Scene data `{ levelId, route, result }`. Same camera/map/hazards as planning (reuse views), route drawn faded. Ship sprite (simple drawn vector or small generated texture) rotates to heading; playback ~6–10 s regardless of length (scaled), with a 2× fast-forward button. Sailing HUD = read-only meters. On end: `failure` → small effect (shake/splash) then `scene.launch(GAME_OVER)`; else record progress and `scene.launch(RESULTS)`; sailing scene pauses beneath.

#### 2. Results & Game Over

**File**: `src/scenes/ResultsScene.ts`, `src/scenes/GameOverScene.ts`, `src/ui/hud/resultsView.ts`, `src/ui/hud/gameOverView.ts` (new)

**Intent**: Overlay screens per spec §6–7.

**Contract**: Results: animated 1–3 stars, table of cost/time/CO₂ vs limit/target with ✓/✗, buttons Retry (back to planning with previous route preserved), Levels, Next level (if unlocked). Game over: one-line reason from `t().gameOver[reason]` (add `land` key), Retry (route preserved) and Levels. No tips.

#### 3. Retry flow

**File**: `src/scenes/PlanningScene.ts`

**Intent**: Retrying restores the last planned route (players iterate to improve).

**Contract**: Scene data `{ levelId, route? }`.

### Success Criteria:

#### Automated Verification:

- `npm run build` succeeds; `npm test` passes

#### Manual Verification:

- Ship follows the route, heading correct, meters end at the planned estimate
- Each failure type shows the right one-line reason and stops at the right spot
- Retry returns to planning with the same route; stars persist after reload

**Implementation Note**: Pause for manual confirmation before Phase 6.

---

## Phase 6: Level Select & Progression

### Overview

Levels on the world map with stars and locks; per-level intro card.

### Changes Required:

#### 1. Level select

**File**: `src/scenes/LevelSelectScene.ts`, `src/ui/hud/levelSelectView.ts` (new)

**Intent**: Replace the single card with one marker per level, positioned at the centre of each level's viewport on the world map.

**Contract**: Marker shows number, best stars, lock state; hover shows title + new element; locked markers not clickable. Optional faint rectangle showing the level region on hover. Keep header and Back to Title behaviour.

#### 2. Intro card

**File**: `src/ui/hud/introCard.ts` (new)

**Intent**: One short card introducing the level's new element (spec §8 style: one idea, short text) before planning; dismissed with "Set sail planning" button.

**Contract**: Shown on entering a level from level select (not on Retry). Text from `level.introKey`.

### Success Criteria:

#### Automated Verification:

- `npm run build` succeeds; `npm test` passes (unlock logic)

#### Manual Verification:

- Fresh profile: only level 1 unlocked; finishing it unlocks level 2
- Stars on markers match best results

**Implementation Note**: Pause for manual confirmation before Phase 7.

---

## Phase 7: Tutorial (Level 1)

### Overview

Five gated steps on level 1, each with one short card and an action that must be performed.

### Changes Required:

#### 1. Tutorial controller

**File**: `src/game/tutorial.ts` (new) + test, `src/ui/hud/tutorialCard.ts` (new)

**Intent**: State machine driving steps from planning/sailing events.

**Contract**: Steps and completion conditions:
1. `straightRoute` — "Click the departure port, then the arrival port." Done on `clickEnd` with zero waypoints.
2. `waypoints` — "Click a leg to add a waypoint and steer around the island." Done when route is complete with ≥1 waypoint and no blocked legs.
3. `wind` — "Strong winds near land are dangerous. Keep clear of the storm by the strait." Done when the route avoids the tutorial's strong-wind-near-land area (validated with the engine's coastalWind check).
4. `eca` — "The striped area needs cleaner fuel: more cost, fewer emissions." Done when, while this card is shown, a route edit changes whether the route passes through the ECA (enters → avoids or avoids → enters), so the player sees the meters react.
5. `speed` — "Slower is cheaper and cleaner, but takes longer. Try changing a leg's speed." Done on any `setLegSpeed`.
Then normal play: Go. Cards highlight the relevant HUD element/map area. Progress stored as `tutorialDone`; replaying level 1 after completion skips cards (with a "Show tutorial" link).

#### 2. Level 1 content

**File**: `src/game/levels/level1.ts`

**Intent**: Small region with an island between ports, a strait with strong wind, a small ECA, generous budget/deadline.

### Success Criteria:

#### Automated Verification:

- `npm test` passes (tutorial transitions; level 1 reference route gets 3 stars)
- `npm run build` succeeds

#### Manual Verification:

- A first-time player can complete level 1 following only the cards
- Each card shows one idea, and the action is possible immediately

**Implementation Note**: Pause for manual confirmation before Phase 8.

---

## Phase 8: Levels 2–7 & Balancing

### Overview

Author remaining levels per the progression table and lock in balance with tests.

### Changes Required:

#### 1. Level definitions

**File**: `src/game/levels/level2.ts` … `level7.ts`, `src/i18n/en.ts`

**Intent**:
- L2 Islands & narrow straits (shortcut through strait vs around; no wind).
- L3 Wind & storms (tailwind detour beats headwind shortcut; storm by a coast = game over).
- L4 Regulated areas (ECA shortcut: expensive but clean vs long detour: cheap per mile, dirtier).
- L5 Speed & deadlines (tight deadline forces mixing Fast and Slow legs; emissions target forces slow where possible).
- L6 Ocean currents (riding a current saves time/cost).
- L7 Combined, tighter targets.

**Contract**: Each level's `referenceRoute` is a hand-tuned 3-star solution; targets are set so the naïve straight/shortest route earns ≤ 1 star or fails (learning goal 1).

#### 2. Level validity tests

**File**: `src/game/levels/levels.test.ts`

**Intent**: Guard against broken levels when tuning or the map changes.

**Contract**: For every level: ports are on water with `distToLand > 2`; viewport inside world; reference route has no land legs and `simulate` → 3 stars; the straight start→end route (if water-only) gets < 3 stars; at least one alternative reference "bad" route per level fails or scores ≤ 1 (asserting the lesson). Uses the baked PNG.

### Success Criteria:

#### Automated Verification:

- `npm test` passes (all level validity tests)
- `npm run build` succeeds

#### Manual Verification:

- Each level's new element is understandable from its intro card + map alone
- Full playthrough 1→7 feels fair: 1 star is easy, 3 stars require the intended trade-off
- Meter numbers look plausible (k€, days, tonnes)

---

## Testing Strategy

### Unit Tests:

- geometry, landField (distance field, segment crossing, out-of-bounds), environment (zone overlap), simulate (each mechanic in isolation + failure ordering), scoring, planningState (undo semantics), progress (corrupt storage), tutorial transitions, formatters.

### Integration Tests:

- `levels.test.ts`: every level solvable to 3 stars with its reference route, and naïve routes don't get 3 stars — using the real baked land mask.

### Manual Testing Steps:

1. Fresh browser profile → PLAY → only level 1 unlocked.
2. Complete the tutorial; verify each card gates on its action.
3. Build a route over land → red leg, Go disabled.
4. Set all Fast, exceed budget → red meter, Go allowed → game over "over budget" mid-voyage.
5. Route through storm near a coast → "Strong winds pushed the ship onto the coast."
6. Retry → same route restored; fix it → Results with stars; reload page → stars kept, next level unlocked.
7. Resize window → HUD and map stay aligned and crisp.

## Performance Considerations

- Distance transform over ~2051×1387 cells runs once at boot (expect < 100 ms); cache in registry.
- Live estimate re-runs `simulate` on every edit; with step 2 units and < 20 legs this is a few thousand samples — fine per pointer-move, but throttle drag updates to `requestAnimationFrame`.
- Map texture 3077×2080 (~25 MB GPU) — loaded once.

## Migration Notes

- Root [IMPLEMENTATION_PLAN.md](../../../IMPLEMENTATION_PLAN.md) remains as the record of the start-screen work; this plan supersedes it for gameplay.
- `land-mask.png` must be re-baked if `map3.svg` land shapes change; `levels.test.ts` will catch drift.

## References

- Game design brief: provided in the planning conversation (concept, mechanics, scoring, screens, tutorial, progression).
- Existing patterns: [src/ui/startScreen.ts](../../../src/ui/startScreen.ts) (HTML overlay), [src/i18n/index.ts](../../../src/i18n/index.ts) (strings), [src/scenes/LevelSelectScene.ts](../../../src/scenes/LevelSelectScene.ts) (scene structure).

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Foundations

#### Automated

- [x] 1.1 `npm run bake:mask` produces `public/assets/images/land-mask.png` — d397009
- [x] 1.2 `npm test` passes (landField, geometry, progress tests) — d397009
- [x] 1.3 `npm run build` succeeds — d397009

#### Manual

- [ ] 1.4 Level select map is no longer stretched
- [ ] 1.5 `?debug=1` shows world coordinates and land tint aligns with coastline
- [ ] 1.6 Start screen flow still works

### Phase 2: Simulation Engine

#### Automated

- [x] 2.1 `npm test` passes with engine coverage (speeds, wind, ECA, coastal wind, budget/deadline, stars) — 8f866aa
- [x] 2.2 `npm run build` succeeds — 8f866aa

### Phase 3: Map & Route Editing

#### Automated

- [x] 3.1 `npm test` passes (planningState) — 69d06a4
- [x] 3.2 `npm run build` succeeds — 69d06a4

#### Manual

- [ ] 3.3 Can build a route; land legs show red
- [ ] 3.4 Drag, right-click delete, insert-on-leg, Undo behave; no browser context menu
- [ ] 3.5 Sidebar clicks never add waypoints
- [ ] 3.6 Hazards distinguishable from land/sea

### Phase 4: Planning HUD

#### Automated

- [x] 4.1 `npm run build` succeeds; `npm test` passes (formatters) — 6243a3e

#### Manual

- [ ] 4.2 Meters update live while editing
- [ ] 4.3 Over-limit shows red but Go enabled; land crossing disables Go
- [ ] 4.4 No hardcoded user-facing strings outside `src/i18n/`

### Phase 5: Sail, Results, Game Over

#### Automated

- [x] 5.1 `npm run build` succeeds; `npm test` passes

#### Manual

- [ ] 5.2 Ship follows route; meters end at planned estimate
- [ ] 5.3 Each failure type shows correct reason at correct spot
- [ ] 5.4 Retry restores route; stars persist after reload

### Phase 6: Level Select & Progression

#### Automated

- [ ] 6.1 `npm run build` succeeds; `npm test` passes (unlock logic)

#### Manual

- [ ] 6.2 Fresh profile: only level 1 unlocked; finishing it unlocks level 2
- [ ] 6.3 Marker stars match best results

### Phase 7: Tutorial (Level 1)

#### Automated

- [ ] 7.1 `npm test` passes (tutorial transitions; level 1 reference route 3 stars)
- [ ] 7.2 `npm run build` succeeds

#### Manual

- [ ] 7.3 First-time player completes level 1 using only the cards
- [ ] 7.4 Each card shows one idea and the action is immediately possible

### Phase 8: Levels 2–7 & Balancing

#### Automated

- [ ] 8.1 `npm test` passes (all level validity tests)
- [ ] 8.2 `npm run build` succeeds

#### Manual

- [ ] 8.3 Each level's new element understandable from intro card + map
- [ ] 8.4 Full playthrough 1→7 feels fair
- [ ] 8.5 Meter numbers look plausible
