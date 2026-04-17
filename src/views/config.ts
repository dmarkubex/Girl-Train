/**
 * Config View
 * Manage exercise configuration and data import/export
 */

import { getConfig, saveConfig, saveAudioFile, getAudioFile, deleteAudioFile, exportAllData, importData } from '../db';
import { createBottomNav } from '../components/bottom-nav';
import type { AppConfig, Exercise, MusicSettings, VoicePackSettings, VoiceScene } from '../types';

let exercises: Exercise[] = [];
let musicSettings: MusicSettings = { enabled: false, exerciseVolume: 0.5, restVolume: 0.3 };
let voicePackSettings: VoicePackSettings = { scenes: {} };
// Track file IDs to remove when user clears them before saving.
const pendingAudioDeletions: string[] = [];

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

  // Audio Coach Settings
  const audioSection = document.createElement('div');
  audioSection.className = 'config-group';

  const voiceContainer = document.createElement('div');
  voiceContainer.className = 'config-item';

  const voiceInfo = document.createElement('div');
  const voiceLabel = document.createElement('div');
  voiceLabel.style.fontWeight = 'bold';
  voiceLabel.style.marginBottom = '2px';
  voiceLabel.textContent = '动作语音要领';
  const voiceDesc = document.createElement('div');
  voiceDesc.style.fontSize = '12px';
  voiceDesc.style.color = 'rgba(255,255,255,0.5)';
  voiceDesc.textContent = '每组开始时播报动作重点';
  voiceInfo.append(voiceLabel, voiceDesc);

  const voiceToggle = document.createElement('input');
  voiceToggle.type = 'checkbox';
  voiceToggle.id = 'voice-guidance-toggle';

  voiceContainer.append(voiceInfo, voiceToggle);

  const countdownContainer = document.createElement('div');
  countdownContainer.className = 'config-item';

  const countdownInfo = document.createElement('div');
  const countdownLabel = document.createElement('div');
  countdownLabel.style.fontWeight = 'bold';
  countdownLabel.style.marginBottom = '2px';
  countdownLabel.textContent = '倒计时语音提醒';
  const countdownDesc = document.createElement('div');
  countdownDesc.style.fontSize = '12px';
  countdownDesc.style.color = 'rgba(255,255,255,0.5)';
  countdownDesc.textContent = '剩余 10 秒和最后 3 秒进行语音播报';
  countdownInfo.append(countdownLabel, countdownDesc);

  const countdownToggle = document.createElement('input');
  countdownToggle.type = 'checkbox';
  countdownToggle.id = 'countdown-reminder-toggle';

  countdownContainer.append(countdownInfo, countdownToggle);
  audioSection.append(voiceContainer, countdownContainer);

  // ── Music Settings ──────────────────────────────────────────────────────────
  const musicSection = createMusicSettingsSection();

  // ── Voice Pack Section ──────────────────────────────────────────────────────
  const voicePackSection = createVoicePackSection();

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

  page.append(header, restSection, audioSection, musicSection, voicePackSection, listSection, addSection, dataSection, saveSection);
  
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

    const voiceToggle = document.getElementById('voice-guidance-toggle') as HTMLInputElement | null;
    if (voiceToggle) {
      voiceToggle.checked = config.audioCoach?.voiceGuidanceEnabled ?? true;
    }

    const countdownToggle = document.getElementById('countdown-reminder-toggle') as HTMLInputElement | null;
    if (countdownToggle) {
      countdownToggle.checked = config.audioCoach?.countdownReminderEnabled ?? true;
    }

    // Music settings
    musicSettings = { ...config.musicSettings };
    populateMusicSettingsUI();

    // Voice pack settings
    voicePackSettings = { scenes: { ...config.voicePackSettings?.scenes } };
    await populateVoicePackUI();

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

  const tipGroup = document.createElement('div');
  tipGroup.className = 'param-col';
  tipGroup.style.gridColumn = '1 / -1';
  tipGroup.innerHTML = '<label>动作要领提示词</label>';
  const tipInput = document.createElement('input');
  tipInput.type = 'text';
  tipInput.value = exercise.coachingTip || '';
  tipInput.placeholder = '例：收紧核心，肩胛下沉，呼气发力';
  tipInput.addEventListener('change', (e) => updateExerciseCoachingTip(index, (e.target as HTMLInputElement).value));
  tipGroup.appendChild(tipInput);

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

  paramsGrid.append(tipGroup, durationGroup, restGroup, setsGroup);
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
    coachingTip: '',
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

