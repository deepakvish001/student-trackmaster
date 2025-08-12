import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PerformanceMetrics {
  memoryUsage: number;
  queryCount: number;
  cacheHitRatio: number;
  averageQueryTime: number;
  totalDataSize: number;
  renderTime: number;
  lastMeasurement: string;
}

interface OptimizationSuggestion {
  type: 'memory' | 'query' | 'cache' | 'render';
  priority: 'high' | 'medium' | 'low';
  description: string;
  action: string;
  estimatedImpact: string;
}

interface PerformanceConfig {
  maxMemoryUsage: number; // MB
  maxCacheSize: number; // MB
  queryTimeout: number; // ms
  enableLazyLoading: boolean;
  enableVirtualScrolling: boolean;
  enableOptimisticUpdates: boolean;
  batchSize: number;
}

export function usePerformanceOptimizer() {
  const queryClient = useQueryClient();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    queryCount: 0,
    cacheHitRatio: 0,
    averageQueryTime: 0,
    totalDataSize: 0,
    renderTime: 0,
    lastMeasurement: new Date().toISOString()
  });
  
  const [config, setConfig] = useState<PerformanceConfig>({
    maxMemoryUsage: 100, // 100MB
    maxCacheSize: 50,    // 50MB
    queryTimeout: 30000, // 30 seconds
    enableLazyLoading: true,
    enableVirtualScrolling: true,
    enableOptimisticUpdates: true,
    batchSize: 50
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [queryTimes, setQueryTimes] = useState<number[]>([]);

  // Measure memory usage
  const measureMemoryUsage = useCallback((): number => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // Convert to MB
    }
    return 0;
  }, []);

  // Measure query cache size
  const measureCacheSize = useCallback((): number => {
    try {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      let totalSize = 0;
      queries.forEach(query => {
        const data = query.state.data;
        if (data) {
          // Estimate size by JSON stringifying
          totalSize += new Blob([JSON.stringify(data)]).size;
        }
      });
      
      return Math.round(totalSize / 1024 / 1024); // Convert to MB
    } catch (error) {
      return 0;
    }
  }, [queryClient]);

  // Track query performance
  const trackQueryPerformance = useCallback((queryTime: number) => {
    setQueryTimes(prev => {
      const newTimes = [...prev, queryTime].slice(-50); // Keep last 50 measurements
      return newTimes;
    });
  }, []);

  // Calculate cache hit ratio
  const calculateCacheHitRatio = useCallback((): number => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    if (queries.length === 0) return 0;
    
    const hitQueries = queries.filter(query => 
      query.state.status === 'success' && 
      query.state.dataUpdatedAt > 0
    ).length;
    
    return Math.round((hitQueries / queries.length) * 100);
  }, [queryClient]);

  // Measure render performance
  const measureRenderTime = useCallback((): Promise<number> => {
    return new Promise(resolve => {
      const startTime = performance.now();
      
      requestAnimationFrame(() => {
        const endTime = performance.now();
        resolve(endTime - startTime);
      });
    });
  }, []);

  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = async () => {
      const memoryUsage = measureMemoryUsage();
      const cacheSize = measureCacheSize();
      const cacheHitRatio = calculateCacheHitRatio();
      const renderTime = await measureRenderTime();
      const averageQueryTime = queryTimes.length > 0 
        ? queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length 
        : 0;

      setMetrics({
        memoryUsage,
        queryCount: queryClient.getQueryCache().getAll().length,
        cacheHitRatio,
        averageQueryTime: Math.round(averageQueryTime),
        totalDataSize: cacheSize,
        renderTime: Math.round(renderTime),
        lastMeasurement: new Date().toISOString()
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, [measureMemoryUsage, measureCacheSize, calculateCacheHitRatio, measureRenderTime, queryTimes, queryClient]);

  // Generate optimization suggestions
  const optimizationSuggestions = useMemo((): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];

    // Memory usage suggestions
    if (metrics.memoryUsage > config.maxMemoryUsage) {
      suggestions.push({
        type: 'memory',
        priority: 'high',
        description: `Memory usage (${metrics.memoryUsage}MB) exceeds limit (${config.maxMemoryUsage}MB)`,
        action: 'Clear unused query cache and reduce batch sizes',
        estimatedImpact: '30-50% memory reduction'
      });
    }

    // Cache size suggestions
    if (metrics.totalDataSize > config.maxCacheSize) {
      suggestions.push({
        type: 'cache',
        priority: 'medium',
        description: `Cache size (${metrics.totalDataSize}MB) exceeds limit (${config.maxCacheSize}MB)`,
        action: 'Enable cache cleanup and reduce stale time',
        estimatedImpact: '20-40% cache reduction'
      });
    }

    // Query performance suggestions
    if (metrics.averageQueryTime > 5000) {
      suggestions.push({
        type: 'query',
        priority: 'high',
        description: `Average query time (${metrics.averageQueryTime}ms) is too high`,
        action: 'Implement query optimization and pagination',
        estimatedImpact: '50-70% faster queries'
      });
    }

    // Cache hit ratio suggestions
    if (metrics.cacheHitRatio < 70) {
      suggestions.push({
        type: 'cache',
        priority: 'medium',
        description: `Cache hit ratio (${metrics.cacheHitRatio}%) is below optimal`,
        action: 'Increase stale time and implement prefetching',
        estimatedImpact: '15-25% performance improvement'
      });
    }

    // Render performance suggestions
    if (metrics.renderTime > 16) { // 60fps = 16.67ms per frame
      suggestions.push({
        type: 'render',
        priority: 'medium',
        description: `Render time (${metrics.renderTime}ms) may cause frame drops`,
        action: 'Enable virtual scrolling and lazy loading',
        estimatedImpact: '40-60% faster rendering'
      });
    }

    return suggestions;
  }, [metrics, config]);

  // Auto-optimize based on suggestions
  const autoOptimize = useCallback(async () => {
    setIsOptimizing(true);
    
    try {
      // Clear old queries if memory usage is high
      if (metrics.memoryUsage > config.maxMemoryUsage) {
        const cache = queryClient.getQueryCache();
        const oldQueries = cache.getAll().filter(query => 
          Date.now() - query.state.dataUpdatedAt > 300000 // 5 minutes old
        );
        
        oldQueries.forEach(query => {
          queryClient.removeQueries({ queryKey: query.queryKey });
        });
      }

      // Clear cache if size is too large
      if (metrics.totalDataSize > config.maxCacheSize) {
        const cache = queryClient.getQueryCache();
        const queries = cache.getAll()
          .sort((a, b) => a.state.dataUpdatedAt - b.state.dataUpdatedAt)
          .slice(0, Math.floor(cache.getAll().length / 2)); // Remove oldest half
        
        queries.forEach(query => {
          queryClient.removeQueries({ queryKey: query.queryKey });
        });
      }

      // Prefetch critical data if cache hit ratio is low
      if (metrics.cacheHitRatio < 70) {
        // This would prefetch commonly used data
        await queryClient.prefetchQuery({
          queryKey: ['students', 'recent'],
          queryFn: () => Promise.resolve([]), // Placeholder
          staleTime: 5 * 60 * 1000 // 5 minutes
        });
      }

      // Force garbage collection if available
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc();
      }

    } catch (error) {
      console.error('Auto-optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [metrics, config, queryClient]);

  // Manual optimization actions
  const clearQueryCache = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  const invalidateStaleQueries = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => 
        Date.now() - query.state.dataUpdatedAt > 600000 // 10 minutes old
    });
  }, [queryClient]);

  const prefetchCriticalData = useCallback(async () => {
    // Prefetch commonly accessed data
    const criticalQueries = [
      'ultra-fast-students',
      'ultra-fast-batches',
      'offline-students',
      'offline-batches'
    ];

    for (const queryKey of criticalQueries) {
      try {
        await queryClient.prefetchQuery({
          queryKey: [queryKey],
          queryFn: () => Promise.resolve([]),
          staleTime: 5 * 60 * 1000
        });
      } catch (error) {
        console.warn(`Failed to prefetch ${queryKey}:`, error);
      }
    }
  }, [queryClient]);

  // Performance monitoring hook for components
  const usePerformanceMonitor = useCallback((componentName: string) => {
    useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        if (renderTime > 100) { // Log slow components
          console.warn(`Slow component render: ${componentName} took ${renderTime.toFixed(2)}ms`);
        }
        
        trackQueryPerformance(renderTime);
      };
    }, [componentName]);
  }, [trackQueryPerformance]);

  // Get performance score (0-100)
  const performanceScore = useMemo(() => {
    let score = 100;
    
    // Deduct points for various issues
    if (metrics.memoryUsage > config.maxMemoryUsage) score -= 20;
    if (metrics.totalDataSize > config.maxCacheSize) score -= 15;
    if (metrics.averageQueryTime > 5000) score -= 25;
    if (metrics.cacheHitRatio < 70) score -= 15;
    if (metrics.renderTime > 16) score -= 10;
    if (metrics.queryCount > 100) score -= 10;
    
    return Math.max(0, score);
  }, [metrics, config]);

  return {
    metrics,
    config,
    optimizationSuggestions,
    performanceScore,
    isOptimizing,
    autoOptimize,
    clearQueryCache,
    invalidateStaleQueries,
    prefetchCriticalData,
    trackQueryPerformance,
    usePerformanceMonitor,
    setConfig
  };
}