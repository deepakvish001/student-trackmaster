
import { useState, useEffect, useCallback, useRef } from 'react';
import { globalMFS100Manager } from '@/services/globalMFS100Manager';

interface DeviceState {
  isConnected: boolean;
  isInitializing: boolean;
  isCapturing: boolean;
  error: string | null;
  deviceInfo: any;
  lastConnectionTime: Date | null;
  reconnectAttempts: number;
}

interface CaptureResult {
  success: boolean;
  template: string;
  imageData: string;
  quality: number;
  message: string;
}

export function useGlobalMFS100() {
  const [deviceState, setDeviceState] = useState<DeviceState>(
    globalMFS100Manager.getState()
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    const unsubscribe = globalMFS100Manager.subscribe((state) => {
      if (mountedRef.current) {
        setDeviceState(state);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const captureFingerprint = useCallback(async (
    quality: number = 60,
    timeout: number = 15
  ): Promise<CaptureResult> => {
    return await globalMFS100Manager.captureFingerprint(quality, timeout);
  }, []);

  const reconnectDevice = useCallback(async (): Promise<boolean> => {
    return await globalMFS100Manager.reconnectDevice();
  }, []);

  const forceReset = useCallback(async () => {
    await globalMFS100Manager.forceReset();
  }, []);

  const clearQueue = useCallback(() => {
    globalMFS100Manager.clearQueue();
  }, []);

  // Device status helpers
  const isReady = deviceState.isConnected && !deviceState.isCapturing && !deviceState.isInitializing;
  const statusMessage = deviceState.isInitializing 
    ? 'Initializing device...'
    : deviceState.isConnected 
      ? deviceState.isCapturing ? 'Capturing...' : 'Ready'
      : deviceState.error || 'Disconnected';

  return {
    // Device state
    isConnected: deviceState.isConnected,
    isInitializing: deviceState.isInitializing,
    isCapturing: deviceState.isCapturing,
    error: deviceState.error,
    deviceInfo: deviceState.deviceInfo,
    lastConnectionTime: deviceState.lastConnectionTime,
    reconnectAttempts: deviceState.reconnectAttempts,
    
    // Computed states
    isReady,
    statusMessage,
    
    // Actions
    captureFingerprint,
    reconnectDevice,
    forceReset,
    clearQueue
  };
}
