## Architecture

**Focus:** arch
**Description:** Analysis of architectural patterns, layers, data flow, abstractions, and entry points.

### Pattern Overview
- **Single Page Application (SPA)**: Rendered entirely on the client side using Vanilla HTML, CSS, and TypeScript.
- **Component-View Layering**:
  - Complex elements are decoupled into a pseudo-component structure (`src/components/`) that generates and manipulates DOM nodes.
  - Pages or specific application states are mounted as Views (`src/views/`), coordinated by a custom client-side router (`src/router.ts`).

### Entry Points
- `index.html` → `src/main.ts`
- **Bootstrapping**: `main.ts` initializes the application by opening the DB connections, loading default configuration (`src/db.ts`), registering available views, and hooking start via `initRouter()`.

### Data Flow
- **Persistence Layer**: `src/db.ts` forms an abstraction boundary with IndexedDB. All config fetching and session recording flows through these async wrappers.
- **State Management**: App operates on localized module state and synchronous UI updates. Domain state concerning the running exercise is confined inside the `src/timer/` component tree.

### Core Domain Logic: Timer Engine
- Complex asynchronous behavior resides in `src/timer/engine.ts`.
- Operates via a robust timing loop or state machine that delegates sound/beep execution to `src/timer/audio.ts`.
- Generates snapshot events (`snapshot.ts`) or delegates changes out to the UI views which explicitly map it to the DOM.

### Limitations
- **Manual DOM Mutations**: Binds event listeners manually and manipulates element attributes/text. No virtual DOM abstraction is present.
