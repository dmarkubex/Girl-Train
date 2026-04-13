/**
 * Complete View
 * Displays workout completion statistics with charts and comparisons
 */

import { navigate } from '../router';
import { getPreviousSession, saveSession } from '../db';
import { getState } from '../state';
import { createDoughnutChart, createBarChart, destroyChart } from '../components/chart-wrapper';
import type { Session } from '../types';

let completionChart: any = null;
let exerciseChart: any = null;
let currentSession: Session | null = null;

export async function render(container: HTMLElement): Promise<void> {
  // Get session data from state
  const session = getState('lastSession') as Session | undefined;
  if (!session) {
    navigate('home');
    return;
  }

  currentSession = session;

  // Create page structure
  const page = document.createElement('div');
  page.className = 'page complete-page bg-white min-h-screen';

  // Header
  const header = document.createElement('header');
  header.className = 'px-5 pt-6 pb-4 border-b border-gray-100';

  const headerContent = document.createElement('div');
  headerContent.className = 'flex items-center justify-between';

  const title = document.createElement('h1');
  title.className = 'text-2xl font-bold text-gray-900';
  title.textContent = '锻炼完成！';

  const emoji = document.createElement('span');
  emoji.className = 'text-4xl';
  emoji.textContent = '🎉';

  const dateDisplay = document.createElement('p');
  dateDisplay.className = 'text-gray-500 mt-1';
  dateDisplay.textContent = formatSessionDate(session);

  headerContent.append(title, emoji);
  header.append(headerContent, dateDisplay);

  // Completion Rate Doughnut Chart
  const chartSection = document.createElement('div');
  chartSection.className = 'px-5 py-6';

  const chartCard = document.createElement('div');
  chartCard.className = 'bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 text-center';

  const chartLabel = document.createElement('p');
  chartLabel.className = 'text-green-800 text-sm font-medium mb-4';
  chartLabel.textContent = '本次完成率';

  const chartContainer = document.createElement('div');
  chartContainer.className = 'relative w-40 h-40 mx-auto';

  const canvas = document.createElement('canvas');
  canvas.id = 'completion-chart';
  canvas.width = 160;
  canvas.height = 160;

  const centerText = document.createElement('div');
  centerText.className = 'absolute inset-0 flex items-center justify-center';

  const percentage = document.createElement('span');
  percentage.className = 'text-5xl font-bold text-green-600';
  percentage.textContent = `${Math.round(session.completionRate * 100)}%`;

  centerText.appendChild(percentage);
  chartContainer.append(canvas, centerText);

  const chartMessage = document.createElement('p');
  chartMessage.className = 'text-green-700 mt-4 text-sm';
  chartMessage.textContent = session.completionRate >= 1 ? '太棒了！全部完成' : '继续加油！';

  chartCard.append(chartLabel, chartContainer, chartMessage);
  chartSection.appendChild(chartCard);

  // Key Metrics
  const metricsSection = document.createElement('div');
  metricsSection.className = 'px-5 grid grid-cols-3 gap-3 mb-6';

  const totalDuration = session.exercises.reduce((acc, ex) =>
    acc + ex.sets.reduce((setAcc, set) => setAcc + (set.skipped ? 0 : set.actualDuration), 0), 0
  );
  const completedSets = session.exercises.reduce((acc, ex) =>
    acc + ex.sets.filter(s => !s.skipped).length, 0
  );
  const skippedSets = session.exercises.reduce((acc, ex) =>
    acc + ex.sets.filter(s => s.skipped).length, 0
  );

  const totalSetsPlanned = session.exercises.reduce((acc, ex) => acc + ex.plannedSets, 0);

  metricsSection.innerHTML = `
    <div class="bg-gray-50 rounded-xl p-3 text-center">
      <p class="text-gray-500 text-xs">总用时</p>
      <p class="timer text-xl font-bold text-gray-900 mt-1">${formatDuration(totalDuration / 1000)}</p>
    </div>
    <div class="bg-gray-50 rounded-xl p-3 text-center">
      <p class="text-gray-500 text-xs">完成组数</p>
      <p class="timer text-xl font-bold text-gray-900 mt-1">${completedSets}/${totalSetsPlanned}</p>
    </div>
    <div class="bg-gray-50 rounded-xl p-3 text-center">
      <p class="text-gray-500 text-xs">跳过组数</p>
      <p class="timer text-xl font-bold text-gray-900 mt-1">${skippedSets}</p>
    </div>
  `;

  // Per-Exercise Bar Chart
  const exerciseSection = document.createElement('div');
  exerciseSection.className = 'px-5 mb-6';

  const exerciseTitle = document.createElement('h2');
  exerciseTitle.className = 'text-gray-900 font-semibold mb-3';
  exerciseTitle.textContent = '各项目完成情况';

  const exerciseCard = document.createElement('div');
  exerciseCard.className = 'bg-gray-50 rounded-xl p-4';

  const exerciseCanvas = document.createElement('canvas');
  exerciseCanvas.id = 'exercise-chart';
  exerciseCanvas.height = 200;

  exerciseCard.appendChild(exerciseCanvas);
  exerciseSection.append(exerciseTitle, exerciseCard);

  // Comparison with Last Session
  const comparisonSection = document.createElement('div');
  comparisonSection.className = 'px-5 mb-6';

  const comparisonTitle = document.createElement('h2');
  comparisonTitle.className = 'text-gray-900 font-semibold mb-3';
  comparisonTitle.textContent = '与上次对比';

  const comparisonCard = await createComparisonCard(session);
  comparisonSection.append(comparisonTitle, comparisonCard);

  // Notes Input
  const notesSection = document.createElement('div');
  notesSection.className = 'px-5 mb-6';

  const notesTitle = document.createElement('h2');
  notesTitle.className = 'text-gray-900 font-semibold mb-3';
  notesTitle.textContent = '备注（可选）';

  const textarea = document.createElement('textarea');
  textarea.className = 'w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent';
  textarea.placeholder = '记录今天的感受...';
  textarea.value = session.note || '';

  const saveNoteButton = document.createElement('button');
  saveNoteButton.className = 'mt-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors';
  saveNoteButton.textContent = '保存备注';
  saveNoteButton.addEventListener('click', async () => {
    if (currentSession) {
      currentSession.note = textarea.value;
      await saveSession(currentSession);
      saveNoteButton.textContent = '已保存 ✓';
      setTimeout(() => {
        saveNoteButton.textContent = '保存备注';
      }, 2000);
    }
  });

  notesSection.append(notesTitle, textarea, saveNoteButton);

  // Action Button
  const actionSection = document.createElement('div');
  actionSection.className = 'px-5 pb-12';

  const homeButton = document.createElement('button');
  homeButton.className = 'w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg font-bold rounded-2xl shadow-lg';
  homeButton.textContent = '返回首页';
  homeButton.addEventListener('click', () => navigate('home'));

  actionSection.appendChild(homeButton);

  page.append(header, chartSection, metricsSection, exerciseSection, comparisonSection, notesSection, actionSection);
  container.appendChild(page);

  // Initialize charts after DOM is ready
  setTimeout(() => {
    initializeCharts(session);
  }, 100);
}

