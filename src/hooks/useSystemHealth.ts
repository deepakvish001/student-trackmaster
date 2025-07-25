
/**
 * Phase 4: System Health Hook
 * React hook for system health monitoring and integration testing
 */

import { useState, useEffect, useRef } from 'react';
import { systemIntegrationManager, SystemHealthStatus, IntegrationTestResult } from '@/services/systemIntegrationManager';

interface UseSystemHealthOptions {
  autoInitialize?: boolean;
  refreshInterval?: number;
  enableRealTimeUpdates?: boolean;
}

export function useSystemHealth(options: UseSystemHealthOptions = {}) {
  const {
    autoInitialize = true,
    refreshInterval = 30000, // 30 seconds
    enableRealTimeUpdates = true
  } = options;

  const [healthStatus, setHealthStatus] = useState<SystemHealthStatus | null>(null);
  const [testResults, setTestResults] = useState<IntegrationTestResult[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize system integration manager
  useEffect(() => {
    if (!autoInitialize) return;

    let mounted = true;

    const initializeSystem = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await systemIntegrationManager.initialize();

        if (mounted) {
          setIsInitialized(true);
          updateHealthStatus();
          updateTestResults();
        }
      } catch (error) {
        if (mounted) {
          const errorMessage = error instanceof Error ? error.message : 'System initialization failed';
          setError(errorMessage);
          console.error('System health initialization error:', error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeSystem();

    return () => {
      mounted = false;
    };
  }, [autoInitialize]);

  // Set up real-time updates
  useEffect(() => {
    if (!isInitialized || !enableRealTimeUpdates) return;

    const startRealTimeUpdates = () => {
      refreshIntervalRef.current = setInterval(() => {
        updateHealthStatus();
      }, refreshInterval);
    };

    startRealTimeUpdates();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isInitialized, enableRealTimeUpdates, refreshInterval]);

  // Update health status from manager
  const updateHealthStatus = () => {
    try {
      const status = systemIntegrationManager.getHealthStatus();
      setHealthStatus(status);
    } catch (error) {
      console.error('Failed to update health status:', error);
    }
  };

  // Update test results from manager
  const updateTestResults = () => {
    try {
      const results = systemIntegrationManager.getTestResults();
      setTestResults(results);
    } catch (error) {
      console.error('Failed to update test results:', error);
    }
  };

  // Manual health check
  const performHealthCheck = async (): Promise<SystemHealthStatus | null> => {
    if (!isInitialized) {
      setError('System not initialized');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const status = await systemIntegrationManager.performHealthCheck();
      setHealthStatus(status);
      
      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Health check failed';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Run integration tests
  const runIntegrationTests = async (): Promise<IntegrationTestResult[]> => {
    if (!isInitialized) {
      setError('System not initialized');
      return [];
    }

    try {
      setIsLoading(true);
      setError(null);

      const results = await systemIntegrationManager.runIntegrationTests();
      setTestResults(results);
      
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Test execution failed';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Get health status summary
  const getHealthSummary = () => {
    if (!healthStatus) return null;

    const criticalIssues = Object.values(healthStatus)
      .filter(status => status === 'error' || status === 'critical').length;

    const warnings = Object.values(healthStatus)
      .filter(status => status === 'device-missing' || status === 'expired' || status === 'degraded').length;

    return {
      overall: healthStatus.overall,
      criticalIssues,
      warnings,
      lastCheck: healthStatus.lastCheck,
      isHealthy: healthStatus.overall === 'healthy'
    };
  };

  // Get test summary
  const getTestSummary = () => {
    if (testResults.length === 0) return null;

    const passed = testResults.filter(test => test.passed).length;
    const failed = testResults.filter(test => !test.passed).length;
    const total = testResults.length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    return {
      total,
      passed,
      failed,
      passRate,
      averageDuration: total > 0 
        ? Math.round(testResults.reduce((sum, test) => sum + test.duration, 0) / total)
        : 0
    };
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    // Status
    healthStatus,
    testResults,
    isInitialized,
    isLoading,
    error,

    // Summaries
    healthSummary: getHealthSummary(),
    testSummary: getTestSummary(),

    // Actions
    performHealthCheck,
    runIntegrationTests,
    updateHealthStatus,
    updateTestResults,

    // Direct access to manager
    systemManager: systemIntegrationManager
  };
}
