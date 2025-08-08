
import { useState, useEffect, useCallback } from 'react';
import { unifiedMFS100Service, MFS100DeviceState, MFS100CaptureResult } from '@/services/unifiedMFS100Service';

export function useUnifiedMFS100Service() {
  const [deviceState, setDeviceState] = useState<MFS100DeviceState>(
    unifiedMFS100Service.getState()
  );

  // Subscribe to device state changes
  useEffect(() => {
    const unsubscribe = unifiedMFS100Service.subscribe(setDeviceState);
    return unsubscribe;
  }, []);

  // Queue a fingerprint capture
  const queueCapture = useCallback(async (
    fingerName: string,
    quality: number = 60,
    timeout: number = 15,
    onProgress?: (status: string) => void
  ): Promise<MFS100CaptureResult> => {
    return new Promise((resolve, reject) => {
      const requestId = `${fingerName}_${Date.now()}`;
      
      unifiedMFS100Service.queueCapture({
        id: requestId,
        fingerName,
        quality,
        timeout,
        onProgress,
        onSuccess: (result) => resolve(result),
        onError: (error) => reject(new Error(error))
      });
    });
  }, []);

  // Cancel current capture
  const cancelCapture = useCallback(() => {
    unifiedMFS100Service.cancelCurrentCapture();
  }, []);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    unifiedMFS100Service.clearQueue();
  }, []);

  // Soft reset
  const softReset = useCallback(async () => {
    await unifiedMFS100Service.softReset();
  }, []);

  return {
    // Device state
    isConnected: deviceState.isConnected,
    isCapturing: deviceState.isCapturing,
    error: deviceState.error,
    deviceInfo: deviceState.deviceInfo,
    queueLength: deviceState.queueLength,
    currentCapture: deviceState.currentCapture,
    lastCheckTime: deviceState.lastCheckTime,
    
    // Actions
    queueCapture,
    cancelCapture,
    clearQueue,
    softReset
  };
}
