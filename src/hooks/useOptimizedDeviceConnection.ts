
import { useState, useEffect, useCallback } from 'react';
import { deviceManager } from '@/utils/deviceManager';

interface DeviceStatus {
  isConnected: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  error: string | null;
}

export const useOptimizedDeviceConnection = (deviceType: string = 'mfs100') => {
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    isConnected: false,
    isChecking: true,
    lastChecked: null,
    error: null
  });

  const deviceId = `${deviceType}_primary`;

  const handleDeviceStatusChange = useCallback((event: CustomEvent) => {
    const { deviceId: eventDeviceId, isConnected } = event.detail;
    
    if (eventDeviceId === deviceId) {
      setDeviceStatus(prev => ({
        ...prev,
        isConnected,
        isChecking: false,
        lastChecked: new Date(),
        error: isConnected ? null : 'Device disconnected'
      }));
    }
  }, [deviceId]);

  const forceCheck = useCallback(async () => {
    setDeviceStatus(prev => ({ ...prev, isChecking: true, error: null }));
    
    // Trigger a manual check
    setTimeout(() => {
      const isConnected = deviceManager.getConnectionStatus(deviceId);
      setDeviceStatus(prev => ({
        ...prev,
        isConnected,
        isChecking: false,
        lastChecked: new Date(),
        error: isConnected ? null : 'Connection check failed'
      }));
    }, 1000);
  }, [deviceId]);

  useEffect(() => {
    // Register device with manager
    deviceManager.registerDevice(deviceId);
    
    // Listen for status changes
    window.addEventListener('deviceStatusChange', handleDeviceStatusChange as EventListener);
    
    // Initial status check
    const initialStatus = deviceManager.getConnectionStatus(deviceId);
    setDeviceStatus(prev => ({
      ...prev,
      isConnected: initialStatus,
      isChecking: false,
      lastChecked: new Date()
    }));

    return () => {
      window.removeEventListener('deviceStatusChange', handleDeviceStatusChange as EventListener);
      deviceManager.unregisterDevice(deviceId);
    };
  }, [deviceId, handleDeviceStatusChange]);

  return {
    ...deviceStatus,
    forceCheck,
    reconnect: forceCheck
  };
};
