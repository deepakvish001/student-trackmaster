
import { useState, useEffect, useCallback, useRef } from 'react';
import { unifiedMFS100Manager, MFS100ConnectionState, MFS100CaptureResult } from '@/services/unifiedMFS100Manager';

export function useUnifiedMFS100() {
  const [connectionState, setConnectionState] = useState<MFS100ConnectionState>({
    isConnected: false,
    lastCheckTime: null,
    deviceInfo: null,
    error: null,
    consecutiveFailures: 0,
    isRecovering: false,
    recoveryMessage: null
  });
  
  const [isCapturing, setIsCapturing] = useState(false);
  const mountedRef = useRef(true);

  // Subscribe to connection state changes
  useEffect(() => {
    const unsubscribe = unifiedMFS100Manager.subscribe((state) => {
      if (mountedRef.current) {
        setConnectionState(state);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // Check device connection
  const checkDevice = useCallback(async (force = false) => {
    return await unifiedMFS100Manager.checkConnection(force);
  }, []);

  // Capture fingerprint
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
      const result = await unifiedMFS100Manager.captureFingerprint(quality, timeout);
      return result;
    } finally {
      if (mountedRef.current) {
        setIsCapturing(false);
      }
    }
  }, [isCapturing]);

  // Cancel ongoing capture
  const cancelCapture = useCallback(() => {
    console.log('🛑 Cancelling fingerprint capture...');
    unifiedMFS100Manager.cancelCapture();
    setIsCapturing(false);
  }, []);

  // Reset connection
  const resetConnection = useCallback(() => {
    console.log('🔄 Resetting MFS100 connection...');
    unifiedMFS100Manager.reset();
  }, []);

  // Trigger manual recovery
  const triggerRecovery = useCallback(async () => {
    console.log('🔧 Triggering manual MFS100 recovery...');
    return await unifiedMFS100Manager.triggerRecovery();
  }, []);

  // Initial connection check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        checkDevice(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [checkDevice]);

  return {
    // Connection state
    isConnected: connectionState.isConnected,
    isChecking: false, // Managed internally by the manager
    error: connectionState.error,
    deviceInfo: connectionState.deviceInfo,
    consecutiveFailures: connectionState.consecutiveFailures,
    lastCheckTime: connectionState.lastCheckTime,
    isRecovering: connectionState.isRecovering,
    recoveryMessage: connectionState.recoveryMessage,
    
    // Capture state
    isCapturing,
    
    // Actions
    checkDevice: () => checkDevice(true),
    captureFingerprint,
    cancelCapture,
    resetConnection,
    triggerRecovery,
    
    // Utilities
    isProbablyAvailable: unifiedMFS100Manager.isProbablyAvailable()
  };
}
