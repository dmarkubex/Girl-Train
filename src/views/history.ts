/**
 * History View
 * Calendar view with workout history and trend charts
 */

import { getSessionsByDateRange } from '../db';
import { createLineChart, destroyChart } from '../components/chart-wrapper';
import { createBottomNav } from '../components/bottom-nav';
import type { Session } from '../types';

function toLocalDateString(ts: number): string {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekStart(date: Date): Date {
  const start = startOfDay(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function buildDateRange(start: Date, days: number): Date[] {
  const range: Date[] = [];
  for (let i = 0; i < days; i++) {
    range.push(addDays(start, i));
  }
  return range;
}

function buildCompletionRateMap(sessions: Session[]): Map<string, number> {
  const completionRateMap = new Map<string, number>();
  const sorted = [...sessions].sort((a, b) => a.startTime - b.startTime);

  for (const session of sorted) {
    completionRateMap.set(session.date, session.completionRate * 100);
  }

  return completionRateMap;
}

function getAverageCompletionForDates(dates: Date[], completionRateMap: Map<string, number>): number {
  const total = dates.reduce((sum, date) => {
    const dateKey = toLocalDateString(date.getTime());
    return sum + (completionRateMap.get(dateKey) ?? 0);
  }, 0);

  return dates.length > 0 ? total / dates.length : 0;
}

let trendChart: any = null;
let currentView: 'week' | 'month' = 'week';
let currentDate: Date = new Date();

export async function render(container: HTMLElement): Promise<void> {
  const page = document.createElement('div');
  page.className = 'app-page history-page';

  // Header
  const header = document.createElement('header');
  header.className = 'page-header';

  const title = document.createElement('h1');
  title.className = 'page-title';
  title.textContent = '历史记录';

  const subtitle = document.createElement('p');
  subtitle.className = 'page-subtitle';
  subtitle.textContent = '追溯时光，每一步算数';

  header.append(title, subtitle);

  // View Toggle
  const toggleSection = document.createElement('div');
  toggleSection.className = 'toggle-panel';

  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'toggle-container';

  const weekButton = document.createElement('button');
  weekButton.className = 'toggle-btn active';
  weekButton.id = 'toggle-week';
  weekButton.textContent = '周视图';
  weekButton.addEventListener('click', () => switchView('week'));

  const monthButton = document.createElement('button');
  monthButton.className = 'toggle-btn';
  monthButton.id = 'toggle-month';
  monthButton.textContent = '月视图';
  monthButton.addEventListener('click', () => switchView('month'));

  toggleContainer.append(weekButton, monthButton);
  toggleSection.appendChild(toggleContainer);

  page.append(header, toggleSection);

  // Content container
  const contentContainer = document.createElement('div');
  contentContainer.id = 'history-content';
  page.appendChild(contentContainer);

  const nav = createBottomNav('history');
  page.appendChild(nav);

  container.appendChild(page);

  await loadHistoryContent(container);
}

async function loadHistoryContent(_container: HTMLElement): Promise<void> {
  const contentContainer = document.getElementById('history-content');
  if (!contentContainer) return;

  contentContainer.innerHTML = '';
  destroyChart(trendChart);
  trendChart = null;

  if (currentView === 'week') {
    await renderWeekView(contentContainer);
  } else {
    await renderMonthView(contentContainer);
  }
}

async function renderWeekView(container: HTMLElement): Promise<void> {
  const weekSessions = await getSessionsForWeek(currentDate);
  const comparisonSessions = await getSessionsForWeekComparison(currentDate);
  const calendarData = generateWeekData(currentDate, weekSessions);
  const weekDates = buildDateRange(getWeekStart(currentDate), 7);

  // Calendar section
  const calendarCard = document.createElement('div');
  calendarCard.className = 'dark-card';

  const weekHeader = document.createElement('div');
  weekHeader.className = 'calendar-header';

  const prevButton = document.createElement('button');
  prevButton.className = 'cal-nav-btn';
  prevButton.innerHTML = '<svg class="icon-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>';
  prevButton.addEventListener('click', () => navigateWeek(-1));

  const monthLabel = document.createElement('div');
  monthLabel.className = 'cal-month-label';
  monthLabel.textContent = getWeekRangeText(currentDate);

  const nextButton = document.createElement('button');
  nextButton.className = 'cal-nav-btn';
  nextButton.innerHTML = '<svg class="icon-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
  nextButton.addEventListener('click', () => navigateWeek(1));

  weekHeader.append(prevButton, monthLabel, nextButton);

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekdayRow = document.createElement('div');
  weekdayRow.className = 'calendar-weekdays';
  weekDays.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'weekday-header';
    dayHeader.textContent = day;
    weekdayRow.appendChild(dayHeader);
  });

  const gridRow = document.createElement('div');
  gridRow.className = 'calendar-grid';

  calendarData.days.forEach(day => {
    const dayCell = document.createElement('div');
    dayCell.className = `cal-day-cell active-month ${getCellClass(day)}`;
    dayCell.textContent = day.date.getDate().toString();

    if (day.session) {
      dayCell.addEventListener('click', () => showSessionDetail(day.session!));
    }
    gridRow.appendChild(dayCell);
  });

  calendarCard.append(weekHeader, weekdayRow, gridRow);

  const trendSection = await createTrendSection(weekDates, weekSessions, '7天趋势');
  const comparisonSection = await createWeekComparisonSection(comparisonSessions, getWeekStart(currentDate));

  container.append(calendarCard, trendSection, comparisonSection);
}

async function renderMonthView(container: HTMLElement): Promise<void> {
  const sessions = await getSessionsForMonth(currentDate);
  const calendarData = generateMonthData(currentDate, sessions);
  const trendEndDate = startOfDay(currentDate);
  const trendStartDate = addDays(trendEndDate, -29);
  const trendSessions = await getSessionsByDateRange(
    toLocalDateString(trendStartDate.getTime()),
    toLocalDateString(trendEndDate.getTime())
  );
  const trendDates = buildDateRange(trendStartDate, 30);

  const calendarCard = document.createElement('div');
  calendarCard.className = 'dark-card';

  const monthHeader = document.createElement('div');
  monthHeader.className = 'calendar-header';

  const prevButton = document.createElement('button');
  prevButton.className = 'cal-nav-btn';
  prevButton.innerHTML = '<svg class="icon-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>';
  prevButton.addEventListener('click', () => navigateMonth(-1));

  const monthLabel = document.createElement('div');
  monthLabel.className = 'cal-month-label';
  monthLabel.textContent = getMonthText(currentDate);

  const nextButton = document.createElement('button');
  nextButton.className = 'cal-nav-btn';
  nextButton.innerHTML = '<svg class="icon-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
  nextButton.addEventListener('click', () => navigateMonth(1));

  monthHeader.append(prevButton, monthLabel, nextButton);

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekdayRow = document.createElement('div');
  weekdayRow.className = 'calendar-weekdays';
  weekDays.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'weekday-header';
    dayHeader.textContent = day;
    weekdayRow.appendChild(dayHeader);
  });

  const calendarGrid = document.createElement('div');
  calendarGrid.className = 'calendar-grid';

  calendarData.weeks.forEach(week => {
    week.forEach(day => {
      const dayCell = document.createElement('div');
      
      const isActiveMonth = day.date.getMonth() === currentDate.getMonth();
      dayCell.className = `cal-day-cell ${isActiveMonth ? 'active-month' : ''} ${getCellClass(day)}`;
      
      if (isActiveMonth) {
        dayCell.textContent = day.date.getDate().toString();
      }

      if (day.session) {
        dayCell.addEventListener('click', () => showSessionDetail(day.session!));
      }

      calendarGrid.appendChild(dayCell);
    });
  });

  calendarCard.append(monthHeader, weekdayRow, calendarGrid);

  const trendSection = await createTrendSection(trendDates, trendSessions, '30天趋势');
  container.append(calendarCard, trendSection);
}

