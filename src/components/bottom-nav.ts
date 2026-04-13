/**
 * Bottom Navigation Component
 * Shared navigation bar for Home, History, and Config views
 */

export function createBottomNav(currentRoute: 'home' | 'history' | 'config'): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav glass-nav';

  const navContainer = document.createElement('div');
  navContainer.className = 'bottom-nav-container';

  const homeLink = createNavLink('home', currentRoute === 'home');
  const historyLink = createNavLink('history', currentRoute === 'history');
  const configLink = createNavLink('config', currentRoute === 'config');

  navContainer.append(homeLink, historyLink, configLink);
  nav.appendChild(navContainer);

  return nav;
}

function createNavLink(route: string, isActive: boolean): HTMLElement {
  const link = document.createElement('a');
  link.href = `#${route}`;
  link.className = `nav-item ${isActive ? 'nav-item-active' : ''}`;

  let icon = '';
  let label = '';

  switch (route) {
    case 'home':
      icon = '<svg class="nav-icon" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';
      label = '锻炼';
      break;
    case 'history':
      icon = '<svg class="nav-icon" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>';
      label = '记录';
      break;
    case 'config':
      icon = '<svg class="nav-icon" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>';
      label = '计划';
      break;
  }

  link.innerHTML = `<div class="nav-icon-wrapper">${icon}</div><span class="nav-label">${label}</span>`;
  return link;
}
