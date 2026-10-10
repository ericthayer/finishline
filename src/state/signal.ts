// Minimal signal: a value, a setter, and subscribers. Explicit data flow, no framework.

export interface Signal<T> {
  get(): T;
  set(value: T): void;
  subscribe(listener: (value: T) => void): () => void;
}

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  const listeners = new Set<(value: T) => void>();
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return;
      value = next;
      for (const listener of [...listeners]) listener(value);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
