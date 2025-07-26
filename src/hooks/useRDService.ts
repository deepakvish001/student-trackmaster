
/**
 * React hook for RD Service fingerprint capture
 */

import { useState, useEffect, useCallback } from 'react';
import { rdServiceClient, RDServiceResponse, RDServiceOptions } from '@/services/rdServiceClient';

interface UseRDServiceOptions {
  autoCheck?: boolean;
  checkInterval?: number;
}

export function useRDService(options: UseRDServiceOptions = {}) {
  const { autoCheck = true, checkInterval = 5000 } = options;
  
  const [isServiceAvailable, setIsServiceAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check service availability
  const checkService = useCallback(async () => {
    try {
      setIsChecking(true);
      setError(null);
      
      const available = await rdServiceClient.isServiceAvailable();
      setIsServiceAvailable(available);
      
      if (available) {
        try {
          const info = await rdServiceClient.getDeviceInfo();
          setDeviceInfo(info);
        } catch (deviceError) {
          console.warn('Could not get device info:', deviceError);
          setDeviceInfo(null);
        }
      } else {
        setDeviceInfo(null);
        setError('RD Service not available - please ensure MFS100 RD Service is running');
      }
      
      setLastCheck(new Date());
    } catch (error) {
      console.error('Service check failed:', error);
      setIsServiceAvailable(false);
      setDeviceInfo(null);
      setError(error instanceof Error ? error.message : 'Service check failed');
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Capture fingerprint
  const captureFingerprint = useCallback(async (captureOptions: RDServiceOptions = {}): Promise<RDServiceResponse> => {
    if (!isServiceAvailable) {
      return {
        success: false,
        error: 'RD Service not available',
        errorCode: 'SERVICE_UNAVAILABLE'
      };
    }

    try {
      const result = await rdServiceClient.captureFingerprint(captureOptions);
      return result;
    } catch (error) {
      console.error('Capture failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Capture failed',
        errorCode: 'CAPTURE_ERROR'
      };
    }
  }, [isServiceAvailable]);

  // Auto-check service availability
  useEffect(() => {
    if (!autoCheck) return;

    // Initial check
    checkService();

    // Set up interval
    const interval = setInterval(checkService, checkInterval);

    return () => clearInterval(interval);
  }, [autoCheck, checkInterval, checkService]);

  return {
    // Status
    isServiceAvailable,
    isChecking,
    deviceInfo,
    lastCheck,
    error,
    
    // Actions
    checkService,
    captureFingerprint,
    
    // Client access
    client: rdServiceClient
  };
}
