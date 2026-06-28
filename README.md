
   # Conway Game (React + TypeScript)

   Conway Game is a compact Vite + React TypeScript implementation of Conway's Game of Life. The repository emphasizes an efficient grid representation (`Uint8Array`), canvas-based rendering with HiDPI support, and small, focused utilities for pattern application and game stepping.

   ## Key highlights

   - Canvas-based rendering with devicePixelRatio support for crisp visuals on high-DPI displays.
   - Memory-efficient grid stored as a `Uint8Array` with simple `x,y` → `index` helpers.
   - `GridManager` provides deterministic implementations for Conway steps, random soup generation, and simple toggle algorithms.
   - Pattern library in `src/figures.ts` and a lightweight UI for applying and dragging patterns onto the grid.
   - Designed for experimentation, teaching, and incremental improvements.

   ## Features

   - Interactive drawing: toggle cells with mouse or touch input.
   - Predefined patterns (glider, block, blinker, etc.) with icons and drag-to-place support.
   - Autoplay with configurable interval and play/pause controls.
   - Viewport-aware rendering for large grids and performance-friendly redraws.
   - Simple export/import of patterns via JSON copy/paste from the UI.

   ## Demonstration

You can find a demo video here: [https://www.youtube.com/watch?v=f4p7RBu0-4o]

   ## Tech stack

   - React + TypeScript
   - Vite for dev server and build
   - HTML Canvas for rendering
   - ESLint + TypeScript tooling for dev checks

   ## Prerequisites

   - Node.js 18+ and npm
   - A modern browser for development (Chrome/Edge/Firefox)
   - Useful commands: `npm ci`, `npm run dev`, `npm run build`

   ## Quick start

   1. Clone the repository:
      
      `git clone https://github.com/E-Rossignol/conway_game.git`

   2. Install dependencies:
      - `cd conway_game`
      - `npm ci`

   3. Run the dev server:
      `npm run dev`

   4. Build for production:
      `npm run build`

   5. Visualize the app:
      app available on 
      
      `http://localhost:5173/`


   Common scripts in `package.json`:

   ```bash
   npm run dev     # start vite dev server
   npm run build   # build production bundle (runs tsc -b && vite build)
   npm run preview # locally preview production build
   npm run lint    # run the linter
   ```

   ## Developer utilities

   - Encryption helper and DB helper located under `lib/constants/`.
   - Run static analysis and tests:
       - `npm run lint`
       - `npm run build`
   - Useful dev logs: run the Vite server with `npm run dev` and open the browser console.

   ## Important files and structure

   - `src/App.tsx` — main React component (canvas rendering, controls, pattern menu).
   - `src/main.tsx` — app bootstrapping and React root.
   - `src/grid/GridManager.ts` — core grid algorithms and Conway step.
   - `src/figures.ts` — pattern definitions and `applyPatternToGrid`.
   - `src/models/Square.ts` — simple helper model used for drag/preview.
   - `public/` — static assets and icons.
   - `vite.config.ts` — Vite configuration.
   - `package.json` — scripts and dev dependencies.

   ## What this project demonstrates

   - Efficient in-memory grid representations using typed arrays.
   - Direct canvas rendering to avoid excessive React re-renders for high-frequency updates.
   - Simple separation between algorithms (`GridManager`), patterns (`figures.ts`) and UI (`App.tsx`).

   ## Next steps / suggestions

   - Add unit tests for `GridManager` functions (conway step, random soup).
   - Add snapshot/integration tests to verify pattern evolution over steps.
   - Improve keyboard accessibility and add shortcuts for common actions.
   - Replace console logs with a toggled logger and add optional performance metrics.

   ## Contact

   If you'd like help extending this project (tests, performance tuning, or alternate renderers), tell me what you'd like to add.
