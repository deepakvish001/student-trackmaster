
import { useState, useEffect, useCallback } from 'react';
import { rdServiceClient } from '@/services/rdServiceClient';
import type { CaptureResult } from '@/services/rdServiceClient';

interface RDServiceState {
  isAvailable: boolean;
  isChecking: boolean;
  error: string | null;
  deviceInfo: any;
  retryCount: number;
  lastCheck: number;
}

export function useRDService() {
  const [state, setState] = useState<RDServiceState>({
    isAvailable: false,
    isChecking: false,
    error: null,
    deviceInfo: null,
    retryCount: 0,
    lastCheck: 0
  });

  const checkAvailability = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));
    
    try {
      const isAvailable = await rdServiceClient.isServiceAvailable();
      const status = rdServiceClient.getConnectionStatus();
      
      setState(prev => ({
        ...prev,
        isAvailable,
        isChecking: false,
        retryCount: status.retryCount,
        lastCheck: status.lastCheck,
        error: isAvailable ? null : 'RD Service not available'
      }));

      if (isAvailable) {
        try {
          const deviceInfo = await rdServiceClient.getDeviceInfo();
          setState(prev => ({ ...prev, deviceInfo }));
        } catch (error) {
          console.warn('Failed to get device info:', error);
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  const captureFingerprint = useCallback(async (): Promise<CaptureResult> => {
    return rdServiceClient.captureFingerprint();
  }, []);

  const resetConnection = useCallback(() => {
    rdServiceClient.resetConnection();
    checkAvailability();
  }, [checkAvailability]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  return {
    ...state,
    checkAvailability,
    captureFingerprint,
    resetConnection
  };
}
