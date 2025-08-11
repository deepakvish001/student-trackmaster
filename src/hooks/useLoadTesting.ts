import { useState, useCallback, useRef } from 'react';

interface LoadTestResult {
  testName: string;
  duration: number;
  operationsPerSecond: number;
  successRate: number;
  errorCount: number;
  averageResponseTime: number;
  memoryUsage?: number;
  timestamp: Date;
}

interface LoadTestState {
  isRunning: boolean;
  currentTest: string | null;
  results: LoadTestResult[];
  progress: number;
  errors: string[];
}

export function useLoadTesting() {
  const [state, setState] = useState<LoadTestState>({
    isRunning: false,
    currentTest: null,
    results: [],
    progress: 0,
    errors: []
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startTest = useCallback((testName: string) => {
    setState(prev => ({
      ...prev,
      isRunning: true,
      currentTest: testName,
      progress: 0,
      errors: []
    }));
    abortControllerRef.current = new AbortController();
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, progress }));
  }, []);

  const addError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      errors: [...prev.errors, error]
    }));
  }, []);

  const completeTest = useCallback((result: LoadTestResult) => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      currentTest: null,
      progress: 100,
      results: [...prev.results, result]
    }));
    abortControllerRef.current = null;
  }, []);

  const stopTest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(prev => ({
      ...prev,
      isRunning: false,
      currentTest: null,
      progress: 0
    }));
  }, []);

  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: [],
      errors: []
    }));
  }, []);

  // Memory monitoring
  const getMemoryUsage = useCallback((): number => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100; // MB
    }
    return 0;
  }, []);

  // Performance timing helper
  const measureOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    signal?: AbortSignal
  ): Promise<{ result: T; duration: number }> => {
    const startTime = performance.now();
    const result = await operation();
    const duration = performance.now() - startTime;
    
    if (signal?.aborted) {
      throw new Error('Operation aborted');
    }
    
    return { result, duration };
  }, []);

  return {
    state,
    startTest,
    updateProgress,
    addError,
    completeTest,
    stopTest,
    clearResults,
    getMemoryUsage,
    measureOperation,
    abortSignal: abortControllerRef.current?.signal
  };
}