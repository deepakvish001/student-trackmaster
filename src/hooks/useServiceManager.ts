
import { useState, useEffect, useCallback, useRef } from 'react';
import { mfs100ServiceManager, ServiceHealthCheck, ServiceStartupResult } from '@/services/mfs100ServiceManager';

export function useServiceManager() {
  const [serviceHealth, setServiceHealth] = useState<ServiceHealthCheck>({
    isRunning: false,
    port: 8003,
    message: 'Checking service...',
    canAutoStart: false
  });
  
  const [isChecking, setIsChecking] = useState(false);
  const [startupResult, setStartupResult] = useState<ServiceStartupResult | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  
  const mountedRef = useRef(true);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  // Check service health
  const checkService = useCallback(async (showLogs = false) => {
    if (!mountedRef.current || isChecking) return;

    setIsChecking(true);
    
    try {
      const health = await mfs100ServiceManager.checkServiceHealth();
      
      if (mountedRef.current) {
        setServiceHealth(health);
        
        if (showLogs) {
          if (health.isRunning) {
            console.log('✅ MFS100 service is healthy');
          } else {
            console.warn('⚠️ MFS100 service check failed:', health.message);
          }
        }
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error('Service check error:', error);
      }
    } finally {
      if (mountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [isChecking]);

  // Attempt service recovery
  const recoverService = useCallback(async () => {
    setStartupResult(null);
    setShowInstructions(false);
    
    try {
      const result = await mfs100ServiceManager.attemptServiceRecovery();
      
      if (mountedRef.current) {
        setStartupResult(result);
        setShowInstructions(result.needsManualStart);
        
        // If successful, update health
        if (result.success) {
          await checkService(true);
        }
      }
      
      return result;
    } catch (error) {
      const errorResult: ServiceStartupResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Recovery failed',
        needsManualStart: true,
        instructions: mfs100ServiceManager.getServiceStartupInstructions()
      };
      
      if (mountedRef.current) {
        setStartupResult(errorResult);
        setShowInstructions(true);
      }
      
      return errorResult;
    }
  }, [checkService]);

  // Initial service check
  useEffect(() => {
    const initialCheck = setTimeout(() => {
      if (mountedRef.current) {
        checkService(true);
      }
    }, 1000);

    return () => clearTimeout(initialCheck);
  }, [checkService]);

  // Periodic health checks (less frequent)
  useEffect(() => {
    if (serviceHealth.isRunning) {
      // If service is running, check less frequently
      checkIntervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          checkService(false);
        }
      }, 30000); // Every 30 seconds
    } else {
      // If service is down, check more frequently for recovery
      checkIntervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          checkService(false);
        }
      }, 10000); // Every 10 seconds
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [serviceHealth.isRunning, checkService]);

  // Hide instructions
  const hideInstructions = useCallback(() => {
    setShowInstructions(false);
  }, []);

  // Reset everything
  const reset = useCallback(() => {
    mfs100ServiceManager.resetRetries();
    setStartupResult(null);
    setShowInstructions(false);
    checkService(true);
  }, [checkService]);

  return {
    // Service status
    isServiceRunning: serviceHealth.isRunning,
    serviceMessage: serviceHealth.message,
    isChecking,
    
    // Startup management
    startupResult,
    showInstructions,
    
    // Actions
    checkService: () => checkService(true),
    recoverService,
    hideInstructions,
    reset,
    
    // Utilities
    retryCount: mfs100ServiceManager.getRetryCount(),
    commonPaths: mfs100ServiceManager.getCommonServicePaths()
  };
}
