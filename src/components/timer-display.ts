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
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function createTimerDisplay(props: TimerDisplayProps): HTMLElement {
  const container = document.createElement('div');
  container.className = 'timer-display-container flex-1 flex flex-col items-center justify-center px-5';

  // Exercise number
  const exerciseNumber = document.createElement('p');
  exerciseNumber.className = 'text-gray-400 text-lg mb-2';
  exerciseNumber.textContent = `第 ${props.exerciseIndex + 1} 个项目`;

  // Exercise name
  const exerciseName = document.createElement('h1');
  exerciseName.className = 'text-white text-3xl font-bold mb-8';
  exerciseName.textContent = props.exerciseName;

  // Set counter
  const setCounter = document.createElement('div');
  setCounter.className = 'text-gray-400 text-lg mb-6';
  setCounter.innerHTML = `第 <span class="text-orange-400 text-2xl font-bold">${props.setIndex + 1}</span> / <span class="text-white text-2xl font-bold">${props.totalSets}</span> 组`;

  // Countdown timer
  const countdownContainer = document.createElement('div');
  countdownContainer.className = 'timer-font text-white text-8xl font-bold mb-8';
  countdownContainer.id = 'countdown-timer';
  countdownContainer.textContent = formatTime(props.remainingSeconds);

  // Set progress indicators
  const setProgress = document.createElement('div');
  setProgress.className = 'w-full max-w-xs';
  const progressContainer = document.createElement('div');
  progressContainer.className = 'flex gap-1 justify-center';

  for (let i = 0; i < props.totalSets; i++) {
    const dot = document.createElement('div');
    dot.className = 'w-8 h-2 rounded-full';
    if (i < props.setIndex) {
      dot.className += ' bg-orange-400';
    } else if (i === props.setIndex) {
      dot.className += ' bg-orange-400 animate-pulse';
    } else {
      dot.className += ' bg-gray-700';
    }
    progressContainer.appendChild(dot);
  }
  setProgress.appendChild(progressContainer);

  container.append(exerciseNumber, exerciseName, setCounter, countdownContainer, setProgress);

  return container;
}

export function updateTimerDisplay(props: Partial<TimerDisplayProps>): void {
  const countdownTimer = document.getElementById('countdown-timer');
  if (countdownTimer && props.remainingSeconds !== undefined) {
    countdownTimer.textContent = formatTime(props.remainingSeconds);
  }
}
