
import { useState, useEffect, useCallback, useRef } from 'react';
import { unifiedMFS100Manager, MFS100ConnectionState } from '@/services/unifiedMFS100Manager';

export function useUnifiedMFS100() {
  const [connectionState, setConnectionState] = useState<MFS100ConnectionState>({
    isConnected: false,
    lastCheckTime: null,
    deviceInfo: null,
    error: null,
    consecutiveFailures: 0
  });
  
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

  // Reset connection
  const resetConnection = useCallback(() => {
    console.log('🔄 Resetting MFS100 connection...');
    unifiedMFS100Manager.reset();
    // Check connection after reset
    setTimeout(() => {
      if (mountedRef.current) {
        checkDevice(true);
      }
    }, 1000);
  }, [checkDevice]);

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
    error: connectionState.error,
    deviceInfo: connectionState.deviceInfo,
    consecutiveFailures: connectionState.consecutiveFailures,
    lastCheckTime: connectionState.lastCheckTime,
    
    // Actions
    checkDevice: () => checkDevice(true),
    resetConnection,
    
    // Utilities
    isProbablyAvailable: unifiedMFS100Manager.isProbablyAvailable()
  };
}
