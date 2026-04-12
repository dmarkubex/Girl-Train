/**
 * Chart Wrapper Component
 * Thin wrapper around Chart.js for consistent configuration
 */

import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

const COMMON_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: false,
    },
  },
};

const DOUGHNUT_OPTIONS = {
  ...COMMON_CHART_OPTIONS,
  cutout: '70%',
  plugins: {
    ...COMMON_CHART_OPTIONS.plugins,
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context: any) => {
          return `${context.parsed}% 完成`;
        },
      },
    },
  },
};

const BAR_CHART_OPTIONS = {
  ...COMMON_CHART_OPTIONS,
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 11,
        },
        maxRotation: 45,
        minRotation: 45,
      },
    },
    y: {
      beginAtZero: true,
      max: 100,
      ticks: {
        callback: (value: string | number) => `${typeof value === 'number' ? value : parseInt(value, 10)}%`,
      },
    },
  },
  plugins: {
    ...COMMON_CHART_OPTIONS.plugins,
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context: any) => {
          return `${context.parsed.y}% 完成`;
        },
      },
    },
  },
};

const LINE_CHART_OPTIONS = {
  ...COMMON_CHART_OPTIONS,
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 11,
        },
      },
    },
    y: {
      beginAtZero: true,
      max: 100,
      ticks: {
        callback: (value: string | number) => `${typeof value === 'number' ? value : parseInt(value, 10)}%`,
      },
    },
  },
  plugins: {
    ...COMMON_CHART_OPTIONS.plugins,
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context: any) => {
          return `${context.parsed.y}% 完成`;
        },
      },
    },
  },
  elements: {
    line: {
      tension: 0.4, // Smooth curves
    },
    point: {
      radius: 4,
      hoverRadius: 6,
    },
  },
};

export function createDoughnutChart(canvasId: string, completionRate: number): Chart | null {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const pct = completionRate * 100;

  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['完成', '未完成'],
      datasets: [
        {
          data: [pct, 100 - pct],
          backgroundColor: ['#10B981', '#E5E7EB'],
          borderWidth: 0,
        },
      ],
    },
    options: DOUGHNUT_OPTIONS,
  });
}

export function createBarChart(
  canvasId: string,
  labels: string[],
  completedData: number[],
  _totalData: number[]
): Chart | null {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '完成率',
          data: completedData,
          backgroundColor: '#10B981',
          borderRadius: 6,
          barPercentage: 0.7,
        },
      ],
    },
    options: BAR_CHART_OPTIONS,
  });
}

export function createLineChart(canvasId: string, labels: string[], data: number[]): Chart | null {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '完成率',
          data,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          borderWidth: 3,
        },
      ],
    },
    options: LINE_CHART_OPTIONS,
  });
}

export function destroyChart(chart: Chart | null): void {
  if (chart) {
    chart.destroy();
  }
}