function updateExerciseCoachingTip(index: number, value: string): void {
  if (exercises[index]) exercises[index].coachingTip = value.trim();
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
  const voiceToggle = document.getElementById('voice-guidance-toggle') as HTMLInputElement | null;
  const countdownToggle = document.getElementById('countdown-reminder-toggle') as HTMLInputElement | null;

  if (errors.length > 0) {
    alert('参数有误：\n' + errors.join('\n'));
    return;
  }

  // Commit any pending audio file deletions.
  for (const id of pendingAudioDeletions) {
    try { await deleteAudioFile(id); } catch { /* non-fatal */ }
  }
  pendingAudioDeletions.length = 0;

  const config: AppConfig = {
    id: 'default',
    exercises,
    projectRestSeconds,
    audioCoach: {
      voiceGuidanceEnabled: voiceToggle?.checked ?? true,
      countdownReminderEnabled: countdownToggle?.checked ?? true,
    },
    musicSettings: { ...musicSettings },
    voicePackSettings: { scenes: { ...voicePackSettings.scenes } },
  };

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
  musicSettings = { enabled: false, exerciseVolume: 0.5, restVolume: 0.3 };
  voicePackSettings = { scenes: {} };
  pendingAudioDeletions.length = 0;
}

// ─── Music Settings Section ───────────────────────────────────────────────────

function createMusicSettingsSection(): HTMLElement {
  const section = document.createElement('div');
  section.className = 'config-group';
  section.id = 'music-settings-section';

  const header = document.createElement('div');
  header.className = 'config-item';

  const info = document.createElement('div');
  const label = document.createElement('div');
  label.style.fontWeight = 'bold';
  label.style.marginBottom = '2px';
  label.textContent = '背景音乐伴奏';
  const desc = document.createElement('div');
  desc.style.fontSize = '12px';
  desc.style.color = 'rgba(255,255,255,0.5)';
  desc.textContent = '锻炼时播放本地音乐，休息时自动降低音量';
  info.append(label, desc);

  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.id = 'music-enabled-toggle';
  toggle.checked = musicSettings.enabled;
  toggle.addEventListener('change', () => {
    musicSettings.enabled = toggle.checked;
    updateMusicDetailVisibility();
  });

  header.append(info, toggle);
  section.appendChild(header);

  // Detail panel (volume sliders + file uploads)
  const detail = document.createElement('div');
  detail.id = 'music-detail-panel';
  detail.style.display = musicSettings.enabled ? 'block' : 'none';
  detail.style.padding = '0 var(--spacing-lg) var(--spacing-sm)';

  // Exercise music file row
  detail.appendChild(createMusicFileRow(
    'music-exercise-file',
    '锻炼音乐',
    '锻炼阶段播放',
    'exerciseMusicFileId',
  ));

  // Rest music file row
  detail.appendChild(createMusicFileRow(
    'music-rest-file',
    '休息音乐（可选）',
    '休息阶段切换，未上传则仅降低锻炼音乐音量',
    'restMusicFileId',
  ));

  // Volume sliders
  detail.appendChild(createVolumeSlider('music-exercise-vol', '锻炼音量', musicSettings.exerciseVolume, (v) => {
    musicSettings.exerciseVolume = v;
  }));
  detail.appendChild(createVolumeSlider('music-rest-vol', '休息音量', musicSettings.restVolume, (v) => {
    musicSettings.restVolume = v;
  }));

  section.appendChild(detail);
  return section;
}

