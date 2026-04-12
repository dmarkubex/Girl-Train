import './styles/variables.css';
import './styles/main.css';
import { initRouter } from './router';
import { openDatabase, initializeDefaultConfig } from './db';
import { registerViews } from './views/register';

/**
 * Initialize the application.
 * Opens database, ensures default config exists, registers views, and starts router.
 */
export async function initApp(): Promise<void> {
  await openDatabase();
  await initializeDefaultConfig();
  registerViews();
  initRouter();
}

document.addEventListener('DOMContentLoaded', () => {
  initApp().catch((error) => {
    console.error('Failed to initialize app:', error);
  });
});
