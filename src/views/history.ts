/**
 * History View
 * Calendar view with workout history and trend charts
 */

import { getSessionsByDateRange } from '../db';
import { createLineChart, destroyChart } from '../components/chart-wrapper';
import type { Session } from '../types';

function toLocalDateString(ts: number): string {
  return new Date(ts).toLocaleDateString('en-CA');
}

let trendChart: any = null;
let currentView: 'week' | 'month' = 'week';
let currentDate: Date = new Date();

export async function render(container: HTMLElement): Promise<void> {
  const page = document.createElement('div');
  page.className = 'page history-page bg-white min-h-screen flex flex-col';

  // Header
  const header = document.createElement('header');
  header.className = 'px-5 pt-6 pb-4 border-b border-gray-100';

  const title = document.createElement('h1');
  title.className = 'text-2xl font-bold text-gray-900';
  title.textContent = '历史记录';

  const subtitle = document.createElement('p');
  subtitle.className = 'text-gray-500 text-sm mt-1';
  subtitle.textContent = '查看你的锻炼趋势';

  header.append(title, subtitle);

  // View Toggle
  const toggleSection = document.createElement('div');
  toggleSection.className = 'px-5 py-4';

  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'flex bg-gray-100 rounded-xl p-1';

  const weekButton = document.createElement('button');
  weekButton.className = 'flex-1 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg';
  weekButton.textContent = '周视图';
  weekButton.addEventListener('click', () => switchView('week'));

  const monthButton = document.createElement('button');
  monthButton.className = 'flex-1 py-2 text-sm font-medium text-gray-600';
  monthButton.textContent = '月视图';
  monthButton.addEventListener('click', () => switchView('month'));

  toggleContainer.append(weekButton, monthButton);
  toggleSection.appendChild(toggleContainer);

  page.append(header, toggleSection);

  // Content container
  const contentContainer = document.createElement('div');
  contentContainer.id = 'history-content';
  page.appendChild(contentContainer);

  container.appendChild(page);

  // Load initial content
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
  const sessions = await getSessionsForWeek(currentDate);
  const calendarData = generateWeekData(currentDate, sessions);

  // Calendar section (simplified for week view - show 7 days)
  const calendarSection = document.createElement('div');
  calendarSection.className = 'px-5 mb-6';

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const calendarGrid = document.createElement('div');
  calendarGrid.className = 'bg-gray-50 rounded-2xl p-4';

  // Week header
  const weekHeader = document.createElement('div');
  weekHeader.className = 'flex items-center justify-between mb-4';

  const prevButton = document.createElement('button');
  prevButton.className = 'p-2 -ml-2 text-gray-400 hover:text-gray-600';
  prevButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>';
  prevButton.addEventListener('click', () => navigateWeek(-1));

  const monthLabel = document.createElement('h3');
  monthLabel.className = 'font-semibold text-gray-900';
  monthLabel.textContent = getWeekRangeText(currentDate);

  const nextButton = document.createElement('button');
  nextButton.className = 'p-2 -mr-2 text-gray-400 hover:text-gray-600';
  nextButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
  nextButton.addEventListener('click', () => navigateWeek(1));

  weekHeader.append(prevButton, monthLabel, nextButton);

  // Weekday headers
  const weekdayRow = document.createElement('div');
  weekdayRow.className = 'grid grid-cols-7 gap-1 mb-2';
  weekDays.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'text-center text-xs text-gray-400 py-1';
    dayHeader.textContent = day;
    weekdayRow.appendChild(dayHeader);
  });

  // Calendar grid
  const gridRow = document.createElement('div');
  gridRow.className = 'grid grid-cols-7 gap-1';

  calendarData.days.forEach(day => {
    const dayCell = document.createElement('div');
    dayCell.className = `aspect-square flex items-center justify-center text-sm rounded-lg cursor-pointer transition-colors ${getCellClass(day)}`;
    dayCell.textContent = day.date.getDate().toString();

    if (day.session) {
      dayCell.addEventListener('click', () => showSessionDetail(day.session!));
    }

    gridRow.appendChild(dayCell);
  });

  // Legend
  const legend = document.createElement('div');
  legend.className = 'flex justify-center gap-4 mt-4 text-xs text-gray-500';
  legend.innerHTML = `
    <div class="flex items-center gap-1"><div class="w-3 h-3 bg-green-500 rounded"></div><span>完成</span></div>
    <div class="flex items-center gap-1"><div class="w-3 h-3 bg-yellow-400 rounded"></div><span>部分</span></div>
    <div class="flex items-center gap-1"><div class="w-3 h-3 bg-gray-200 rounded"></div><span>未锻炼</span></div>
  `;

  calendarGrid.append(weekHeader, weekdayRow, gridRow, legend);
  calendarSection.appendChild(calendarGrid);

  // Trend chart
  const trendSection = await createTrendSection(sessions, '7天趋势');

  // Week comparison
  const comparisonSection = await createWeekComparisonSection(sessions);

  container.append(calendarSection, trendSection, comparisonSection);
}

