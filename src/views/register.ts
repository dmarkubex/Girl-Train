/**
 * View Registration
 * Registers all routes with the router
 */

import { registerRoute } from '../router';
import { render as homeRender } from './home';
import { render as workoutRender, cleanup as workoutCleanup } from './workout';
import { render as completeRender, cleanup as completeCleanup } from './complete';
import { render as historyRender, cleanup as historyCleanup } from './history';
import { render as configRender, cleanup as configCleanup } from './config';

export function registerViews(): void {
  registerRoute('home', {
    render: homeRender,
  });

  registerRoute('workout', {
    render: workoutRender,
    cleanup: workoutCleanup,
  });

  registerRoute('complete', {
    render: completeRender,
    cleanup: completeCleanup,
  });

  registerRoute('history', {
    render: historyRender,
    cleanup: historyCleanup,
  });

  registerRoute('config', {
    render: configRender,
    cleanup: configCleanup,
  });
}
