## Tech Stack

**Focus:** tech
**Description:** Analysis of the technology stack, languages, frameworks, and core dependencies.

### Core Technologies
- **Language**: TypeScript (`^5.7.0`)
- **Build Tool / Bundler**: Vite (`^6.0.0`)
- **Frontend Framework**: Vanilla HTML/CSS/DOM (No modern UI framework like React or Vue is used).

### Core Dependencies
- **chart.js (`^4.4.7`)**: Used for data visualization, specifically to render charts.
- **idb (`^8.0.1`)**: A lightweight Promise-based wrapper around IndexedDB, used for persistent local storage of app config and sessions.

### Dev Dependencies
- **vite-plugin-pwa (`^0.21.1`)**: Provides Progressive Web App (PWA) capabilities, enabling offline support, service worker registration, and app installation.
- **typescript**: Type checking and compilation.

### Configuration
- **package.json**: Defines the scripts `dev`, `build`, and `preview`. Projects runs with `vite`.
- **tsconfig.json**: Standard TypeScript configuration for Vite projects.
- **vite.config.ts**: Configures Vite, including custom PWA settings with workbox caching strategies.

### Environment
- **Platform**: Web Browser (Client-side execution only)
- **Deployment**: Any static file hosting (outputs to `dist/`).

### Summary
The project relies on a modern build pipeline (Vite+TypeScript) but opts for a lightweight execution model using Vanilla JS.
