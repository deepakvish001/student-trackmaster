
import { useState, useEffect, useCallback } from 'react';
import { useGlobalMFS100 } from './useGlobalMFS100';

// Legacy interface compatibility
export interface MFS100CaptureResult {
  success: boolean;
  template: string;
  imageData: string;
  quality: number;
  message: string;
}

export interface MFS100ConnectionState {
  isConnected: boolean;
  isInitialized: boolean;
  deviceInfo: any;
  error: string | null;
  lastActivity: Date | null;
}

export function usePersistentMFS100() {
  const globalMFS100 = useGlobalMFS100();
  
  // Map global state to legacy interface
  const [connectionState] = useState<MFS100ConnectionState>(() => ({
    isConnected: globalMFS100.isConnected,
    isInitialized: globalMFS100.isConnected,
    deviceInfo: globalMFS100.deviceInfo,
    error: globalMFS100.error,
    lastActivity: globalMFS100.lastConnectionTime
  }));

  // Update legacy state when global state changes
  useEffect(() => {
    // This hook now just provides compatibility layer
    console.log('🔄 Persistent MFS100 hook now using Global Manager');
  }, []);

  const initializeDevice = useCallback(async () => {
    console.log('🎯 Legacy Hook: Delegating to Global Manager...');
    // The global manager handles initialization automatically
    if (!globalMFS100.isConnected && !globalMFS100.isInitializing) {
      return await globalMFS100.reconnectDevice();
    }
    return globalMFS100.isConnected;
  }, [globalMFS100]);

  const captureFingerprint = useCallback(async (
    quality: number = 60,
    timeout: number = 15
  ): Promise<MFS100CaptureResult> => {
    return await globalMFS100.captureFingerprint(quality, timeout);
  }, [globalMFS100]);

  const resetConnection = useCallback(() => {
    console.log('🔄 Legacy Hook: Requesting global reset...');
    globalMFS100.forceReset();
  }, [globalMFS100]);

  return {
    // Connection state (mapped from global state)
    isConnected: globalMFS100.isConnected,
    isInitialized: globalMFS100.isConnected,
    error: globalMFS100.error,
    deviceInfo: globalMFS100.deviceInfo,
    lastActivity: globalMFS100.lastConnectionTime,
    
    // Capture state
    isCapturing: globalMFS100.isCapturing,
    
    // Actions
    initializeDevice,
    captureFingerprint,
    resetConnection
  };
}