async function renderMonthView(container: HTMLElement): Promise<void> {
  const sessions = await getSessionsForMonth(currentDate);
  const calendarData = generateMonthData(currentDate, sessions);

  // Calendar section
  const calendarSection = document.createElement('div');
  calendarSection.className = 'px-5 mb-6';

  const calendarCard = document.createElement('div');
  calendarCard.className = 'bg-gray-50 rounded-2xl p-4';

  // Month navigation
  const monthHeader = document.createElement('div');
  monthHeader.className = 'flex items-center justify-between mb-4';

  const prevButton = document.createElement('button');
  prevButton.className = 'p-2 -ml-2 text-gray-400 hover:text-gray-600';
  prevButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>';
  prevButton.addEventListener('click', () => navigateMonth(-1));

  const monthLabel = document.createElement('h3');
  monthLabel.className = 'font-semibold text-gray-900';
  monthLabel.textContent = getMonthText(currentDate);

  const nextButton = document.createElement('button');
  nextButton.className = 'p-2 -mr-2 text-gray-400 hover:text-gray-600';
  nextButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
  nextButton.addEventListener('click', () => navigateMonth(1));

  monthHeader.append(prevButton, monthLabel, nextButton);

  // Weekday headers
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekdayRow = document.createElement('div');
  weekdayRow.className = 'grid grid-cols-7 gap-1 mb-2';
  weekDays.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'text-center text-xs text-gray-400 py-1';
    dayHeader.textContent = day;
    weekdayRow.appendChild(dayHeader);
  });

  // Calendar grid
  const calendarGrid = document.createElement('div');
  calendarGrid.className = 'grid grid-cols-7 gap-1';

  calendarData.weeks.forEach(week => {
    week.forEach(day => {
      const dayCell = document.createElement('div');
      dayCell.className = `aspect-square flex items-center justify-center text-sm rounded-lg cursor-pointer transition-colors ${getCellClass(day)}`;

      if (day.date.getMonth() === currentDate.getMonth()) {
        dayCell.textContent = day.date.getDate().toString();
      }

      if (day.session) {
        dayCell.addEventListener('click', () => showSessionDetail(day.session!));
      }

      calendarGrid.appendChild(dayCell);
    });
  });

  // Legend
  const legend = document.createElement('div');
  legend.className = 'flex justify-center gap-4 mt-4 text-xs text-gray-500';
  legend.innerHTML = `
    <div class="flex items-center gap-1"><div class="w-3 h-3 bg-green-500 rounded"></div><span>完成</span></div>
    <div class="flex items-center gap-1"><div class="w-3 h-3 bg-yellow-400 rounded"></div><span>部分</span></div>
    <div class="flex items-center gap-1"><div class="w-3 h-3 bg-gray-200 rounded"></div><span>未锻炼</span></div>
  `;

  calendarCard.append(monthHeader, weekdayRow, calendarGrid, legend);
  calendarSection.appendChild(calendarCard);

  // 30-day trend chart
  const trendSection = await createTrendSection(sessions, '30天趋势');

  container.append(calendarSection, trendSection);
}

function getCellClass(day: DayData): string {
  if (!day.session) {
    return 'text-gray-400';
  }

  if (day.session.completionRate >= 0.8) {
    return 'bg-green-500 text-white font-medium';
  } else {
    return 'bg-yellow-400 text-white font-medium';
  }
}

