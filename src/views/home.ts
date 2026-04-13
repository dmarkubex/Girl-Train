/**
 * Home View
 * Main landing page with start workout button, streak display, and today's status
 */

import { getLatestSession, calculateStreak } from '../db';
import { navigate } from '../router';
import { getGlobalAudioManager } from '../timer/audio';
import { loadSnapshot } from '../timer/snapshot';
import { setState } from '../state';
import { getBusinessDate } from '../utils/date';
import { createBottomNav } from '../components/bottom-nav';

export function render(container: HTMLElement): void {
  const page = document.createElement('div');
  page.className = 'page home-page';

  const topBuffer = document.createElement('div');
  topBuffer.className = 'home-top-buffer';
  
  const header = document.createElement('header');
  header.className = 'home-header';

  const titleRow = document.createElement('div');
  titleRow.className = 'home-title-row';

  const title = document.createElement('h1');
  title.className = 'home-title';
  title.textContent = '康复锻炼日常';

  const userAvatar = document.createElement('div');
  userAvatar.className = 'home-avatar';
  userAvatar.innerHTML = '👧🏻';

  titleRow.append(title, userAvatar);

  const dateDisplay = document.createElement('p');
  dateDisplay.className = 'home-date text-tertiary';
  dateDisplay.textContent = formatDate(new Date());

  header.append(titleRow, dateDisplay);

  // Streak Badge
  const streakSection = document.createElement('section');
  streakSection.className = 'home-section hover-lift';

  const streakBadge = document.createElement('div');
  streakBadge.className = 'streak-card';

  const streakLeft = document.createElement('div');
  streakLeft.className = 'streak-content';
  
  const streakCurrentLabel = document.createElement('p');
  streakCurrentLabel.className = 'streak-label';
  streakCurrentLabel.textContent = '当前连续坚持';
  
  const streakCurrentValue = document.createElement('p');
  streakCurrentValue.className = 'streak-value highlight';
  streakCurrentValue.id = 'current-streak';
  streakCurrentValue.textContent = '— 天';

  streakLeft.append(streakCurrentLabel, streakCurrentValue);

  const streakRight = document.createElement('div');
  streakRight.className = 'streak-content text-right align-end';

  const streakMaxLabel = document.createElement('p');
  streakMaxLabel.className = 'streak-label opacity-80';
  streakMaxLabel.textContent = '历史最长记录';
  
  const streakMaxValue = document.createElement('p');
  streakMaxValue.className = 'streak-value sm opacity-90';
  streakMaxValue.id = 'max-streak';
  streakMaxValue.textContent = '— 天';

  streakRight.append(streakMaxLabel, streakMaxValue);

  const streakEmoji = document.createElement('div');
  streakEmoji.className = 'streak-icon pulse-soft';
  streakEmoji.textContent = '🔥';

  streakBadge.append(streakLeft, streakRight, streakEmoji);
  streakSection.appendChild(streakBadge);

  // Today's Status
  const statusSection = document.createElement('section');
  statusSection.className = 'home-section';

  const statusCard = document.createElement('div');
  statusCard.id = 'today-status-card';
  statusCard.className = 'status-card glass-panel hover-lift';

  statusSection.appendChild(statusCard);

  // Main Action Button Context
  const actionSection = document.createElement('div');
  actionSection.className = 'home-action-container';

  const startButton = document.createElement('button');
  startButton.className = 'btn-massive-primary elevate-active';
  
  const pulseRing = document.createElement('div');
  pulseRing.className = 'btn-pulse-ring';

  const playIcon = `<svg class="icon-lg" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
  startButton.innerHTML = `${playIcon} <span>开始今天的锻炼</span>`;
  startButton.addEventListener('click', handleStartWorkout);

  actionSection.append(pulseRing, startButton);

  // Bottom Navigation
  const nav = createBottomNav('home');

  page.append(topBuffer, header, streakSection, statusSection, actionSection, nav);
  container.appendChild(page);

  loadHomeData();
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[date.getDay()];

  return `${year}年${month}月${day}日，${weekday}`;
}

async function handleStartWorkout(): Promise<void> {
  const audioManager = getGlobalAudioManager();
  audioManager.init();

  const snapshot = loadSnapshot();
  if (snapshot) {
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

    const currentStreakEl = document.getElementById('current-streak');
    const maxStreakEl = document.getElementById('max-streak');

    if (currentStreakEl && maxStreakEl) {
      currentStreakEl.textContent = `${streak.currentStreak} 天`;
      maxStreakEl.textContent = `${streak.maxStreak} 天`;
    }

    updateTodayStatus(latestSession);
  } catch (error) {
    console.error('Failed to load home data:', error);
  }
}

function updateTodayStatus(session: any): void {
  const statusCard = document.getElementById('today-status-card');
  if (!statusCard) return;

  const today = getBusinessDate(Date.now());
  const isTodayCompleted = session && session.date === today && session.status === 'completed';

  if (isTodayCompleted) {
    statusCard.innerHTML = `
      <div class="status-top">
        <div class="status-info">
          <p class="status-subtitle text-tertiary">今日状态</p>
          <div class="status-title success-text">
            <span>已经完成 </span> 
            <svg class="icon-inline" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </div>
        </div>
        <div class="status-score text-right">
          <p class="status-subtitle text-tertiary">完成率</p>
          <p class="status-percent">${Math.round(session.completionRate * 100)}<span class="percent-sign">%</span></p>
        </div>
      </div>
      <div class="status-divider"></div>
      <div class="status-bottom pt-3">
        <p class="status-detail text-sm text-secondary">
          <span class="detail-item"><span class="detail-icon">🕒</span> 用时: <strong>${formatDuration(session.totalDuration / 1000)}</strong></span>
          <span class="detail-item"><span class="detail-icon">⏭</span> 跳过: <strong>${session.exercises.reduce((acc: number, ex: any) => acc + ex.sets.filter((s: any) => s.skipped).length, 0)} 组</strong></span>
        </p>
      </div>
    `;
  } else {
    statusCard.innerHTML = `
      <div class="status-top">
        <div class="status-info">
          <p class="status-subtitle text-tertiary">今日状态</p>
          <p class="status-title text-primary font-bold">待完成</p>
        </div>
        <div class="status-score text-right">
          <p class="status-subtitle text-tertiary">今日目标</p>
          <p class="status-percent">100<span class="percent-sign">%</span></p>
        </div>
      </div>
      <div class="status-divider"></div>
      <div class="status-bottom pt-3 text-center">
        <p class="status-detail msg-encourage text-sm font-medium text-secondary">"良好的习惯，从今天的坚持开始。" ✨</p>
      </div>
    `;
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}分${secs}秒`;
}
