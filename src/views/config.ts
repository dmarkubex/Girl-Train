/**
 * Config View
 * Manage exercise configuration and data import/export
 */

import { getConfig, saveConfig, exportAllData, importData } from '../db';
import { createBottomNav } from '../components/bottom-nav';
import type { AppConfig, Exercise } from '../types';

let exercises: Exercise[] = [];

export async function render(container: HTMLElement): Promise<void> {
  const page = document.createElement('div');
  page.className = 'app-page config-page';

  // Header
  const header = document.createElement('header');
  header.className = 'page-header';

  const title = document.createElement('h1');
  title.className = 'page-title';
  title.textContent = '锻炼配置';

  const subtitle = document.createElement('p');
  subtitle.className = 'page-subtitle';
  subtitle.textContent = '设计你的强韧之路';

  header.append(title, subtitle);

  // Project Rest Settings
  const restSection = document.createElement('div');
  restSection.className = 'config-group';

  const restContainer = document.createElement('div');
  restContainer.className = 'config-item';

  const restInfo = document.createElement('div');
  const restLabel = document.createElement('div');
  restLabel.style.fontWeight = 'bold';
  restLabel.style.marginBottom = '2px';
  restLabel.textContent = '项目间休息时长';
  const restDesc = document.createElement('div');
  restDesc.style.fontSize = '12px';
  restDesc.style.color = 'rgba(255,255,255,0.5)';
  restDesc.textContent = '动作切换的平滑间隔';

  restInfo.append(restLabel, restDesc);

  const restInputContainer = document.createElement('div');
  restInputContainer.style.display = 'flex';
  restInputContainer.style.alignItems = 'center';
  restInputContainer.style.gap = '8px';

  const restInput = document.createElement('input');
  restInput.type = 'number';
  restInput.id = 'project-rest-input';
  restInput.className = 'input-fancy';
  restInput.min = '0';
  restInput.addEventListener('change', validateRestInput);

  const restUnit = document.createElement('span');
  restUnit.style.color = 'rgba(255,255,255,0.4)';
  restUnit.style.fontSize = '14px';
  restUnit.textContent = '秒';

  restInputContainer.append(restInput, restUnit);
  restContainer.append(restInfo, restInputContainer);
  restSection.appendChild(restContainer);

  // Exercise List
  const listSection = document.createElement('div');
  listSection.className = 'exercise-list';
  listSection.id = 'exercise-list';

  // Add New Exercise Button
  const addSection = document.createElement('div');
  addSection.style.padding = '0 var(--spacing-lg) var(--spacing-lg)';

  const addButton = document.createElement('button');
  addButton.className = 'btn-secondary';
  addButton.innerHTML = '<svg class="icon-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> 添加新的锻炼动作';
  addButton.addEventListener('click', addNewExercise);

  addSection.appendChild(addButton);

  // Data Management
  const dataSection = document.createElement('div');
  dataSection.className = 'config-actions-row';

  const exportButton = document.createElement('button');
  exportButton.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;gap:6px;"><svg class="icon-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> 导出备份</div>';
  exportButton.addEventListener('click', handleExport);

  const importButton = document.createElement('button');
  importButton.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;gap:6px;"><svg class="icon-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> 导入数据</div>';
  importButton.addEventListener('click', handleImport);

  dataSection.append(exportButton, importButton);

  // Save Button
  const saveSection = document.createElement('div');
  saveSection.className = 'save-btn-container';

  const saveButton = document.createElement('button');
  saveButton.className = 'btn-save-glow';
  saveButton.textContent = '保存全部配置';
  saveButton.addEventListener('click', handleSave);

  saveSection.appendChild(saveButton);

  page.append(header, restSection, listSection, addSection, dataSection, saveSection);
  
  const nav = createBottomNav('config');
  page.appendChild(nav);
  
  container.appendChild(page);

  await loadConfig();
}