async function createTrendSection(sessions: Session[], title: string): Promise<HTMLElement> {
  const section = document.createElement('div');
  section.className = 'px-5 mb-6';

  const sectionTitle = document.createElement('h2');
  sectionTitle.className = 'text-gray-900 font-semibold mb-3';
  sectionTitle.textContent = title;

  const chartCard = document.createElement('div');
  chartCard.className = 'bg-gray-50 rounded-2xl p-4';

  const canvas = document.createElement('canvas');
  canvas.id = 'trend-chart';
  canvas.height = 160;

  chartCard.appendChild(canvas);
  section.append(sectionTitle, chartCard);

  // Initialize chart
  setTimeout(() => {
    const labels = sessions.map(s => {
      const date = new Date(s.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const data = sessions.map(s => s.completionRate * 100);

    destroyChart(trendChart);
    trendChart = createLineChart('trend-chart', labels, data);
  }, 100);

  return section;
}

async function createWeekComparisonSection(sessions: Session[]): Promise<HTMLElement> {
  const section = document.createElement('div');
  section.className = 'px-5 mb-6';

  const sectionTitle = document.createElement('h2');
  sectionTitle.className = 'text-gray-900 font-semibold mb-3';
  sectionTitle.textContent = '周平均对比';

  const card = document.createElement('div');
  card.className = 'bg-gray-50 rounded-2xl p-4';

  // Calculate this week and last week averages
  const thisWeekSessions = sessions.slice(-7);
  const lastWeekSessions = sessions.slice(-14, -7);

  const thisWeekAvg = thisWeekSessions.length > 0
    ? thisWeekSessions.reduce((acc, s) => acc + s.completionRate, 0) / thisWeekSessions.length * 100
    : 0;
  const lastWeekAvg = lastWeekSessions.length > 0
    ? lastWeekSessions.reduce((acc, s) => acc + s.completionRate, 0) / lastWeekSessions.length * 100
    : 0;
  const diff = thisWeekAvg - lastWeekAvg;

  card.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <p class="text-gray-500 text-sm">本周平均</p>
        <p class="text-green-600 text-2xl font-bold mt-1">${Math.round(thisWeekAvg)}%</p>
      </div>
      <div class="w-px h-12 bg-gray-300"></div>
      <div class="flex-1 text-center">
        <p class="text-gray-500 text-sm">上周</p>
        <p class="text-gray-600 text-2xl font-bold mt-1">${Math.round(lastWeekAvg)}%</p>
      </div>
      <div class="w-px h-12 bg-gray-300"></div>
      <div class="flex-1 text-right">
        <p class="text-gray-500 text-sm">变化</p>
        <p class="${diff >= 0 ? 'text-green-600' : 'text-red-500'} text-lg font-semibold flex items-center justify-end mt-1">
          ${diff >= 0 ? '+' : ''}${Math.round(diff)}%
          <svg class="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="${diff >= 0 ? 'M7 14l5-5 5 5z' : 'M7 10l5 5 5-5z'}"/>
          </svg>
        </p>
      </div>
    </div>
  `;

  section.append(sectionTitle, card);
  return section;
}

function showSessionDetail(session: Session): void {
  // Show a simple alert for now - could be enhanced to a modal
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

  // Update toggle buttons
  const page = document.querySelector('.history-page');
  if (!page) return;

  const weekButton = page.querySelector('.px-5.py-4 button:first-child') as HTMLButtonElement;
  const monthButton = page.querySelector('.px-5.py-4 button:last-child') as HTMLButtonElement;

  if (weekButton && monthButton) {
    if (view === 'week') {
      weekButton.className = 'flex-1 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg';
      monthButton.className = 'flex-1 py-2 text-sm font-medium text-gray-600';
    } else {
      weekButton.className = 'flex-1 py-2 text-sm font-medium text-gray-600';
      monthButton.className = 'flex-1 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg';
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
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return getSessionsByDateRange(
    toLocalDateString(startOfWeek.getTime()),
    toLocalDateString(endOfWeek.getTime())
  );
}

async function getSessionsForMonth(date: Date): Promise<Session[]> {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return getSessionsByDateRange(
    toLocalDateString(startOfMonth.getTime()),
    toLocalDateString(lastDayOfMonth.getTime())
  );
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

    days.push({
      date: dayDate,
      session: sessionsMap.get(dateStr) || null,
    });
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

  // Add padding for first week
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push({ date: new Date(year, month, 1 - (startDayOfWeek - i)), session: null });
  }

  // Add actual days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dayDate = new Date(year, month, day);
    const dateStr = toLocalDateString(dayDate.getTime());

    currentWeek.push({
      date: dayDate,
      session: sessionsMap.get(dateStr) || null,
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Add remaining days for last week
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
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const format = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
  return `${format(startOfWeek)} - ${format(endOfWeek)}`;
}

function getMonthText(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

interface DayData {
  date: Date;
  session: Session | null;
}

interface CalendarData {
  days: DayData[];
  weeks: DayData[][];
}

export function cleanup(): void {
  destroyChart(trendChart);
  trendChart = null;
}