function createMusicFileRow(
  rowId: string,
  labelText: string,
  descText: string,
  settingKey: 'exerciseMusicFileId' | 'restMusicFileId',
): HTMLElement {
  const row = document.createElement('div');
  row.style.marginBottom = '12px';

  const rowLabel = document.createElement('div');
  rowLabel.style.fontSize = '13px';
  rowLabel.style.fontWeight = 'bold';
  rowLabel.style.marginBottom = '4px';
  rowLabel.textContent = labelText;

  const rowDesc = document.createElement('div');
  rowDesc.style.fontSize = '11px';
  rowDesc.style.color = 'rgba(255,255,255,0.4)';
  rowDesc.style.marginBottom = '6px';
  rowDesc.textContent = descText;

  const statusEl = document.createElement('div');
  statusEl.id = `${rowId}-status`;
  statusEl.style.fontSize = '12px';
  statusEl.style.color = 'rgba(255,255,255,0.6)';
  statusEl.style.marginBottom = '6px';
  statusEl.textContent = musicSettings[settingKey] ? '已上传音乐文件' : '未上传';

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '8px';

  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'btn-secondary';
  uploadBtn.style.fontSize = '12px';
  uploadBtn.style.padding = '6px 12px';
  uploadBtn.textContent = '上传音频';
  uploadBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const fileId = `music-${settingKey}-${crypto.randomUUID()}`;
      await saveAudioFile({ id: fileId, name: file.name, blob: file });
      // Queue deletion of old file
      const oldId = musicSettings[settingKey];
      if (oldId) pendingAudioDeletions.push(oldId);
      musicSettings[settingKey] = fileId;
      statusEl.textContent = `✓ ${file.name}`;
      clearBtn.style.display = 'inline-block';
    };
    input.click();
  });

  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn-secondary';
  clearBtn.style.fontSize = '12px';
  clearBtn.style.padding = '6px 12px';
  clearBtn.style.display = musicSettings[settingKey] ? 'inline-block' : 'none';
  clearBtn.textContent = '清除';
  clearBtn.addEventListener('click', () => {
    const oldId = musicSettings[settingKey];
    if (oldId) pendingAudioDeletions.push(oldId);
    musicSettings[settingKey] = undefined;
    statusEl.textContent = '未上传';
    clearBtn.style.display = 'none';
  });

  btnRow.append(uploadBtn, clearBtn);
  row.append(rowLabel, rowDesc, statusEl, btnRow);
  return row;
}

function createVolumeSlider(
  id: string,
  labelText: string,
  initial: number,
  onChange: (v: number) => void,
): HTMLElement {
  const row = document.createElement('div');
  row.style.marginBottom = '12px';
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = '10px';

  const lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.style.fontSize = '13px';
  lbl.style.minWidth = '70px';
  lbl.textContent = labelText;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = id;
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.05';
  slider.value = initial.toString();
  slider.style.flex = '1';

  const pct = document.createElement('span');
  pct.style.fontSize = '12px';
  pct.style.color = 'rgba(255,255,255,0.5)';
  pct.style.minWidth = '34px';
  pct.textContent = `${Math.round(initial * 100)}%`;

  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value);
    pct.textContent = `${Math.round(v * 100)}%`;
    onChange(v);
  });

  row.append(lbl, slider, pct);
  return row;
}

function updateMusicDetailVisibility(): void {
  const panel = document.getElementById('music-detail-panel');
  if (panel) panel.style.display = musicSettings.enabled ? 'block' : 'none';
}

function populateMusicSettingsUI(): void {
  const toggle = document.getElementById('music-enabled-toggle') as HTMLInputElement | null;
  if (toggle) toggle.checked = musicSettings.enabled;

  const exStatus = document.getElementById('music-exercise-file-status');
  if (exStatus) exStatus.textContent = musicSettings.exerciseMusicFileId ? '已上传音乐文件' : '未上传';

  const restStatus = document.getElementById('music-rest-file-status');
  if (restStatus) restStatus.textContent = musicSettings.restMusicFileId ? '已上传音乐文件' : '未上传';

  const exVol = document.getElementById('music-exercise-vol') as HTMLInputElement | null;
  if (exVol) exVol.value = (musicSettings.exerciseVolume ?? 0.5).toString();

  const restVol = document.getElementById('music-rest-vol') as HTMLInputElement | null;
  if (restVol) restVol.value = (musicSettings.restVolume ?? 0.3).toString();

  updateMusicDetailVisibility();
}

// ─── Voice Pack Section ───────────────────────────────────────────────────────

const VOICE_SCENES: Array<{ key: VoiceScene; label: string; desc: string }> = [
  { key: 'exercise_start', label: '动作开始提示', desc: '每组动作开始时播放' },
  { key: 'rest_start', label: '休息开始提示', desc: '组间休息开始时播放' },
  { key: 'project_rest_start', label: '项目间休息提示', desc: '不同动作切换时播放' },
  { key: 'workout_complete', label: '锻炼完成提示', desc: '完整锻炼结束时播放' },
  { key: 'encourage', label: '激励语音', desc: '锻炼中随机插入的鼓励语' },
];