function initializeCharts(session: Session): void {
  // Completion doughnut chart
  const completionCanvas = document.getElementById('completion-chart') as HTMLCanvasElement;
  if (completionCanvas) {
    completionChart = createDoughnutChart('completion-chart', session.completionRate);
  }

  // Exercise bar chart
  const exerciseCanvas = document.getElementById('exercise-chart') as HTMLCanvasElement;
  if (exerciseCanvas) {
    const labels = session.exercises.map(ex => ex.exerciseName);
    const data = session.exercises.map(ex => {
      const completed = ex.sets.filter(s => !s.skipped).length;
      return Math.round((completed / ex.plannedSets) * 100);
    });
    exerciseChart = createBarChart('exercise-chart', labels, data, data.map(() => 100));
  }
}

async function createComparisonCard(session: Session): Promise<HTMLElement> {
  const card = document.createElement('div');
  card.className = 'bg-gray-50 rounded-xl p-4';

  // Get chronologically previous workout session (not "previous day")
  const previousSession = await getPreviousSession(session.startTime, session.sessionId);

  if (!previousSession) {
    card.innerHTML = `
      <div class="flex items-center justify-center">
        <p class="text-gray-500 text-sm">暂无上次锻炼记录</p>
      </div>
    `;
    return card;
  }

  const completionDiff = (session.completionRate - previousSession.completionRate) * 100;
  const timeDiff = session.totalDuration - previousSession.totalDuration;
  const skippedDiff = session.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.skipped).length, 0) -
    previousSession.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.skipped).length, 0);

  card.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <p class="text-gray-500 text-sm">完成率</p>
        <p class="${completionDiff >= 0 ? 'text-green-600' : 'text-red-500'} font-semibold flex items-center mt-1">
          ${completionDiff >= 0 ? '+' : ''}${Math.round(completionDiff)}%
          ${completionDiff >= 0 ? '<svg class="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg>' : '<svg class="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>'}
        </p>
      </div>
      <div class="w-px h-8 bg-gray-300"></div>
      <div class="flex-1 text-center">
        <p class="text-gray-500 text-sm">用时</p>
        <p class="${timeDiff <= 0 ? 'text-green-600' : 'text-red-500'} font-semibold mt-1">
          ${timeDiff >= 0 ? '+' : ''}${formatDuration(Math.abs(timeDiff) / 1000)}
        </p>
      </div>
      <div class="w-px h-8 bg-gray-300"></div>
      <div class="flex-1 text-right">
        <p class="text-gray-500 text-sm">跳过</p>
        <p class="${skippedDiff <= 0 ? 'text-green-600' : 'text-red-500'} font-semibold flex items-center justify-end mt-1">
          ${skippedDiff > 0 ? '+' : ''}${skippedDiff}
          ${skippedDiff <= 0 ? '<svg class="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg>' : '<svg class="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>'}
        </p>
      </div>
    </div>
    <p class="text-gray-400 text-xs mt-3 text-center">上次：${formatSessionDate(previousSession)} · ${Math.round(previousSession.completionRate * 100)}% · ${formatDuration(previousSession.totalDuration / 1000)}</p>
  `;

  return card;
}

function formatSessionDate(session: Session): string {
  const date = new Date(session.startTime);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  return `${month}月${day}日 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function cleanup(): void {
  destroyChart(completionChart);
  destroyChart(exerciseChart);
  completionChart = null;
  exerciseChart = null;
  currentSession = null;
}
