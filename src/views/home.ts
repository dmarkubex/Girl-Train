/**
 * Home View
 * Main landing page with start workout button, streak display, and today's status
 */

import { getLatestSession, calculateStreak } from '../db';
import { navigate } from '../router';
import { AudioManager } from '../timer/audio';
import { loadSnapshot } from '../timer/snapshot';
import { setState } from '../state';
import { getBusinessDate } from '../utils/date';

export function render(container: HTMLElement): void {
  // Create page structure
  const page = document.createElement('div');
  page.className = 'page home-page';

  // Header
  const header = document.createElement('header');
  header.className = 'px-5 pt-6 pb-4';

  const title = document.createElement('h1');
  title.className = 'text-2xl font-bold text-gray-900';
  title.textContent = '锻炼追踪';

  const dateDisplay = document.createElement('p');
  dateDisplay.className = 'text-sm text-gray-500 mt-1';
  dateDisplay.textContent = formatDate(new Date());

  header.append(title, dateDisplay);

  // Streak Badge
  const streakSection = document.createElement('div');
  streakSection.className = 'px-5 mb-6';

  const streakBadge = document.createElement('div');
  streakBadge.className = 'streak-badge rounded-2xl p-4 flex items-center justify-between shadow-sm';
  streakBadge.style.background = 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';

  const streakLeft = document.createElement('div');
  const streakCurrentLabel = document.createElement('p');
  streakCurrentLabel.className = 'text-orange-900 text-sm font-medium';
  streakCurrentLabel.textContent = '当前连续';
  const streakCurrentValue = document.createElement('p');
  streakCurrentValue.className = 'text-orange-900 text-3xl font-bold';
  streakCurrentValue.id = 'current-streak';
  streakCurrentValue.textContent = '— 天';

  streakLeft.append(streakCurrentLabel, streakCurrentValue);

  const streakRight = document.createElement('div');
  streakRight.className = 'text-right';

  const streakMaxLabel = document.createElement('p');
  streakMaxLabel.className = 'text-orange-800 text-sm';
  streakMaxLabel.textContent = '历史最长';
  const streakMaxValue = document.createElement('p');
  streakMaxValue.className = 'text-orange-800 text-lg font-semibold';
  streakMaxValue.id = 'max-streak';
  streakMaxValue.textContent = '— 天';

  streakRight.append(streakMaxLabel, streakMaxValue);

  const streakEmoji = document.createElement('div');
  streakEmoji.className = 'text-5xl ml-3';
  streakEmoji.textContent = '🔥';

  streakBadge.append(streakLeft, streakRight, streakEmoji);
  streakSection.appendChild(streakBadge);

  // Today's Status
  const statusSection = document.createElement('div');
  statusSection.className = 'px-5 mb-6';

  const statusCard = document.createElement('div');
  statusCard.id = 'today-status-card';
  statusCard.className = 'bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-200';

  statusSection.appendChild(statusCard);

  // Main Action Button
  const actionSection = document.createElement('div');
  actionSection.className = 'px-5 mb-8 flex-1 flex items-center';

  const startButton = document.createElement('button');
  startButton.className = 'gradient-btn w-full py-5 rounded-3xl shadow-lg text-white text-xl font-bold transition-all duration-100 flex items-center justify-center gap-3';
  startButton.style.background = 'linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%)';

  const playIcon = `<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
  startButton.innerHTML = `${playIcon} 开始锻炼`;

  startButton.addEventListener('click', handleStartWorkout);

  actionSection.appendChild(startButton);

  // Bottom Navigation
  const nav = document.createElement('nav');
  nav.className = 'border-t border-gray-200 px-6 py-3 pb-8';

  const navContainer = document.createElement('div');
  navContainer.className = 'flex justify-around';

  // Home link (active)
  const homeLink = createNavLink('home', true);
  // History link
  const historyLink = createNavLink('history', false);
  // Config link
  const configLink = createNavLink('config', false);

  navContainer.append(homeLink, historyLink, configLink);
  nav.appendChild(navContainer);

  page.append(header, streakSection, statusSection, actionSection, nav);
  container.appendChild(page);

  // Load data
  loadHomeData();
}

function createNavLink(route: string, isActive: boolean): HTMLElement {
  const link = document.createElement('a');
  link.href = `#${route}`;

  const colorClass = isActive ? 'text-orange-500' : 'text-gray-400';
  link.className = `flex flex-col items-center ${colorClass}`;

  let icon = '';
  let label = '';

  switch (route) {
    case 'home':
      icon = '<svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';
      label = '首页';
      break;
    case 'history':
      icon = '<svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>';
      label = '历史';
      break;
    case 'config':
      icon = '<svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>';
      label = '配置';
      break;
  }

  link.innerHTML = `${icon}<span class="text-xs mt-1 ${isActive ? 'font-medium' : ''}">${label}</span>`;

  return link;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekday = weekdays[date.getDay()];

  return `${year}年${month}月${day}日 ${weekday}`;
}

async function handleStartWorkout(): Promise<void> {
  // Initialize audio manager (must be from user gesture)
  const audioManager = new AudioManager();
  audioManager.init();

  // Check for existing snapshot
  const snapshot = loadSnapshot();

  if (snapshot) {
    // Store snapshot for recovery in workout view
    setState('pendingSnapshot', snapshot);
  }

  navigate('workout');
}

async function loadHomeData(): Promise<void> {
  try {
    const [latestSession, streak] = await Promise.all([
      getLatestSession(),
      calculateStreak(),
    ]);

    // Update streak display
    const currentStreakEl = document.getElementById('current-streak');
    const maxStreakEl = document.getElementById('max-streak');

    if (currentStreakEl && maxStreakEl) {
      currentStreakEl.textContent = `${streak.currentStreak} 天`;
      maxStreakEl.textContent = `${streak.maxStreak} 天`;
    }

    // Update today's status
    updateTodayStatus(latestSession);
  } catch (error) {
    console.error('Failed to load home data:', error);
  }
}

function updateTodayStatus(session: any): void {
  const statusCard = document.getElementById('today-status-card');

  if (!statusCard) return;

  const today = getBusinessDate(Date.now());
  const isTodayCompleted = session && session.date === today;

  if (isTodayCompleted) {
    // Completed today
    statusCard.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <p class="text-green-800 text-sm font-medium">今日状态</p>
          <p class="text-green-900 text-xl font-bold mt-1">已完成 ✓</p>
        </div>
        <div class="text-right">
          <p class="text-green-700 text-sm">完成率</p>
          <p class="text-green-900 text-2xl font-bold">${Math.round(session.completionRate)}%</p>
        </div>
      </div>
      <div class="mt-3 pt-3 border-t border-green-200">
        <p class="text-green-700 text-sm">用时 ${formatDuration(session.totalDuration / 1000)} · 跳过 ${session.exercises.reduce((acc: number, ex: any) => acc + ex.sets.filter((s: any) => s.skipped).length, 0)}组</p>
      </div>
    `;
  } else {
    // Not completed today
    statusCard.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <p class="text-green-800 text-sm font-medium">今日状态</p>
          <p class="text-green-900 text-xl font-bold mt-1">未完成</p>
        </div>
        <div class="text-right">
          <p class="text-green-700 text-sm">加油</p>
          <p class="text-green-900 text-2xl font-bold">💪</p>
        </div>
      </div>
      <div class="mt-3 pt-3 border-t border-green-200">
        <p class="text-green-700 text-sm">开始今天的锻炼吧！</p>
      </div>
    `;
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}分${secs}秒`;
}
