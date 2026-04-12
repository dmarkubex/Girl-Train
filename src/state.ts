type Listener = (data: unknown) => void;

const state = new Map<string, unknown>();
const listeners = new Map<string, Set<Listener>>();

/**
 * Subscribe to state changes for a key.
 * Returns an unsubscribe function.
 */
export function subscribe(key: string, listener: Listener): () => void {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key)!.add(listener);

  // Return unsubscribe function
  return () => {
    const keyListeners = listeners.get(key);
    if (keyListeners) {
      keyListeners.delete(listener);
      if (keyListeners.size === 0) {
        listeners.delete(key);
      }
    }
  };
}

/**
 * Publish a state change to all listeners of a key.
 */
export function publish(key: string, data: unknown): void {
  const keyListeners = listeners.get(key);
  if (keyListeners) {
    keyListeners.forEach(listener => listener(data));
  }
}

/**
 * Get current state value for a key.
 */
export function getState<T = unknown>(key: string): T | undefined {
  return state.get(key) as T | undefined;
}

/**
 * Set state value for a key and publish change.
 */
export function setState(key: string, value: unknown): void {
  state.set(key, value);
  publish(key, value);
}