async function loadConfig(): Promise<void> {
  try {
    const config = await getConfig();
    if (!config) return;

    exercises = [...config.exercises];

    const restInput = document.getElementById('project-rest-input') as HTMLInputElement;
    if (restInput) {
      restInput.value = config.projectRestSeconds.toString();
    }

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
  card.className = 'exercise-card hover-lift';
  card.dataset.index = index.toString();

  const orderButtons = document.createElement('div');
  orderButtons.className = 'exercise-order-actions';

  const upButton = document.createElement('button');
  upButton.className = 'icon-btn';
  upButton.innerHTML = '<svg class="icon-24" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg>';
  upButton.disabled = index === 0;
  upButton.addEventListener('click', () => moveExercise(index, -1));

  const downButton = document.createElement('button');
  downButton.className = 'icon-btn';
  downButton.innerHTML = '<svg class="icon-24" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>';
  downButton.disabled = index === exercises.length - 1;
  downButton.addEventListener('click', () => moveExercise(index, 1));

  orderButtons.append(upButton, downButton);

  const info = document.createElement('div');
  info.className = 'exercise-details';

  const nameRow = document.createElement('div');
  nameRow.className = 'flex-row';

  const orderBadge = document.createElement('span');
  orderBadge.style.background = 'var(--color-primary)';
  orderBadge.style.color = '#fff';
  orderBadge.style.padding = '2px 8px';
  orderBadge.style.borderRadius = '12px';
  orderBadge.style.fontSize = '12px';
  orderBadge.style.fontWeight = 'bold';
  orderBadge.textContent = (index + 1).toString();

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = exercise.name;
  nameInput.className = 'exercise-name-input';
  nameInput.addEventListener('change', (e) => updateExerciseName(index, (e.target as HTMLInputElement).value));

  nameRow.append(orderBadge, nameInput);

  const paramsGrid = document.createElement('div');
  paramsGrid.className = 'param-grid';

  const durationGroup = document.createElement('div');
  durationGroup.className = 'param-col';
  durationGroup.innerHTML = '<label>时长 (秒)</label>';
  const durationInput = document.createElement('input');
  durationInput.type = 'number';
  durationInput.value = exercise.setDurationSeconds.toString();
  durationInput.min = '1';
  durationInput.addEventListener('change', (e) => updateExerciseDuration(index, (e.target as HTMLInputElement).value));
  durationGroup.appendChild(durationInput);

  const restGroup = document.createElement('div');
  restGroup.className = 'param-col';
  restGroup.innerHTML = '<label>组间休息</label>';
  const restInput = document.createElement('input');
  restInput.type = 'number';
  restInput.value = exercise.restSeconds.toString();
  restInput.min = '0';
  restInput.addEventListener('change', (e) => updateExerciseRest(index, (e.target as HTMLInputElement).value));
  restGroup.appendChild(restInput);

  const setsGroup = document.createElement('div');
  setsGroup.className = 'param-col';
  setsGroup.innerHTML = '<label>循环组数</label>';
  const setsInput = document.createElement('input');
  setsInput.type = 'number';
  setsInput.value = exercise.totalSets.toString();
  setsInput.min = '1';
  setsInput.addEventListener('change', (e) => updateExerciseSets(index, (e.target as HTMLInputElement).value));
  setsGroup.appendChild(setsInput);

  paramsGrid.append(durationGroup, restGroup, setsGroup);
  info.append(nameRow, paramsGrid);

  const deleteButton = document.createElement('button');
  deleteButton.className = 'icon-btn danger';
  deleteButton.style.marginTop = '4px';
  deleteButton.innerHTML = '<svg class="icon-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>';
  deleteButton.addEventListener('click', () => deleteExercise(index));

  card.append(orderButtons, info, deleteButton);
  return card;
}

function addNewExercise(): void {
  const newExercise: Exercise = {
    id: `ex-${Date.now()}`,
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
  if (exercises[index]) exercises[index].name = value.trim();
}
function updateExerciseDuration(index: number, value: string): void {
  const num = parseInt(value, 10);
  if (exercises[index] && num > 0) exercises[index].setDurationSeconds = num;
}
function updateExerciseRest(index: number, value: string): void {
  const num = parseInt(value, 10);
  if (exercises[index] && num >= 0) exercises[index].restSeconds = num;
}
function updateExerciseSets(index: number, value: string): void {
  const num = parseInt(value, 10);
  if (exercises[index] && num > 0) exercises[index].totalSets = num;
}

function moveExercise(index: number, direction: number): void {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= exercises.length) return;
  const temp = exercises[index];
  exercises[index] = exercises[newIndex];
  exercises[newIndex] = temp;
  exercises.forEach((ex, i) => ex.order = i);
  renderExerciseList();
}

function deleteExercise(index: number): void {
  if (exercises.length <= 1) {
    alert('至少保留一条锻炼项目');
    return;
  }
  if (confirm('确定要删除？记录不可恢复。')) {
    exercises.splice(index, 1);
    exercises.forEach((ex, i) => ex.order = i);
    renderExerciseList();
  }
}

function validateRestInput(e: Event): void {
  const input = e.target as HTMLInputElement;
  const value = parseInt(input.value, 10);
  if (isNaN(value) || value < 0) input.value = '60';
}

async function handleSave(): Promise<void> {
  const errors: string[] = [];
  if (exercises.length === 0) errors.push('无有效锻炼项目');

  exercises.forEach((ex, index) => {
    if (!ex.name.trim()) errors.push(`第 ${index + 1} 个名称不能为空`);
    if (ex.setDurationSeconds <= 0) errors.push(`第 ${index + 1} 个时长异常`);
    if (ex.totalSets <= 0) errors.push(`第 ${index + 1} 个组数异常`);
    if (ex.restSeconds < 0) errors.push(`第 ${index + 1} 个休息异常`);
  });

  const restInput = document.getElementById('project-rest-input') as HTMLInputElement;
  const projectRestSeconds = parseInt(restInput?.value || '60', 10);

  if (errors.length > 0) {
    alert('参数有误：\n' + errors.join('\n'));
    return;
  }

  const config: AppConfig = { id: 'default', exercises, projectRestSeconds };

  try {
    await saveConfig(config);
    const saveButton = document.querySelector('.btn-save-glow');
    if (saveButton) {
      const originalText = saveButton.textContent;
      saveButton.textContent = '保存成功 ✓';
      setTimeout(() => { saveButton.textContent = originalText; }, 2000);
    }
  } catch (error) {
    console.error('Save failed:', error);
    alert('保存失败，请重试');
  }
}

async function handleExport(): Promise<void> {
  try {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    alert('导出失败');
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
      await importData(JSON.parse(text));
      await loadConfig();
      alert('还原成功');
    } catch (error) {
      alert('格式无法识别');
    }
  };
  input.click();
}

export function cleanup(): void {
  exercises = [];
}
