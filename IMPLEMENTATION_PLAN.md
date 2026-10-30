# Implementation Plan: "Ridiculous Routes" — Start Screen & Game Foundation

## 1. Overview
Build the project foundation and Starting Screen for **Ridiculous Routes**, a nautical route-optimisation puzzle game where players balance **cost, time, safety, and emissions**.

### Key Decisions
- **Tech Stack:** Phaser 3 + TypeScript + Vite
- **Viewport & Scaling:** `1280×720` (16:9 Landscape) with responsive `Phaser.Scale.FIT` and centered alignment
- **Start Screen Architecture:** Custom HTML + CSS overlay (with user-provided background image and styled PLAY button) layered cleanly over the game container, transitioning into Phaser scenes when **PLAY** is clicked
- **Controls on Start Screen:** Minimal — Title and **PLAY** button only
- **Localization (`i18n`):** All user-facing text separated into a dedicated dictionary (`src/i18n/en.ts`) so translations (e.g. Finnish) can be added without touching game logic
- **Branding:** No company branding or logos

---

## 2. Project Structure

```text
ridiclous-routes/
├── index.html                  # App entry HTML + Start Screen overlay container
├── package.json                # Dependencies (phaser, typescript, vite)
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite bundler & dev server config
├── public/
│   └── assets/
│       └── images/
│           ├── start-bg.png    # Stormy sea cargo ship start screen background
│           └── map3.svg        # Imaginary world map with custom ocean & coastal shoals
└── src/
    ├── main.ts                 # App entrypoint: initializes Start Screen UI & Phaser Game
    ├── config/
    │   └── gameConfig.ts       # Phaser 3 configuration (1280x720, 16:9, Scale.FIT, scenes)
    ├── i18n/
    │   ├── index.ts            # Localization helper (t() lookup, active locale switcher)
    │   └── en.ts               # English string dictionary (separated from code)
    ├── ui/
    │   ├── startScreen.ts      # Start Screen DOM controller (mounts HTML, binds PLAY click)
    │   └── startScreen.css     # User-provided CSS for the Start Screen & PLAY button
    └── scenes/
        ├── sceneKeys.ts        # Centralized Phaser scene key constants
        ├── BootScene.ts        # Preloads shared assets (start-bg.png, map3.svg)
        ├── LevelSelectScene.ts # World map level selection screen over map3.svg
        ├── PlanningScene.ts    # Route planning screen over map3.svg
        ├── SailingScene.ts     # Animated ship sailing screen stub
        ├── ResultsScene.ts     # Star rating summary screen stub
        └── GameOverScene.ts    # One-line failure reason + Retry button stub
```

---

## 3. Implementation Phases & Progress

### Phase 1: Project Scaffolding (Vite + Phaser 3 + TypeScript) — ✅ Completed
1. [x] Initialized `package.json` with `phaser` (`^3.87.0`), `typescript`, and `vite`.
2. [x] Created `tsconfig.json` and `vite.config.ts` configured for ES module bundling and static asset serving from `public/`.
3. [x] Set up `index.html` with a responsive 16:9 stage wrapper (`#app-stage`) containing:
   - `#game-container` (Phaser canvas mount point)
   - `#ui-overlay` (HTML/CSS Start Screen mount point synced to the 16:9 aspect ratio)

### Phase 2: Localization (`i18n`) Foundation — ✅ Completed
1. [x] Created `src/i18n/en.ts` containing structured keys for:
   - Start screen (`titleLine1`, `titleLine2`, `playButton`)
   - Level select (`heading`, `subtitle`, `level1Title`, `level1Subtitle`, `backToTitle`)
   - Core meters (`budget`, `time`, `emissions`)
   - Speed controls (`slow`, `normal`, `fast`)
   - Action buttons (`undo`, `go`, `retry`)
   - Game-over messages (`coastalWind`, `overBudget`, `missedDeadline`)
2. [x] Created `src/i18n/index.ts` exporting `t()`, ` getLocale()`, and `setLocale()` helpers so both HTML UI and Phaser scenes read from the same source of truth.

### Phase 3: HTML + CSS Start Screen Integration — ✅ Completed
1. [x] Placed the stormy sea cargo ship background image at `public/assets/images/start-bg.png`.
2. [x] Integrated the user-provided HTML structure and CSS for `.title` and `.play-button` into `src/ui/startScreen.ts` and `src/ui/startScreen.css`.
3. [x] Populated text labels via the `i18n` module (`RIDICULOUS`, `ROUTES`, `PLAY`).
4. [x] Wired up the **PLAY** button interaction:
   - Smooth fade-out transition (`.is-hidden`).
   - Triggers the Phaser scene transition to `LevelSelectScene` (and supports returning via `show-start-screen` event).

### Phase 4: Phaser Scene Router & Placeholder Target — ✅ Completed
1. [x] Configured `src/config/gameConfig.ts` with `1280×720` resolution, `Phaser.Scale.FIT`, `Phaser.Scale.CENTER_BOTH`, and scene registration.
2. [x] Implemented `BootScene.ts` to preload `start-bg.png` and `map3.svg`.
3. [x] Implemented `LevelSelectScene.ts` displaying the world map background, header banner, Level 1 card with star rating preview, and navigation to `PlanningScene` or back to the Start Screen.
4. [x] Created scene stubs for `PlanningScene`, `SailingScene`, `ResultsScene`, and `GameOverScene`.

### Phase 5: Imaginary World Map (`map3.svg`) & Ocean Styling — ✅ Completed
1. [x] Added `public/assets/images/map3.svg` containing the imaginary continents (`#continents`).
2. [x] Built a multi-layered illustrated ocean background (`#ocean-background`) behind the continents:
   - Nautical teal-blue linear gradient (`#oceanGradient`) and deep basin radial gradients.
   - Painterly undulating swell ribbons and a repeating faint wave texture pattern (`#oceanWavePattern`) with double-crest ripples.
   - Reduced, non-uniform coastal shallow-water areas (`#nonUniformShoalsMask`, asymmetric sandbar patches, and broken dashed coastal shelves) so shallow shoals appear organically in bays and archipelagos rather than as a uniform border.
3. [x] Rendered `map3.svg` at full `1280×720` widescreen in `LevelSelectScene` and `PlanningScene`.

---

## 4. Verification & Acceptance Criteria
- [x] `npm install && npm run dev` starts the local Vite server without errors.
- [x] `npm run build` compiles TypeScript and bundles assets cleanly.
- [x] The Start Screen renders the user's custom HTML + CSS + background image accurately in a 16:9 viewport (`1280×720`) and scales cleanly when the browser window resizes.
- [x] All visible text is pulled from `src/i18n/en.ts` (no hardcoded UI strings in scene/component logic).
- [x] Clicking **PLAY** hides the Start Screen and transitions directly into the Phaser `LevelSelectScene` with the styled `map3.svg` ocean and continents.
