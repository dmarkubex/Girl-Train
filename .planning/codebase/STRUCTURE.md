## Repository Structure

**Focus:** arch
**Description:** Directory layout, organization conventions, and module boundaries.

### Project Root
- `index.html`: Entry point for Vite.
- `package.json`, `tsconfig.json`, `vite.config.ts`: Scaffold and build configuration.

### Source Code (`src/`)
The source directory splits UI routing and domain logic via domain-driven separation.

#### `src/views/`
Contains page-level controllers for distinct application states:
- `home.ts`: Main landing view.
- `register.ts`: Handles view registrations with router.
- `workout.ts`: The primary exercise running interface.
- `history.ts`: Exposes chart data and past sessions.
- `complete.ts`: Wrap-up sequence screen.
- `config.ts`: Manage exercise protocols and defaults.

#### `src/components/`
Reusable UI widget logic that abstracts heavy DOM interaction:
- `chart-wrapper.ts`: Connects to `chart.js` rendering context.
- `progress-bar.ts`: Shared visual indication logic.
- `timer-display.ts`: Shows active countdowns consistently.

#### `src/timer/`
Groups core timer orchestration:
- `audio.ts`: Web Audio API interactions for metronome/beeps.
- `engine.ts`: Core routine timing, intervals, pause/resume.
- `snapshot.ts`: Timer state snapshots.
- `index.ts`: Public API export bounds.

#### Global Modules
- `db.ts`: IndexedDB initialization, singleton cache, and crud bindings.
- `router.ts`: Hash-based or History API-based routing orchestration across views.
- `state.ts`: Contains specific global state bindings.
- `types.ts`: General interface signatures for TS validation.
- `utils/`: Includes generic utility functions (`date.ts`).
- `styles/`: Global stylesheets layout rules.
