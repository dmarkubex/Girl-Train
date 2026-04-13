/**
 * Progress Bar Component
 * Displays overall workout progress with phase-based coloring
 */

export interface ProgressBarProps {
  currentExerciseIndex: number;
  totalExercises: number;
  currentSetIndex: number;
  totalSets: number;
  phase: 'exercise' | 'rest' | 'project-rest';
}

export function createProgressBar(props: ProgressBarProps): HTMLElement {
  const container = document.createElement('div');
  container.className = 'top-progress';

  // Label row
  const labelRow = document.createElement('div');
  labelRow.className = 'prog-label-row';

  const progressLabel = document.createElement('span');
  progressLabel.textContent = '整体进度';

  const progressDetail = document.createElement('span');
  progressDetail.id = 'progress-detail';
  progressDetail.textContent = `${props.currentExerciseIndex + 1} / ${props.totalExercises} 项目`;

  labelRow.append(progressLabel, progressDetail);

  // Progress bar track
  const track = document.createElement('div');
  track.className = 'prog-track';

  const fill = document.createElement('div');
  fill.id = 'progress-fill';
  fill.className = 'prog-fill';

  // Calculate progress percentage
  const exerciseProgress = props.currentExerciseIndex / props.totalExercises;
  const setProgress = props.currentSetIndex / props.totalSets;
  const totalProgress = exerciseProgress + (setProgress / props.totalExercises);
  const percentage = Math.min(Math.max(totalProgress * 100, 0), 100);

  // Set color based on phase
  const phaseColor = getPhaseColor(props.phase);
  fill.style.backgroundColor = phaseColor;
  fill.style.width = `${percentage}%`;

  track.appendChild(fill);
  container.append(labelRow, track);

  return container;
}

export function updateProgressBar(props: Partial<ProgressBarProps>): void {
  const progressDetail = document.getElementById('progress-detail');
  const progressFill = document.getElementById('progress-fill');

  if (progressDetail && props.currentExerciseIndex !== undefined && props.totalExercises !== undefined) {
    progressDetail.textContent = `${props.currentExerciseIndex + 1} / ${props.totalExercises} 项目`;
  }

  if (progressFill) {
    // Recalculate if we have all the data
    if (
      props.currentExerciseIndex !== undefined &&
      props.totalExercises !== undefined &&
      props.currentSetIndex !== undefined &&
      props.totalSets !== undefined
    ) {
      const exerciseProgress = props.currentExerciseIndex / props.totalExercises;
      const setProgress = props.currentSetIndex / props.totalSets;
      const totalProgress = exerciseProgress + (setProgress / props.totalExercises);
      const percentage = Math.min(Math.max(totalProgress * 100, 0), 100);
      progressFill.style.width = `${percentage}%`;
    }

    // Update color if phase changed
    if (props.phase !== undefined) {
      const phaseColor = getPhaseColor(props.phase);
      progressFill.style.backgroundColor = phaseColor;
      progressFill.style.boxShadow = `0 0 10px ${phaseColor}`;
    }
  }
}

function getPhaseColor(phase: 'exercise' | 'rest' | 'project-rest'): string {
  switch (phase) {
    case 'exercise':
      return '#FF6B35'; 
    case 'rest':
      return '#10B981'; 
    case 'project-rest':
      return '#0072FF'; 
  }
}
