import { useState, useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  networkLatency: number;
  lastUpdate: Date;
}

interface OptimizationState {
  isOptimizing: boolean;
  metrics: PerformanceMetrics;
  suggestions: string[];
  autoOptimizeEnabled: boolean;
}

/**
 * Ultra-performance optimization hook for PWA
 * Monitors and optimizes app performance in real-time
 */
export function useUltraPerformanceOptimizer() {
  const [state, setState] = useState<OptimizationState>({
    isOptimizing: false,
    metrics: {
      renderTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      networkLatency: 0,
      lastUpdate: new Date()
    },
    suggestions: [],
    autoOptimizeEnabled: true
  });

  const performanceObserver = useRef<PerformanceObserver | null>(null);
  const memoryRef = useRef<any>(null);
  const optimizationInterval = useRef<NodeJS.Timeout | null>(null);
  const renderStartTime = useRef<number>(0);

  // Measure render performance
  const measureRenderTime = useCallback(() => {
    renderStartTime.current = performance.now();
    
    // Use requestAnimationFrame for accurate render timing
    requestAnimationFrame(() => {
      const renderTime = performance.now() - renderStartTime.current;
      
      setState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          renderTime,
          lastUpdate: new Date()
        }
      }));
    });
  }, []);

  // Monitor memory usage
  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
      
      setState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          memoryUsage,
          lastUpdate: new Date()
        }
      }));
    }
  }, []);

  // Monitor network performance
  const measureNetworkLatency = useCallback(async () => {
    try {
      const startTime = performance.now();
      await fetch('/api/health-check', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const networkLatency = performance.now() - startTime;
      
      setState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          networkLatency,
          lastUpdate: new Date()
        }
      }));
    } catch (error) {
      console.warn('[Performance] Network latency test failed:', error);
    }
  }, []);

  // Check service worker cache performance
  const measureCachePerformance = useCallback(async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        // Request performance metrics from service worker
        const channel = new MessageChannel();
        
        const metricsPromise = new Promise<any>((resolve) => {
          channel.port1.onmessage = (event) => {
            resolve(event.data);
          };
          
          setTimeout(() => resolve(null), 1000); // Timeout after 1 second
        });

        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_PERFORMANCE_METRICS' },
          [channel.port2]
        );

        const metrics = await metricsPromise;
        
        if (metrics) {
          const total = metrics.cacheHits + metrics.cacheMisses;
          const cacheHitRate = total > 0 ? (metrics.cacheHits / total) * 100 : 0;
          
          setState(prev => ({
            ...prev,
            metrics: {
              ...prev.metrics,
              cacheHitRate,
              lastUpdate: new Date()
            }
          }));
        }
      } catch (error) {
        console.warn('[Performance] Cache metrics failed:', error);
      }
    }
  }, []);

  // Generate optimization suggestions
  const generateSuggestions = useCallback((metrics: PerformanceMetrics) => {
    const suggestions: string[] = [];
    
    if (metrics.renderTime > 16) { // 60fps = 16.67ms per frame
      suggestions.push('Render time is high - consider optimizing components');
    }
    
    if (metrics.memoryUsage > 80) {
      suggestions.push('Memory usage is high - check for memory leaks');
    }
    
    if (metrics.cacheHitRate < 70) {
      suggestions.push('Cache hit rate is low - optimize caching strategy');
    }
    
    if (metrics.networkLatency > 500) {
      suggestions.push('Network latency is high - consider data optimization');
    }
    
    return suggestions;
  }, []);

  // Perform automatic optimizations
  const performAutoOptimizations = useCallback(async () => {
    if (!state.autoOptimizeEnabled) return;
    
    setState(prev => ({ ...prev, isOptimizing: true }));
    
    try {
      // Clean up unused objects
      if (state.metrics.memoryUsage > 75) {
        // Force garbage collection if available
        if ('gc' in window && typeof window.gc === 'function') {
          window.gc();
        }
        
        // Clear unused caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          const oldCaches = cacheNames.filter(name => !name.includes('v2.0.0'));
          await Promise.all(oldCaches.map(name => caches.delete(name)));
        }
      }
      
      // Optimize network requests
      if (state.metrics.networkLatency > 300) {
        // Preload critical resources
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'PRELOAD_CRITICAL',
            payload: ['/dashboard', '/students', '/batches']
          });
        }
      }
      
      console.log('[Performance] Auto-optimizations completed');
    } catch (error) {
      console.error('[Performance] Auto-optimization failed:', error);
    } finally {
      setState(prev => ({ ...prev, isOptimizing: false }));
    }
  }, [state.autoOptimizeEnabled, state.metrics]);

  // Run comprehensive performance analysis
  const runPerformanceAnalysis = useCallback(async () => {
    measureRenderTime();
    measureMemoryUsage();
    await measureNetworkLatency();
    await measureCachePerformance();
  }, [measureRenderTime, measureMemoryUsage, measureNetworkLatency, measureCachePerformance]);

  // Update suggestions when metrics change
  useEffect(() => {
    const suggestions = generateSuggestions(state.metrics);
    setState(prev => ({ ...prev, suggestions }));
    
    // Trigger auto-optimizations if needed
    if (suggestions.length > 0 && state.autoOptimizeEnabled) {
      performAutoOptimizations();
    }
  }, [state.metrics, generateSuggestions, performAutoOptimizations, state.autoOptimizeEnabled]);

  // Set up performance monitoring
  useEffect(() => {
    // Set up PerformanceObserver for detailed metrics
    if ('PerformanceObserver' in window) {
      performanceObserver.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
            console.log('[Performance]', entry.name, entry.duration);
          }
        });
      });
      
      try {
        performanceObserver.current.observe({ 
          entryTypes: ['measure', 'navigation', 'resource'] 
        });
      } catch (error) {
        console.warn('[Performance] PerformanceObserver setup failed:', error);
      }
    }
    
    // Set up regular monitoring interval
    optimizationInterval.current = setInterval(() => {
      runPerformanceAnalysis();
    }, 30000); // Every 30 seconds
    
    // Initial analysis
    runPerformanceAnalysis();
    
    return () => {
      if (performanceObserver.current) {
        performanceObserver.current.disconnect();
      }
      if (optimizationInterval.current) {
        clearInterval(optimizationInterval.current);
      }
    };
  }, [runPerformanceAnalysis]);

  // Manual optimization trigger
  const optimizeNow = useCallback(async () => {
    await runPerformanceAnalysis();
    await performAutoOptimizations();
  }, [runPerformanceAnalysis, performAutoOptimizations]);

  // Toggle auto-optimization
  const toggleAutoOptimize = useCallback(() => {
    setState(prev => ({
      ...prev,
      autoOptimizeEnabled: !prev.autoOptimizeEnabled
    }));
  }, []);

  return {
    metrics: state.metrics,
    suggestions: state.suggestions,
    isOptimizing: state.isOptimizing,
    autoOptimizeEnabled: state.autoOptimizeEnabled,
    optimizeNow,
    toggleAutoOptimize,
    measureRenderTime
  };
}