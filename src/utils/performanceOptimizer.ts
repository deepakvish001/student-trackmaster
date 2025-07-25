
// Performance optimization utilities
class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private componentCache: Map<string, any> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // Debounce function calls to reduce unnecessary operations
  debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        func.apply(null, args);
        this.debounceTimers.delete(key);
      }, delay);

      this.debounceTimers.set(key, timer);
    };
  }

  // Cache expensive computations
  memoize<T>(key: string, computation: () => T, ttl: number = 60000): T {
    const cached = this.componentCache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < ttl) {
      return cached.value;
    }

    const value = computation();
    this.componentCache.set(key, {
      value,
      timestamp: now
    });

    return value;
  }

  // Clear old cache entries
  clearExpiredCache(): void {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    for (const [key, cached] of this.componentCache.entries()) {
      if (now - cached.timestamp > maxAge) {
        this.componentCache.delete(key);
      }
    }
  }

  // Cleanup method
  cleanup(): void {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    
    // Clear cache
    this.componentCache.clear();
  }
}

export const performanceOptimizer = PerformanceOptimizer.getInstance();

// Auto cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceOptimizer.cleanup();
  });
}
