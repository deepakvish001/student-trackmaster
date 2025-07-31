
import { useState, useEffect, useRef } from 'react';
import { rdServiceClient, DeviceInfo } from '@/services/rdServiceClient';

export function useRDService() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [serviceStatus, setServiceStatus] = useState<{
    service: string;
    message: string;
  }>({
    service: '',
    message: 'Initializing MFS100 connection...'
  });
  
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Optimized for stability - longer intervals, less aggressive checking
  const CHECK_INTERVAL = 30000; // Check every 30 seconds (less frequent)
  const INITIAL_DELAY = 2000; // Slightly longer initial delay

  // Clean up on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  // Check MFS100 availability with gentle approach
  const checkAvailability = async (showLogs = false) => {
    if (!mountedRef.current || isChecking) return;

    setIsChecking(true);
    
    try {
      const status = await rdServiceClient.getServiceStatus();
      
      if (!mountedRef.current) return;

      setIsAvailable(status.available);
      setSessionActive(status.sessionActive);
      setServiceStatus({
        service: status.service,
        message: status.message
      });

      if (status.available) {
        setError(null);
        setRetryCount(0); // Reset retry count on success
        
        // Try to get device info only if we don't have it
        if (!deviceInfo) {
          try {
            const info = await rdServiceClient.getDeviceInfo();
            setDeviceInfo(info);
            
            if (showLogs) {
              console.log('✅ MFS100 device connected:', info);
            }
          } catch (err) {
            if (showLogs) {
              console.warn('Could not get MFS100 device info:', err);
            }
          }
        }
      } else {
        setError(status.message);
        setRetryCount(prev => prev + 1); // Increment retry count on failure
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'MFS100 connection failed';
      setIsAvailable(false);
      setError(errorMessage);
      setRetryCount(prev => prev + 1); // Increment retry count on error
      setServiceStatus({
        service: '',
        message: errorMessage
      });
    } finally {
      if (mountedRef.current) {
        setIsChecking(false);
      }
    }
  };

  // Initialize MFS100 connection with gentler approach
  useEffect(() => {
    // Initial check with delay
    const initTimeout = setTimeout(() => {
      if (mountedRef.current) {
        checkAvailability(true);
      }
    }, INITIAL_DELAY);

    // Less frequent availability checks to reduce service interference
    checkIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        checkAvailability(false);
      }
    }, CHECK_INTERVAL);

    return () => {
      clearTimeout(initTimeout);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  // Capture fingerprint with minimal session interference
  const captureFingerprint = async (timeout: number = 15000) => {
    if (!isAvailable) {
      throw new Error(error || 'MFS100 device is not available');
    }

    try {
      const result = await rdServiceClient.captureFingerprint(timeout);
      
      if (mountedRef.current && result) {
        setIsAvailable(true);
        setError(null);
        setRetryCount(0); // Reset retry count on successful capture
      }
      
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setRetryCount(prev => prev + 1); // Increment retry count on capture error
        
        // Check availability after a delay only on capture error
        setTimeout(() => {
          if (mountedRef.current) {
            checkAvailability(true);
          }
        }, 2000);
      }
      
      throw err;
    }
  };

  // Get device info
  const getDeviceInfo = async () => {
    if (!isAvailable) {
      throw new Error('MFS100 device is not available');
    }
    
    const info = await rdServiceClient.getDeviceInfo();
    setDeviceInfo(info);
    return info;
  };

  // Manual retry with minimal session disruption
  const retry = async () => {
    setError(null);
    setRetryCount(0); // Reset retry count on manual retry
    rdServiceClient.clearCache();
    checkAvailability(true);
  };

  // Reset connection only when absolutely necessary
  const resetConnection = async () => {
    setIsAvailable(false);
    setDeviceInfo(null);
    setError(null);
    setSessionActive(false);
    setRetryCount(0); // Reset retry count on connection reset
    setServiceStatus({
      service: '',
      message: 'Resetting MFS100 connection...'
    });
    
    await rdServiceClient.forceSessionReset();
    
    // Longer delay after reset to let device settle
    setTimeout(() => {
      if (mountedRef.current) {
        checkAvailability(true);
      }
    }, 2000);
  };

  return {
    // Status
    isAvailable,
    isChecking,
    error,
    deviceInfo,
    serviceStatus,
    sessionActive,
    retryCount,
    
    // Actions
    captureFingerprint,
    getDeviceInfo,
    retry,
    resetConnection,
    checkAvailability: () => checkAvailability(true),
    forceSessionReset: () => rdServiceClient.forceSessionReset()
  };
}
