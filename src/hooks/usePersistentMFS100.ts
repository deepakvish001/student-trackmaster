
import { useState, useEffect, useCallback } from 'react';
import { persistentMFS100Service, MFS100CaptureResult, MFS100ConnectionState } from '@/services/persistentMFS100Service';

export function usePersistentMFS100() {
  const [connectionState, setConnectionState] = useState<MFS100ConnectionState>(
    persistentMFS100Service.getState()
  );
  const [isCapturing, setIsCapturing] = useState(false);

  // Subscribe to connection state changes
  useEffect(() => {
    const unsubscribe = persistentMFS100Service.subscribe(setConnectionState);
    return unsubscribe;
  }, []);

  // Initialize device on first use
  const initializeDevice = useCallback(async () => {
    console.log('🎯 Hook: Requesting device initialization...');
    return await persistentMFS100Service.initializeDevice();
  }, []);

  // Fast capture without any delays or retries
  const captureFingerprint = useCallback(async (
    quality: number = 60,
    timeout: number = 15
  ): Promise<MFS100CaptureResult> => {
    if (isCapturing) {
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: 'Capture already in progress'
      };
    }

    setIsCapturing(true);

    try {
      const result = await persistentMFS100Service.captureFingerprint(quality, timeout);
      return result;
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  // Reset connection
  const resetConnection = useCallback(() => {
    persistentMFS100Service.resetConnection();
  }, []);

  return {
    // Connection state
    isConnected: connectionState.isConnected,
    isInitialized: connectionState.isInitialized,
    error: connectionState.error,
    deviceInfo: connectionState.deviceInfo,
    lastActivity: connectionState.lastActivity,
    
    // Capture state
    isCapturing,
    
    // Actions
    initializeDevice,
    captureFingerprint,
    resetConnection
  };
}
