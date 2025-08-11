import { useState, useEffect, useCallback, useRef } from 'react';

interface DebounceState {
  timer: NodeJS.Timeout | null;
}

export function useStableEffect(
  callback: () => void | (() => void),
  deps: React.DependencyList,
  delay: number = 100
) {
  const stableRef = useRef<DebounceState>({ timer: null });
  const callbackRef = useRef(callback);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    // Clear any existing timer
    if (stableRef.current.timer) {
      clearTimeout(stableRef.current.timer);
    }

    // Clear previous cleanup
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Set new timer
    stableRef.current.timer = setTimeout(() => {
      const cleanup = callbackRef.current();
      if (typeof cleanup === 'function') {
        cleanupRef.current = cleanup;
      }
    }, delay);

    // Cleanup function
    return () => {
      if (stableRef.current.timer) {
        clearTimeout(stableRef.current.timer);
      }
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, deps);
}

export function useStableState<T>(initialState: T | (() => T)) {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setStableState = useCallback((update: T | ((prev: T) => T)) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setState(prev => {
        const newState = typeof update === 'function' ? (update as (prev: T) => T)(prev) : update;
        stateRef.current = newState;
        return newState;
      });
    }, 50);
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  return [state, setStableState, stateRef] as const;
}