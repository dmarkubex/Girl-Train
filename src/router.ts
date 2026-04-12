export type Route = 'home' | 'workout' | 'complete' | 'history' | 'config';

type ViewRenderer = (container: HTMLElement) => void | Promise<void>;
type CleanupFn = (() => void) | void;

interface RouteEntry {
  render: ViewRenderer;
  cleanup?: () => void;
}

const routes = new Map<Route, RouteEntry>();
let currentCleanup: CleanupFn = undefined;
let appContainer: HTMLElement | null = null;

export function registerRoute(name: Route, entry: RouteEntry): void {
  routes.set(name, entry);
}

export function navigate(route: Route, replace = false): void {
  if (replace) {
    history.replaceState(null, '', `#${route}`);
  } else {
    history.pushState(null, '', `#${route}`);
  }
  renderCurrentRoute();
}

function getRouteFromHash(): Route {
  const hash = window.location.hash.slice(1) as Route;
  return routes.has(hash) ? hash : 'home';
}

async function renderCurrentRoute(): Promise<void> {
  if (!appContainer) return;

  // Cleanup previous view
  if (typeof currentCleanup === 'function') {
    currentCleanup();
  }
  currentCleanup = undefined;

  const route = getRouteFromHash();
  const entry = routes.get(route);

  if (entry) {
    appContainer.innerHTML = '';
    await entry.render(appContainer);
    if (entry.cleanup) {
      currentCleanup = entry.cleanup;
    }
  }
}

export function initRouter(): void {
  appContainer = document.getElementById('app');
  if (!appContainer) {
    throw new Error('Missing #app container');
  }

  window.addEventListener('hashchange', () => renderCurrentRoute());

  // If no hash, default to home
  if (!window.location.hash) {
    window.location.hash = '#home';
  } else {
    renderCurrentRoute();
  }
}
