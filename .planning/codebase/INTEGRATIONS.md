## Integrations

**Focus:** tech
**Description:** Analysis of external APIs, databases, authentication providers, and third-party integrations.

### Local Databases
- **IndexedDB**: 
  - Accessed via the `idb` dependency package.
  - Used heavily in `src/db.ts` to manage the local application state across multiple sessions (exercise configuration, historical records, and streaks).
  - Employs an IDB schema upgrading system (migrations array).

### External APIs
- **No Remote Backend APIs**: The application is fully client-side and does not rely on a backend server or SaaS APIs for basic functionality.
- **Offline Capabilities**:
  - The application relies on `vite-plugin-pwa` to cache itself and specific assets for offline usage.
  - Google Fonts (if used in UI styles) are explicitly handled via the Workbox caching rules in the Vite configuration.

### Authentication
- None. Since the app is local-first, it acts as a personal tracking device tied to the user's browser, without any login or identity management.

### Analytics & Telemetry
- None currently configured via standard providers like Google Analytics or Mixpanel.

### Webhooks & Third Party
- No third party webhooks or triggers exist.

### Integration Summary
The app is fully self-contained as a Progressive Web App, prioritizing privacy and offline availability. It only integrates with the browser context, notably IndexedDB for storage and Workbox for intelligent caching.
