
import { useState, useEffect, useCallback, useRef } from 'react';
import { stableMFS100Client, DeviceInfo } from '@/services/stableMFS100Client';

interface ConnectionState {
  isAvailable: boolean;
  isChecking: boolean;
  error: string | null;
  deviceInfo: DeviceInfo | null;
  consecutiveFailures: number;
  lastCheckTime: Date | null;
}

export function useStableMFS100() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isAvailable: false,
    isChecking: false,
    error: null,
    deviceInfo: null,
    consecutiveFailures: 0,
    lastCheckTime: null
  });

  const [isCapturing, setIsCapturing] = useState(false);
  const mountedRef = useRef(true);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Check device availability
  const checkDevice = useCallback(async (showLogs = false) => {
    if (!mountedRef.current || connectionState.isChecking) return;

    setConnectionState(prev => ({ ...prev, isChecking: true }));

    try {
      const result = await stableMFS100Client.checkDeviceAvailability();
      
      if (!mountedRef.current) return;

      const stats = stableMFS100Client.getConnectionStats();

      setConnectionState(prev => ({
        ...prev,
        isAvailable: result.available,
        error: result.available ? null : result.message,
        deviceInfo: result.deviceInfo || prev.deviceInfo,
        consecutiveFailures: stats.consecutiveFailures,
        lastCheckTime: new Date(),
        isChecking: false
      }));

      if (showLogs) {
        console.log(`Device check result: ${result.available ? 'Available' : 'Unavailable'}`, result.message);
      }

    } catch (error) {
      if (!mountedRef.current) return;

      const errorMessage = error instanceof Error ? error.message : 'Check failed';
      setConnectionState(prev => ({
        ...prev,
        isAvailable: false,
        error: errorMessage,
        isChecking: false,
        lastCheckTime: new Date()
      }));

      if (showLogs) {
        console.error('Device check error:', errorMessage);
      }
    }
  }, [connectionState.isChecking]);

  // Capture fingerprint
  const captureFingerprint = useCallback(async (
    quality: number = 60,
    timeout: number = 15
  ): Promise<{
    success: boolean;
    template: string;
    imageData: string;
    quality: number;
    message: string;
  }> => {
    if (isCapturing) {
      throw new Error('Capture already in progress');
    }

    setIsCapturing(true);

    try {
      const result = await stableMFS100Client.captureFingerprint(quality, timeout);

      if (result.success && result.data) {
        // Update connection state to show device is working
        setConnectionState(prev => ({
          ...prev,
          isAvailable: true,
          error: null,
          consecutiveFailures: 0,
          lastCheckTime: new Date()
        }));

        return {
          success: true,
          template: result.data.template,
          imageData: result.data.imageData,
          quality: result.data.quality,
          message: result.message
        };
      } else {
        // Check device status after failed capture
        setTimeout(() => {
          if (mountedRef.current) {
            checkDevice(true);
          }
        }, 1000);

        return {
          success: false,
          template: '',
          imageData: '',
          quality: 0,
          message: result.message
        };
      }

    } finally {
      if (mountedRef.current) {
        setIsCapturing(false);
      }
    }
  }, [isCapturing, checkDevice]);

  // Reset connection
  const resetConnection = useCallback(async () => {
    console.log('🔄 Resetting MFS100 connection...');
    
    stableMFS100Client.resetConnectionState();
    
    setConnectionState(prev => ({
      ...prev,
      isAvailable: false,
      error: null,
      consecutiveFailures: 0,
      isChecking: false
    }));

    // Wait a moment then check device
    setTimeout(() => {
      if (mountedRef.current) {
        checkDevice(true);
      }
    }, 1000);
  }, [checkDevice]);

  // Initial device check on mount
  useEffect(() => {
    // Check device availability after a short delay
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        checkDevice(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [checkDevice]);

  return {
    // Connection state
    isAvailable: connectionState.isAvailable,
    isChecking: connectionState.isChecking,
    error: connectionState.error,
    deviceInfo: connectionState.deviceInfo,
    consecutiveFailures: connectionState.consecutiveFailures,
    lastCheckTime: connectionState.lastCheckTime,
    
    // Capture state
    isCapturing,
    
    // Actions
    checkDevice: () => checkDevice(true),
    captureFingerprint,
    resetConnection
  };
}
