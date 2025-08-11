import { useRef, useCallback } from 'react';

interface ThrottleOptions {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
}

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  options: ThrottleOptions
): T {
  const { delay, leading = true, trailing = true } = options;
  const lastCallTime = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgs = useRef<Parameters<T> | null>(null);

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime.current;

    lastArgs.current = args;

    if (timeSinceLastCall >= delay) {
      if (leading) {
        lastCallTime.current = now;
        return callback(...args);
      }
    }

    if (trailing && timeoutRef.current === null) {
      timeoutRef.current = setTimeout(() => {
        lastCallTime.current = Date.now();
        timeoutRef.current = null;
        if (lastArgs.current) {
          callback(...lastArgs.current);
        }
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay, leading, trailing]);

  return throttledCallback as T;
}

export function useNotificationThrottle() {
  const notificationHistory = useRef<{ [key: string]: number }>({});
  const NOTIFICATION_THROTTLE_TIME = 30000; // 30 seconds

  const shouldShowNotification = useCallback((key: string) => {
    const now = Date.now();
    const lastShown = notificationHistory.current[key] || 0;
    
    if (now - lastShown >= NOTIFICATION_THROTTLE_TIME) {
      notificationHistory.current[key] = now;
      return true;
    }
    
    return false;
  }, []);

  const clearNotificationHistory = useCallback((key?: string) => {
    if (key) {
      delete notificationHistory.current[key];
    } else {
      notificationHistory.current = {};
    }
  }, []);

  return {
    shouldShowNotification,
    clearNotificationHistory
  };
}