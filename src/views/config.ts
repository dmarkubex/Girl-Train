/**
 * Config View
 * Manage exercise configuration and data import/export
 */

import { getConfig, saveConfig, exportAllData, importData } from '../db';
import type { AppConfig, Exercise } from '../types';

let exercises: Exercise[] = [];

export async function render(container: HTMLElement): Promise<void> {
  const page = document.createElement('div');
  page.className = 'page config-page bg-white min-h-screen flex flex-col';

  // Header
  const header = document.createElement('header');
  header.className = 'px-5 pt-6 pb-4 border-b border-gray-100';

  const title = document.createElement('h1');
  title.className = 'text-2xl font-bold text-gray-900';
  title.textContent = '锻炼配置';

  const subtitle = document.createElement('p');
  subtitle.className = 'text-gray-500 text-sm mt-1';
  subtitle.textContent = '管理你的锻炼计划';

  header.append(title, subtitle);

  // Project Rest Settings
  const restSection = document.createElement('div');
  restSection.className = 'px-5 py-4 border-b border-gray-100';

  const restContainer = document.createElement('div');
  restContainer.className = 'flex items-center justify-between';

  const restInfo = document.createElement('div');
  const restLabel = document.createElement('p');
  restLabel.className = 'text-gray-900 font-medium';
  restLabel.textContent = '项目间休息时长';
  const restDesc = document.createElement('p');
  restDesc.className = 'text-gray-500 text-sm';
  restDesc.textContent = '不同项目之间的休息时间';

  restInfo.append(restLabel, restDesc);

  const restInputContainer = document.createElement('div');
  restInputContainer.className = 'flex items-center gap-2';

  const restInput = document.createElement('input');
  restInput.type = 'number';
  restInput.id = 'project-rest-input';
  restInput.className = 'w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400';
  restInput.min = '0';
  restInput.addEventListener('change', validateRestInput);

  const restUnit = document.createElement('span');
  restUnit.className = 'text-gray-600 text-sm';
  restUnit.textContent = '秒';

  restInputContainer.append(restInput, restUnit);
  restContainer.append(restInfo, restInputContainer);
  restSection.appendChild(restContainer);

  // Exercise List
  const listSection = document.createElement('div');
  listSection.className = 'flex-1 overflow-y-auto';
  listSection.id = 'exercise-list';

  // Add New Exercise Button
  const addSection = document.createElement('div');
  addSection.className = 'px-5 py-4 border-t border-gray-100';

  const addButton = document.createElement('button');
  addButton.className = 'w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-orange-400 hover:text-orange-500 transition-colors flex items-center justify-center gap-2';
  addButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> 添加锻炼项目';
  addButton.addEventListener('click', addNewExercise);

  addSection.appendChild(addButton);

  // Data Management
  const dataSection = document.createElement('div');
  dataSection.className = 'px-5 py-4 border-t border-gray-100';

  const dataLabel = document.createElement('p');
  dataLabel.className = 'text-gray-500 text-sm mb-3';
  dataLabel.textContent = '数据管理';

  const buttonRow = document.createElement('div');
  buttonRow.className = 'flex gap-3';

  const exportButton = document.createElement('button');
  exportButton.className = 'flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2';
  exportButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> 导出数据';
  exportButton.addEventListener('click', handleExport);

  const importButton = document.createElement('button');
  importButton.className = 'flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2';
  importButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> 导入数据';
  importButton.addEventListener('click', handleImport);

  buttonRow.append(exportButton, importButton);
  dataSection.append(dataLabel, buttonRow);

  // Save Button
  const saveSection = document.createElement('div');
  saveSection.className = 'px-5 py-4 pb-12';

  const saveButton = document.createElement('button');
  saveButton.className = 'w-full py-4 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-lg font-bold rounded-2xl shadow-lg hover:from-orange-500 hover:to-orange-600 transition-all';
  saveButton.textContent = '保存配置';
  saveButton.addEventListener('click', handleSave);

  saveSection.appendChild(saveButton);

  page.append(header, restSection, listSection, addSection, dataSection, saveSection);
  container.appendChild(page);

  // Load config
  await loadConfig();
}

