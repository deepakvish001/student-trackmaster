
import { useState, useEffect } from 'react';
import { optimizedMFS100Service, MFS100DeviceState, MFS100CaptureResult } from '@/services/optimizedMFS100Service';

export function useOptimizedMFS100() {
  const [deviceState, setDeviceState] = useState<MFS100DeviceState>(() => 
    optimizedMFS100Service.getState()
  );

  useEffect(() => {
    const unsubscribe = optimizedMFS100Service.subscribe(setDeviceState);
    return unsubscribe;
  }, []);

  const captureFingerprint = async (quality: number = 60, timeout: number = 15): Promise<MFS100CaptureResult> => {
    return optimizedMFS100Service.captureFingerprint(quality, timeout);
  };

  return {
    // Device state
    isConnected: deviceState.isConnected,
    isCapturing: deviceState.isCapturing,
    lastError: deviceState.lastError,
    deviceInfo: deviceState.deviceInfo,
    isInitialized: deviceState.isInitialized,
    
    // Actions
    captureFingerprint
  };
}