function getCellClass(day: DayData): string {
  if (!day.session) return '';
  if (day.session.completionRate >= 0.8) return 'status-green';
  return 'status-yellow';
}

async function createTrendSection(dates: Date[], sessions: Session[], title: string): Promise<HTMLElement> {
  const chartCard = document.createElement('div');
  chartCard.className = 'dark-card';
  chartCard.style.padding = '12px var(--spacing-lg) 20px';

  const sectionTitle = document.createElement('h2');
  sectionTitle.style.fontSize = '14px';
  sectionTitle.style.color = 'rgba(255,255,255,0.6)';
  sectionTitle.style.marginBottom = '12px';
  sectionTitle.style.textTransform = 'uppercase';
  sectionTitle.textContent = title;

  const canvasContainer = document.createElement('div');
  canvasContainer.style.background = 'transparent';
  canvasContainer.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))';

  const canvas = document.createElement('canvas');
  canvas.id = 'trend-chart';
  canvas.height = 140;

  canvasContainer.appendChild(canvas);
  chartCard.append(sectionTitle, canvasContainer);

  setTimeout(() => {
    const completionRateMap = buildCompletionRateMap(sessions);
    const labels = dates.map((date) => `${date.getMonth() + 1}/${date.getDate()}`);
    const data = dates.map((date) => {
      const dateKey = toLocalDateString(date.getTime());
      return completionRateMap.get(dateKey) ?? 0;
    });

    destroyChart(trendChart);
    trendChart = createLineChart('trend-chart', labels, data);
  }, 100);

  return chartCard;
}