async function loadConfig(): Promise<void> {
  try {
    const config = await getConfig();
    if (!config) {
      console.error('No config found');
      return;
    }

    exercises = [...config.exercises];

    // Update project rest input
    const restInput = document.getElementById('project-rest-input') as HTMLInputElement;
    if (restInput) {
      restInput.value = config.projectRestSeconds.toString();
    }

    // Render exercise list
    renderExerciseList();
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

function renderExerciseList(): void {
  const listContainer = document.getElementById('exercise-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  exercises.forEach((exercise, index) => {
    const exerciseCard = createExerciseCard(exercise, index);
    listContainer.appendChild(exerciseCard);
  });
}

function createExerciseCard(exercise: Exercise, index: number): HTMLElement {
  const card = document.createElement('div');
  card.className = 'px-5 py-4 border-b border-gray-100 hover:bg-gray-50';
  card.dataset.index = index.toString();

  const content = document.createElement('div');
  content.className = 'flex items-start gap-3';

  // Order buttons
  const orderButtons = document.createElement('div');
  orderButtons.className = 'flex flex-col gap-1 pt-1';

  const upButton = document.createElement('button');
  upButton.className = `p-1 ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'} rounded`;
  upButton.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg>';
  upButton.disabled = index === 0;
  upButton.addEventListener('click', () => moveExercise(index, -1));

  const downButton = document.createElement('button');
  downButton.className = `p-1 ${index === exercises.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'} rounded`;
  downButton.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>';
  downButton.disabled = index === exercises.length - 1;
  downButton.addEventListener('click', () => moveExercise(index, 1));

  orderButtons.append(upButton, downButton);

  // Exercise info
  const info = document.createElement('div');
  info.className = 'flex-1 min-w-0';

  const nameRow = document.createElement('div');
  nameRow.className = 'flex items-center gap-2 mb-2';

  const orderBadge = document.createElement('span');
  orderBadge.className = 'bg-orange-100 text-orange-700 text-xs font-medium px-2 py-1 rounded';
  orderBadge.textContent = (index + 1).toString();

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = exercise.name;
  nameInput.className = 'flex-1 text-gray-900 font-medium bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-orange-400 rounded px-2 -ml-2';
  nameInput.addEventListener('change', (e) => updateExerciseName(index, (e.target as HTMLInputElement).value));

  nameRow.append(orderBadge, nameInput);

  const paramsGrid = document.createElement('div');
  paramsGrid.className = 'grid grid-cols-3 gap-2';

  // Duration
  const durationGroup = document.createElement('div');
  const durationLabel = document.createElement('label');
  durationLabel.className = 'text-gray-500 text-xs';
  durationLabel.textContent = '时长(秒)';
  const durationInput = document.createElement('input');
  durationInput.type = 'number';
  durationInput.value = exercise.setDurationSeconds.toString();
  durationInput.className = 'w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400';
  durationInput.min = '1';
  durationInput.addEventListener('change', (e) => updateExerciseDuration(index, (e.target as HTMLInputElement).value));
  durationGroup.append(durationLabel, durationInput);

  // Rest
  const restGroup = document.createElement('div');
  const restLabel = document.createElement('label');
  restLabel.className = 'text-gray-500 text-xs';
  restLabel.textContent = '休息(秒)';
  const restInput = document.createElement('input');
  restInput.type = 'number';
  restInput.value = exercise.restSeconds.toString();
  restInput.className = 'w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400';
  restInput.min = '0';
  restInput.addEventListener('change', (e) => updateExerciseRest(index, (e.target as HTMLInputElement).value));
  restGroup.append(restLabel, restInput);

  // Sets
  const setsGroup = document.createElement('div');
  const setsLabel = document.createElement('label');
  setsLabel.className = 'text-gray-500 text-xs';
  setsLabel.textContent = '组数';
  const setsInput = document.createElement('input');
  setsInput.type = 'number';
  setsInput.value = exercise.totalSets.toString();
  setsInput.className = 'w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400';
  setsInput.min = '1';
  setsInput.addEventListener('change', (e) => updateExerciseSets(index, (e.target as HTMLInputElement).value));
  setsGroup.append(setsLabel, setsInput);

  paramsGrid.append(durationGroup, restGroup, setsGroup);

  info.append(nameRow, paramsGrid);

  // Delete button
  const deleteButton = document.createElement('button');
  deleteButton.className = 'p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg mt-4';
  deleteButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>';
  deleteButton.addEventListener('click', () => deleteExercise(index));

  content.append(orderButtons, info, deleteButton);
  card.appendChild(content);

  return card;
}

function addNewExercise(): void {
  const newExercise: Exercise = {
    id: `exercise-${Date.now()}`,
    name: '新项目',
    setDurationSeconds: 60,
    restSeconds: 15,
    totalSets: 9,
    order: exercises.length,
  };

  exercises.push(newExercise);
  renderExerciseList();
}

function updateExerciseName(index: number, value: string): void {
  if (exercises[index]) {
    exercises[index].name = value.trim();
  }
}

function updateExerciseDuration(index: number, value: string): void {
  const num = parseInt(value, 10);
  if (exercises[index] && num > 0) {
    exercises[index].setDurationSeconds = num;
  }
}

function updateExerciseRest(index: number, value: string): void {
  const num = parseInt(value, 10);
  if (exercises[index] && num >= 0) {
    exercises[index].restSeconds = num;
  }
}

function updateExerciseSets(index: number, value: string): void {
  const num = parseInt(value, 10);
  if (exercises[index] && num > 0) {
    exercises[index].totalSets = num;
  }
}

function moveExercise(index: number, direction: number): void {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= exercises.length) return;

  const temp = exercises[index];
  exercises[index] = exercises[newIndex];
  exercises[newIndex] = temp;

  // Update orders
  exercises.forEach((ex, i) => ex.order = i);

  renderExerciseList();
}