function createVoicePackSection(): HTMLElement {
  const section = document.createElement('div');
  section.className = 'config-group';
  section.id = 'voice-pack-section';

  const titleRow = document.createElement('div');
  titleRow.className = 'config-item';
  titleRow.style.flexDirection = 'column';
  titleRow.style.alignItems = 'flex-start';
  titleRow.style.gap = '4px';

  const titleEl = document.createElement('div');
  titleEl.style.fontWeight = 'bold';
  titleEl.textContent = '录音陪伴音色包';

  const titleDesc = document.createElement('div');
  titleDesc.style.fontSize = '12px';
  titleDesc.style.color = 'rgba(255,255,255,0.5)';
  titleDesc.textContent = '为每个场景上传自定义音频（MP3/WAV），未上传则使用系统语音合成';
  titleRow.append(titleEl, titleDesc);
  section.appendChild(titleRow);

  const sceneList = document.createElement('div');
  sceneList.id = 'voice-pack-scene-list';
  sceneList.style.padding = '0 var(--spacing-lg) var(--spacing-sm)';

  VOICE_SCENES.forEach(({ key, label, desc }) => {
    sceneList.appendChild(createVoiceSceneRow(key, label, desc));
  });

  section.appendChild(sceneList);
  return section;
}

function createVoiceSceneRow(scene: VoiceScene, labelText: string, descText: string): HTMLElement {
  const row = document.createElement('div');
  row.style.marginBottom = '14px';

  const lbl = document.createElement('div');
  lbl.style.fontSize = '13px';
  lbl.style.fontWeight = 'bold';
  lbl.style.marginBottom = '2px';
  lbl.textContent = labelText;

  const desc = document.createElement('div');
  desc.style.fontSize = '11px';
  desc.style.color = 'rgba(255,255,255,0.4)';
  desc.style.marginBottom = '5px';
  desc.textContent = descText;

  const statusEl = document.createElement('div');
  statusEl.id = `vp-scene-${scene}-status`;
  statusEl.style.fontSize = '12px';
  statusEl.style.color = 'rgba(255,255,255,0.6)';
  statusEl.style.marginBottom = '5px';
  statusEl.textContent = voicePackSettings.scenes[scene] ? '✓ 已上传音频' : '未上传（使用语音合成）';

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '8px';

  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'btn-secondary';
  uploadBtn.style.fontSize = '12px';
  uploadBtn.style.padding = '6px 12px';
  uploadBtn.textContent = '上传音频';
  uploadBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const fileId = `vp-${scene}-${crypto.randomUUID()}`;
      await saveAudioFile({ id: fileId, name: file.name, blob: file });
      const oldId = voicePackSettings.scenes[scene];
      if (oldId) pendingAudioDeletions.push(oldId);
      voicePackSettings.scenes[scene] = fileId;
      statusEl.textContent = `✓ ${file.name}`;
      clearBtn.style.display = 'inline-block';
    };
    input.click();
  });

  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn-secondary';
  clearBtn.style.fontSize = '12px';
  clearBtn.style.padding = '6px 12px';
  clearBtn.style.display = voicePackSettings.scenes[scene] ? 'inline-block' : 'none';
  clearBtn.textContent = '清除';
  clearBtn.addEventListener('click', () => {
    const oldId = voicePackSettings.scenes[scene];
    if (oldId) pendingAudioDeletions.push(oldId);
    delete voicePackSettings.scenes[scene];
    statusEl.textContent = '未上传（使用语音合成）';
    clearBtn.style.display = 'none';
  });

  btnRow.append(uploadBtn, clearBtn);
  row.append(lbl, desc, statusEl, btnRow);
  return row;
}

async function populateVoicePackUI(): Promise<void> {
  for (const { key } of VOICE_SCENES) {
    const statusEl = document.getElementById(`vp-scene-${key}-status`);
    if (!statusEl) continue;
    const fileId = voicePackSettings.scenes[key];
    if (fileId) {
      const record = await getAudioFile(fileId).catch(() => undefined);
      statusEl.textContent = record ? `✓ ${record.name}` : '已上传音频';
    } else {
      statusEl.textContent = '未上传（使用语音合成）';
    }
  }
}