async function createWeekComparisonSection(sessions: Session[], currentWeekStart: Date): Promise<HTMLElement> {
  const card = document.createElement('div');
  card.className = 'dark-card stats-grid';

  const completionRateMap = buildCompletionRateMap(sessions);
  const thisWeekDates = buildDateRange(currentWeekStart, 7);
  const lastWeekDates = buildDateRange(addDays(currentWeekStart, -7), 7);
  const thisWeekAvg = getAverageCompletionForDates(thisWeekDates, completionRateMap);
  const lastWeekAvg = getAverageCompletionForDates(lastWeekDates, completionRateMap);
  const diff = thisWeekAvg - lastWeekAvg;

  card.innerHTML = `
      <div class="stat-item">
        <p class="stat-label">本周平均</p>
        <p class="stat-value" style="color: #4CAF50;">${Math.round(thisWeekAvg)}%</p>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <p class="stat-label">上周平均</p>
        <p class="stat-value" style="color: rgba(255,255,255,0.8);">${Math.round(lastWeekAvg)}%</p>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <p class="stat-label">增长度</p>
        <p class="stat-value" style="color: ${diff >= 0 ? '#4CAF50' : '#EF4444'};">
          ${diff >= 0 ? '+' : ''}${Math.round(diff)}%
        </p>
      </div>
  `;

  return card;
}

function showSessionDetail(session: Session): void {
  const date = new Date(session.date);
  const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
  alert(`
${dateStr} 锻炼详情
完成率: ${Math.round(session.completionRate * 100)}%
用时: ${formatDuration(session.totalDuration / 1000)}
完成组数: ${session.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => !s.skipped).length, 0)}
跳过组数: ${session.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.skipped).length, 0)}
  `.trim());
}

function switchView(view: 'week' | 'month'): void {
  currentView = view;
  const toggleWeek = document.getElementById('toggle-week');
  const toggleMonth = document.getElementById('toggle-month');
  
  if (toggleWeek && toggleMonth) {
    if (view === 'week') {
      toggleWeek.className = 'toggle-btn active';
      toggleMonth.className = 'toggle-btn';
    } else {
      toggleWeek.className = 'toggle-btn';
      toggleMonth.className = 'toggle-btn active';
    }
  }

  const contentContainer = document.getElementById('history-content');
  if (contentContainer) {
    loadHistoryContent(contentContainer);
  }
}

function navigateWeek(direction: number): void {
  currentDate.setDate(currentDate.getDate() + (direction * 7));
  const contentContainer = document.getElementById('history-content');
  if (contentContainer) {
    loadHistoryContent(contentContainer);
  }
}

function navigateMonth(direction: number): void {
  currentDate.setMonth(currentDate.getMonth() + direction);
  const contentContainer = document.getElementById('history-content');
  if (contentContainer) {
    loadHistoryContent(contentContainer);
  }
}

async function getSessionsForWeek(date: Date): Promise<Session[]> {
  const startOfWeek = getWeekStart(date);
  const endOfWeek = addDays(startOfWeek, 6);
  return getSessionsByDateRange(toLocalDateString(startOfWeek.getTime()), toLocalDateString(endOfWeek.getTime()));
}

async function getSessionsForWeekComparison(date: Date): Promise<Session[]> {
  const currentWeekStart = getWeekStart(date);
  const previousWeekStart = addDays(currentWeekStart, -7);
  const currentWeekEnd = addDays(currentWeekStart, 6);
  return getSessionsByDateRange(toLocalDateString(previousWeekStart.getTime()), toLocalDateString(currentWeekEnd.getTime()));
}

async function getSessionsForMonth(date: Date): Promise<Session[]> {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return getSessionsByDateRange(toLocalDateString(startOfMonth.getTime()), toLocalDateString(lastDayOfMonth.getTime()));
}

function generateWeekData(date: Date, sessions: Session[]): CalendarData {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());

  const days: DayData[] = [];
  const sessionsMap = new Map(sessions.map(s => [s.date, s]));

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i);
    const dateStr = toLocalDateString(dayDate.getTime());
    days.push({ date: dayDate, session: sessionsMap.get(dateStr) || null });
  }

  return { days, weeks: [] };
}

function generateMonthData(date: Date, sessions: Session[]): CalendarData {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();

  const sessionsMap = new Map(sessions.map(s => [s.date, s]));
  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];

  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push({ date: new Date(year, month, 1 - (startDayOfWeek - i)), session: null });
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dayDate = new Date(year, month, day);
    const dateStr = toLocalDateString(dayDate.getTime());
    currentWeek.push({ date: dayDate, session: sessionsMap.get(dateStr) || null });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      const nextDay = lastDay.getDate() + (7 - currentWeek.length) + 1;
      currentWeek.push({ date: new Date(year, month + 1, nextDay), session: null });
    }
    weeks.push(currentWeek);
  }

  return { days: weeks.flat(), weeks };
}

function getWeekRangeText(date: Date): string {
  const startOfWeek = getWeekStart(date);
  const endOfWeek = addDays(startOfWeek, 6);
  const format = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
  return `${format(startOfWeek)} - ${format(endOfWeek)}`;
}

function getMonthText(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

interface DayData { date: Date; session: Session | null; }
interface CalendarData { days: DayData[]; weeks: DayData[][]; }

export function cleanup(): void {
  destroyChart(trendChart);
  trendChart = null;
}
