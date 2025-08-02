
import { useState, useRef } from 'react';
import { rdServiceClient, DeviceInfo } from '@/services/rdServiceClient';

export function useRDService() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [serviceStatus, setServiceStatus] = useState<{
    service: string;
    message: string;
  }>({
    service: '',
    message: 'Passive mode: Ready for capture'
  });
  
  const mountedRef = useRef(true);

  console.log('🔵 Passive RD Service hook initialized - NO background monitoring');

  // Manual availability check only
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
        
        // Try to get device info only if we don't have it
        if (!deviceInfo) {
          try {
            const info = await rdServiceClient.getDeviceInfo();
            setDeviceInfo(info);
            
            if (showLogs) {
              console.log('✅ Passive: MFS100 device ready:', info);
            }
          } catch (err) {
            if (showLogs) {
              console.warn('Passive: Could not get device info:', err);
            }
          }
        }
      } else {
        setError(status.message);
        setRetryCount(prev => prev + 1);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Passive: Connection failed';
      setIsAvailable(false);
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

  // Direct fingerprint capture
  const captureFingerprint = async (timeout: number = 15000) => {
    try {
      const result = await rdServiceClient.captureFingerprint(timeout);
      
      if (mountedRef.current && result) {
        setIsAvailable(true);
        setError(null);
        setRetryCount(0);
      }
      
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setRetryCount(prev => prev + 1);
      }
      
      throw err;
    }
  };

  // Get device info
  const getDeviceInfo = async () => {
    const info = await rdServiceClient.getDeviceInfo();
    setDeviceInfo(info);
    return info;
  };

  // Manual retry
  const retry = async () => {
    setError(null);
    setRetryCount(0);
    checkAvailability(true);
  };

  // Reset connection
  const resetConnection = async () => {
    setIsAvailable(false);
    setDeviceInfo(null);
    setError(null);
    setRetryCount(0);
    setServiceStatus({
      service: '',
      message: 'Passive: Resetting connection...'
    });
    
    await rdServiceClient.forceSessionReset();
    
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
    sessionActive: false,
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
