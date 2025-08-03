
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { rdServiceClient, DeviceInfo } from '@/services/rdServiceClient';

interface GlobalRDServiceState {
  isAvailable: boolean;
  isChecking: boolean;
  error: string | null;
  deviceInfo: DeviceInfo | null;
  retryCount: number;
  lastCheckTime: Date | null;
}

interface GlobalRDServiceContextType extends GlobalRDServiceState {
  checkConnection: () => Promise<void>;
  resetConnection: () => Promise<void>;
  captureFingerprint: (timeout?: number) => Promise<any>;
  forceSessionReset: () => Promise<void>;
}

const GlobalRDServiceContext = createContext<GlobalRDServiceContextType | undefined>(undefined);

export function GlobalRDServiceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GlobalRDServiceState>({
    isAvailable: false,
    isChecking: false,
    error: null,
    deviceInfo: null,
    retryCount: 0,
    lastCheckTime: null
  });

  const mountedRef = useRef(true);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  const checkConnection = useCallback(async (showLogs = true) => {
    if (!mountedRef.current || state.isChecking) return;

    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const status = await rdServiceClient.getServiceStatus();
      
      if (!mountedRef.current) return;

      if (status.available) {
        // Try to get device info
        let deviceInfo = null;
        try {
          deviceInfo = await rdServiceClient.getDeviceInfo();
          if (showLogs) {
            console.log('✅ Global RD Service: Device ready for all fingerprints:', deviceInfo);
          }
        } catch (err) {
          if (showLogs) {
            console.warn('Global RD Service: Could not get device info:', err);
          }
        }

        setState(prev => ({
          ...prev,
          isAvailable: true,
          error: null,
          deviceInfo,
          retryCount: 0,
          lastCheckTime: new Date(),
          isChecking: false
        }));

        // Start periodic health checks every 30 seconds when connected
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
        checkIntervalRef.current = setInterval(() => {
          if (mountedRef.current) {
            checkConnection(false); // Silent check
          }
        }, 30000);

      } else {
        setState(prev => ({
          ...prev,
          isAvailable: false,
          error: status.message,
          retryCount: prev.retryCount + 1,
          lastCheckTime: new Date(),
          isChecking: false
        }));

        // Clear health check interval
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setState(prev => ({
        ...prev,
        isAvailable: false,
        error: errorMessage,
        retryCount: prev.retryCount + 1,
        lastCheckTime: new Date(),
        isChecking: false
      }));

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    }
  }, [state.isChecking]);

  const resetConnection = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isAvailable: false,
      deviceInfo: null,
      error: null,
      retryCount: 0,
      isChecking: true
    }));

    // Clear any existing intervals
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    await rdServiceClient.forceSessionReset();
    
    setTimeout(() => {
      if (mountedRef.current) {
        checkConnection(true);
      }
    }, 2000);
  }, [checkConnection]);

  const captureFingerprint = useCallback(async (timeout: number = 15000) => {
    try {
      const result = await rdServiceClient.captureFingerprint(timeout);
      
      if (mountedRef.current && result) {
        setState(prev => ({
          ...prev,
          isAvailable: true,
          error: null,
          retryCount: 0,
          lastCheckTime: new Date()
        }));
      }
      
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          retryCount: prev.retryCount + 1
        }));
      }
      throw err;
    }
  }, []);

  const forceSessionReset = useCallback(async () => {
    return await rdServiceClient.forceSessionReset();
  }, []);

  const contextValue: GlobalRDServiceContextType = {
    ...state,
    checkConnection: () => checkConnection(true),
    resetConnection,
    captureFingerprint,
    forceSessionReset
  };

  return (
    <GlobalRDServiceContext.Provider value={contextValue}>
      {children}
    </GlobalRDServiceContext.Provider>
  );
}

export function useGlobalRDService() {
  const context = useContext(GlobalRDServiceContext);
  if (context === undefined) {
    throw new Error('useGlobalRDService must be used within a GlobalRDServiceProvider');
  }
  return context;
}