function deleteExercise(index: number): void {
  if (exercises.length <= 1) {
    alert('至少保留一个锻炼项目');
    return;
  }

  if (confirm('确定要删除这个项目吗？')) {
    exercises.splice(index, 1);
    exercises.forEach((ex, i) => ex.order = i);
    renderExerciseList();
  }
}

function validateRestInput(e: Event): void {
  const input = e.target as HTMLInputElement;
  const value = parseInt(input.value, 10);
  if (isNaN(value) || value < 0) {
    input.value = '60';
  }
}

async function handleSave(): Promise<void> {
  // Validate
  const errors: string[] = [];

  if (exercises.length === 0) {
    errors.push('至少需要一个锻炼项目');
  }

  exercises.forEach((ex, index) => {
    if (!ex.name.trim()) {
      errors.push(`第 ${index + 1} 个项目名称不能为空`);
    }
    if (ex.setDurationSeconds <= 0) {
      errors.push(`第 ${index + 1} 个项目时长必须大于0`);
    }
    if (ex.totalSets <= 0) {
      errors.push(`第 ${index + 1} 个项目组数必须大于0`);
    }
    if (ex.restSeconds < 0) {
      errors.push(`第 ${index + 1} 个项目休息时间不能为负数`);
    }
  });

  const restInput = document.getElementById('project-rest-input') as HTMLInputElement;
  const projectRestSeconds = parseInt(restInput?.value || '60', 10);
  if (projectRestSeconds < 0) {
    errors.push('项目间休息时间不能为负数');
  }

  if (errors.length > 0) {
    alert('配置验证失败：\n' + errors.join('\n'));
    return;
  }

  // Save
  const config: AppConfig = {
    id: 'default',
    exercises,
    projectRestSeconds,
  };

  try {
    await saveConfig(config);

    // Show success message
    const saveButton = document.querySelector('.px-5.py-4.pb-12 button');
    if (saveButton) {
      const originalText = saveButton.textContent;
      saveButton.textContent = '已保存 ✓';
      setTimeout(() => {
        saveButton.textContent = originalText;
      }, 2000);
    }
  } catch (error) {
    console.error('Failed to save config:', error);
    alert('保存失败，请重试');
  }
}

async function handleExport(): Promise<void> {
  try {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `scoliosis-workout-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export data:', error);
    alert('导出失败，请重试');
  }
}

async function handleImport(): Promise<void> {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      await importData(data);

      // Reload config
      await loadConfig();

      alert('导入成功');
    } catch (error) {
      console.error('Failed to import data:', error);
      alert('导入失败，请检查文件格式');
    }
  };

  input.click();
}

export function cleanup(): void {
  exercises = [];
}
