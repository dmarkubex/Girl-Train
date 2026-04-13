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
  page.className = 'app-page complete-page';

  // Header
  const header = document.createElement('header');
  header.className = 'page-header text-center';
  header.style.textAlign = 'center';

  const title = document.createElement('h1');
  title.className = 'page-title';
  title.style.fontSize = '32px';
  title.innerHTML = '锻炼完成！<span style="font-size: 28px;">🎉</span>';

  const dateDisplay = document.createElement('p');
  dateDisplay.className = 'page-subtitle';
  dateDisplay.textContent = formatSessionDate(session);

  header.append(title, dateDisplay);

  // Completion Rate Doughnut Chart
  const chartSection = document.createElement('div');
  chartSection.style.paddingTop = '16px';

  const chartCard = document.createElement('div');
  chartCard.className = 'dark-card';
  chartCard.style.textAlign = 'center';
  chartCard.style.display = 'flex';
  chartCard.style.flexDirection = 'column';
  chartCard.style.alignItems = 'center';

  const chartLabel = document.createElement('p');
  chartLabel.style.color = 'var(--color-primary)';
  chartLabel.style.fontWeight = 'bold';
  chartLabel.style.marginBottom = '16px';
  chartLabel.textContent = '本次完成度';

  const chartContainer = document.createElement('div');
  chartContainer.style.position = 'relative';
  chartContainer.style.width = '180px';
  chartContainer.style.height = '180px';
  chartContainer.style.margin = '0 auto';

  const canvas = document.createElement('canvas');
  canvas.id = 'completion-chart';
  canvas.width = 180;
  canvas.height = 180;

  const centerText = document.createElement('div');
  centerText.style.position = 'absolute';
  centerText.style.inset = '0';
  centerText.style.display = 'flex';
  centerText.style.alignItems = 'center';
  centerText.style.justifyContent = 'center';

  const percentage = document.createElement('span');
  percentage.style.fontSize = '48px';
  percentage.style.fontWeight = '800';
  percentage.style.color = '#fff';
  percentage.style.textShadow = '0 0 10px rgba(255,107,53,0.5)';
  percentage.textContent = `${Math.round(session.completionRate * 100)}%`;

  centerText.appendChild(percentage);
  chartContainer.append(canvas, centerText);

  const chartMessage = document.createElement('p');
  chartMessage.style.color = 'rgba(255,255,255,0.7)';
  chartMessage.style.marginTop = '16px';
  chartMessage.style.fontSize = '14px';
  chartMessage.textContent = session.completionRate >= 1 ? '太棒了！你的自律令人惊叹！' : '坚持就是胜利，明天继续加油！';

  chartCard.append(chartLabel, chartContainer, chartMessage);
  chartSection.appendChild(chartCard);

  // Key Metrics
  const metricsSection = document.createElement('div');
  metricsSection.className = 'dark-card stats-grid';
  metricsSection.style.padding = '20px';

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
    <div class="stat-item">
      <p class="stat-label">总用时</p>
      <p class="stat-value" style="color: #fff;">${formatDuration(totalDuration / 1000)}</p>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <p class="stat-label">完成组数</p>
      <p class="stat-value" style="color: #4CAF50;">${completedSets}/${totalSetsPlanned}</p>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <p class="stat-label">跳过组数</p>
      <p class="stat-value" style="color: ${skippedSets > 0 ? '#EF4444' : '#fff'};">${skippedSets}</p>
    </div>
  `;

  // Per-Exercise Bar Chart
  const exerciseContainer = document.createElement('div');
  exerciseContainer.style.padding = '0 var(--spacing-lg)';
  const exerciseTitle = document.createElement('h2');
  exerciseTitle.style.fontSize = '14px';
  exerciseTitle.style.color = 'rgba(255,255,255,0.6)';
  exerciseTitle.style.marginBottom = '12px';
  exerciseTitle.style.textTransform = 'uppercase';
  exerciseTitle.textContent = '各项目完成情况';
  
  const exerciseCard = document.createElement('div');
  exerciseCard.className = 'dark-card';
  exerciseCard.style.margin = '0 0 var(--spacing-lg) 0';
  exerciseCard.style.padding = '12px var(--spacing-md)';

  const exerciseCanvas = document.createElement('canvas');
  exerciseCanvas.id = 'exercise-chart';
  exerciseCanvas.height = 140;

  exerciseCard.appendChild(exerciseCanvas);
  exerciseContainer.append(exerciseTitle, exerciseCard);

  // Comparison with Last Session
  const comparisonContainer = document.createElement('div');
  comparisonContainer.style.padding = '0 var(--spacing-lg)';
  const comparisonTitle = document.createElement('h2');
  comparisonTitle.style.fontSize = '14px';
  comparisonTitle.style.color = 'rgba(255,255,255,0.6)';
  comparisonTitle.style.marginBottom = '12px';
  comparisonTitle.style.textTransform = 'uppercase';
  comparisonTitle.textContent = '与上次对比';

  const comparisonCardWrapper = document.createElement('div');
  comparisonCardWrapper.style.margin = '0 0 var(--spacing-lg) 0';
  const comparisonCard = await createComparisonCard(session);
  comparisonCardWrapper.appendChild(comparisonCard);

  comparisonContainer.append(comparisonTitle, comparisonCardWrapper);

  // Notes Input
  const notesContainer = document.createElement('div');
  notesContainer.style.padding = '0 var(--spacing-lg)';
  const notesTitle = document.createElement('h2');
  notesTitle.style.fontSize = '14px';
  notesTitle.style.color = 'rgba(255,255,255,0.6)';
  notesTitle.style.marginBottom = '12px';
  notesTitle.textContent = '备注（可选）';

  const notesCard = document.createElement('div');
  notesCard.className = 'dark-card';
  notesCard.style.margin = '0 0 var(--spacing-lg) 0';
  notesCard.style.padding = 'var(--spacing-md)';

  const textarea = document.createElement('textarea');
  textarea.style.width = '100%';
  textarea.style.height = '80px';
  textarea.style.background = 'rgba(0,0,0,0.3)';
  textarea.style.border = '1px solid rgba(255,255,255,0.1)';
  textarea.style.color = '#fff';
  textarea.style.padding = '12px';
  textarea.style.borderRadius = '8px';
  textarea.style.fontSize = '14px';
  textarea.style.resize = 'none';
  textarea.style.outline = 'none';
  textarea.placeholder = '记录今天的状态和感受...';
  textarea.value = session.note || '';

  const saveNoteButton = document.createElement('button');
  saveNoteButton.className = 'btn-secondary';
  saveNoteButton.style.marginTop = '12px';
  saveNoteButton.style.padding = '10px';
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

  notesCard.append(textarea, saveNoteButton);
  notesContainer.append(notesTitle, notesCard);

  // Action Button
  const actionSection = document.createElement('div');
  actionSection.className = 'save-btn-container';
  actionSection.style.marginTop = '20px';

  const homeButton = document.createElement('button');
  homeButton.className = 'btn-save-glow';
  homeButton.textContent = '完成并返回首页';
  homeButton.addEventListener('click', () => navigate('home'));

  actionSection.appendChild(homeButton);

  page.append(header, chartSection, metricsSection, exerciseContainer, comparisonContainer, notesContainer, actionSection);
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
  card.className = 'dark-card stats-grid';
  card.style.margin = '0';
  card.style.padding = '20px';

  // Get chronologically previous workout session (not "previous day")
  const previousSession = await getPreviousSession(session.startTime, session.sessionId);

  if (!previousSession) {
    card.innerHTML = `
      <div style="text-align:center; width:100%;">
        <p style="color:rgba(255,255,255,0.5); font-size:14px;">暂无上次锻炼记录</p>
      </div>
    `;
    return card;
  }

  const completionDiff = (session.completionRate - previousSession.completionRate) * 100;
  const timeDiff = session.totalDuration - previousSession.totalDuration;
  const skippedDiff = session.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.skipped).length, 0) -
    previousSession.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.skipped).length, 0);

  const prevDateText = formatSessionDate(previousSession);
  const prevRate = Math.round(previousSession.completionRate * 100);
  const prevDuration = formatDuration(previousSession.totalDuration / 1000);

  card.innerHTML = `
    <div style="width:100%;">
      <div class="stats-grid" style="margin-bottom: 16px;">
        <div class="stat-item">
          <p class="stat-label">完成率</p>
          <p class="stat-value" style="color: ${completionDiff >= 0 ? '#4CAF50' : '#EF4444'};">
            ${completionDiff >= 0 ? '+' : ''}${Math.round(completionDiff)}%
          </p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <p class="stat-label">用时差异</p>
          <p class="stat-value" style="color: ${timeDiff >= 0 ? '#EF4444' : '#4CAF50'};">
            ${timeDiff >= 0 ? '+' : ''}${formatDuration(Math.abs(timeDiff) / 1000)}
          </p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <p class="stat-label">跳过动作</p>
          <p class="stat-value" style="color: ${skippedDiff <= 0 ? '#4CAF50' : '#EF4444'};">
            ${skippedDiff > 0 ? '+' : ''}${skippedDiff}
          </p>
        </div>
      </div>
      <p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center;">
        参照记录：上次锻炼 (${prevDateText}) · 完成 ${prevRate}% · 用时 ${prevDuration}
      </p>
    </div>
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
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function cleanup(): void {
  destroyChart(completionChart);
  destroyChart(exerciseChart);
  completionChart = null;
  exerciseChart = null;
  currentSession = null;
}
