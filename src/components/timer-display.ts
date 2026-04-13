/**
 * Timer Display Component
 * Renders the main workout timer with exercise name, countdown, set counter, and phase label
 */

export interface TimerDisplayProps {
  exerciseName: string;
  exerciseIndex: number;
  totalExercises: number;
  setIndex: number;
  totalSets: number;
  remainingSeconds: number;
  phase: 'exercise' | 'rest' | 'project-rest';
  isPaused: boolean;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function createTimerDisplay(props: TimerDisplayProps): HTMLElement {
  const container = document.createElement('div');
  container.className = 'timer-section';

  // Exercise number
  const exerciseNumber = document.createElement('p');
  exerciseNumber.className = 'timer-exercise-num';
  exerciseNumber.textContent = `第 ${props.exerciseIndex + 1} 个项目`;

  // Exercise name
  const exerciseName = document.createElement('h1');
  exerciseName.className = 'timer-exercise-name';
  exerciseName.textContent = props.exerciseName;

  // Set counter
  const setCounter = document.createElement('div');
  setCounter.className = 'timer-sets';
  setCounter.innerHTML = `第 <span class="current-set">${props.setIndex + 1}</span> / <span>${props.totalSets}</span> 组`;

  // Countdown timer
  const countdownContainer = document.createElement('div');
  countdownContainer.className = 'countdown-digits';
  countdownContainer.id = 'countdown-timer';
  countdownContainer.textContent = formatTime(props.remainingSeconds);

  // Set progress indicators
  const setProgress = document.createElement('div');
  setProgress.className = 'sets-dots';

  for (let i = 0; i < props.totalSets; i++) {
    const dot = document.createElement('div');
    dot.className = 'set-dot';
    if (i < props.setIndex) {
      dot.classList.add('done');
    } else if (i === props.setIndex) {
      dot.classList.add('active');
    }
    setProgress.appendChild(dot);
  }

  container.append(exerciseNumber, exerciseName, setCounter, countdownContainer, setProgress);

  return container;
}

export function updateTimerDisplay(props: Partial<TimerDisplayProps>): void {
  const countdownTimer = document.getElementById('countdown-timer');
  if (countdownTimer && props.remainingSeconds !== undefined) {
    countdownTimer.textContent = formatTime(props.remainingSeconds);
  }
}
