
import { useState, useEffect, useRef } from 'react';
import { rdServiceClient, DeviceInfo } from '@/services/rdServiceClient';

export function useRDService() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [serviceStatus, setServiceStatus] = useState<{
    service: string;
    message: string;
  }>({
    service: '',
    message: 'Checking services...'
  });
  
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Configuration
  const CHECK_INTERVAL = 10000; // Check every 10 seconds
  const INITIAL_DELAY = 1000; // Initial check delay

  // Clean up on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  // Check service availability
  const checkAvailability = async (showLogs = false) => {
    if (!mountedRef.current || isChecking) return;

    setIsChecking(true);
    
    try {
      const status = await rdServiceClient.getServiceStatus();
      
      if (!mountedRef.current) return;

      setIsAvailable(status.available);
      setServiceStatus({
        service: status.service,
        message: status.message
      });

      if (status.available) {
        setError(null);
        setRetryCount(0); // Reset retry count on success
        
        // Try to get device info
        try {
          const info = await rdServiceClient.getDeviceInfo();
          setDeviceInfo(info);
          
          if (showLogs) {
            console.log('✅ Fingerprint service connected:', {
              service: status.service,
              deviceInfo: info
            });
          }
        } catch (err) {
          console.warn('Could not get device info:', err);
          setDeviceInfo(null);
        }
      } else {
        setError(status.message);
        setDeviceInfo(null);
        setRetryCount(prev => prev + 1); // Increment retry count on failure
        
        if (showLogs) {
          console.warn('❌ No fingerprint service available');
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Service check failed';
      setIsAvailable(false);
      setDeviceInfo(null);
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

  // Initialize and start periodic checking
  useEffect(() => {
    // Initial check with delay
    const initTimeout = setTimeout(() => {
      if (mountedRef.current) {
        checkAvailability(true);
      }
    }, INITIAL_DELAY);

    // Start periodic checking
    checkIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        checkAvailability();
      }
    }, CHECK_INTERVAL);

    return () => {
      clearTimeout(initTimeout);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  // Capture fingerprint
  const captureFingerprint = async (timeout: number = 10000) => {
    if (!isAvailable) {
      throw new Error(error || 'No fingerprint service is available');
    }

    try {
      const result = await rdServiceClient.captureFingerprint(timeout);
      
      // Verify service is still available after capture
      if (mountedRef.current && result) {
        setIsAvailable(true);
        setError(null);
        setRetryCount(0); // Reset retry count on successful capture
      }
      
      return result;
    } catch (err) {
      // If capture fails, recheck availability
      if (mountedRef.current) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          if (mountedRef.current) {
            checkAvailability(true);
          }
        }, 1000);
      }
      
      throw err;
    }
  };

  // Get device info
  const getDeviceInfo = async () => {
    if (!isAvailable) {
      throw new Error('No fingerprint service is available');
    }
    
    const info = await rdServiceClient.getDeviceInfo();
    setDeviceInfo(info);
    return info;
  };

  // Manual retry
  const retry = () => {
    setError(null);
    setRetryCount(0);
    rdServiceClient.clearCache();
    checkAvailability(true);
  };

  // Reset connection
  const resetConnection = () => {
    setIsAvailable(false);
    setDeviceInfo(null);
    setError(null);
    setRetryCount(0);
    setServiceStatus({
      service: '',
      message: 'Resetting...'
    });
    rdServiceClient.clearCache();
    
    setTimeout(() => {
      if (mountedRef.current) {
        checkAvailability(true);
      }
    }, 500);
  };

  return {
    // Status
    isAvailable,
    isChecking,
    error,
    deviceInfo,
    serviceStatus,
    retryCount,
    
    // Actions
    captureFingerprint,
    getDeviceInfo,
    retry,
    resetConnection,
    checkAvailability: () => checkAvailability(true)
  };
}
