
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
    message: 'Initializing...'
  });
  
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Improved configuration for better stability
  const CHECK_INTERVAL = 20000; // Check every 20 seconds
  const INITIAL_DELAY = 1000; // Reduced initial delay

  // Clean up on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  // Check service availability with improved error handling
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
        setRetryCount(0);
        
        // Try to get device info only if service is stable
        try {
          const info = await rdServiceClient.getDeviceInfo();
          setDeviceInfo(info);
          
          if (showLogs) {
            console.log('✅ Fingerprint service stable and ready:', {
              service: status.service,
              deviceInfo: info
            });
          }
        } catch (err) {
          if (showLogs) {
            console.warn('Device info not available, but service is connected:', err);
          }
          setDeviceInfo(null);
        }
      } else {
        setError(status.message);
        setDeviceInfo(null);
        if (status.message.includes('failures')) {
          setRetryCount(prev => prev + 1);
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Service check failed';
      setIsAvailable(false);
      setDeviceInfo(null);
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
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
    // Initial check with shorter delay
    const initTimeout = setTimeout(() => {
      if (mountedRef.current) {
        checkAvailability(true);
      }
    }, INITIAL_DELAY);

    // Start periodic checking
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

  // Capture fingerprint with improved timeout
  const captureFingerprint = async (timeout: number = 20000) => {
    if (!isAvailable) {
      throw new Error(error || 'No fingerprint service is available');
    }

    try {
      console.log(`🔍 Starting fingerprint capture with ${timeout}ms timeout`);
      const result = await rdServiceClient.captureFingerprint(timeout);
      
      if (mountedRef.current && result) {
        setIsAvailable(true);
        setError(null);
        setRetryCount(0);
        console.log('✅ Fingerprint capture completed successfully');
      }
      
      return result;
    } catch (err) {
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Capture failed';
        console.error('❌ Fingerprint capture failed:', errorMessage);
        
        // Don't increment retry count for timeout errors
        if (!errorMessage.includes('timeout')) {
          setRetryCount(prev => prev + 1);
        }
        
        // Force service recheck after capture failure
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

  // Manual retry with force reconnect
  const retry = async () => {
    console.log('🔄 Manual retry triggered');
    setError(null);
    setRetryCount(0);
    setServiceStatus({
      service: '',
      message: 'Reconnecting...'
    });
    
    const reconnected = await rdServiceClient.forceReconnect();
    if (reconnected) {
      await checkAvailability(true);
    }
  };

  // Reset connection with improved logic
  const resetConnection = async () => {
    console.log('🔄 Resetting connection...');
    setIsAvailable(false);
    setDeviceInfo(null);
    setError(null);
    setRetryCount(0);
    setServiceStatus({
      service: '',
      message: 'Resetting connection...'
    });
    
    await rdServiceClient.forceReconnect();
    
    setTimeout(() => {
      if (mountedRef.current) {
        checkAvailability(true);
      }
    }, 1000);
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
