
/**
 * Smart Device Detection Hook
 * Uses the reconnection detector to intelligently detect device state changes
 */

import { useState, useEffect, useRef } from 'react';
import { deviceReconnectionDetector } from '@/services/deviceReconnectionDetector';

export function useSmartDeviceDetection() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastStateChange, setLastStateChange] = useState<Date>(new Date());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Subscribe to device state changes
    const unsubscribe = deviceReconnectionDetector.subscribe((connected) => {
      if (mountedRef.current) {
        setIsConnected(connected);
        setLastStateChange(new Date());
      }
    });

    // Get initial state
    setIsConnected(deviceReconnectionDetector.getLastKnownState());

    // Trigger an initial check
    deviceReconnectionDetector.triggerCheck();

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const manualCheck = async () => {
    const connected = await deviceReconnectionDetector.triggerCheck();
    if (mountedRef.current) {
      setIsConnected(connected);
      setLastStateChange(new Date());
    }
    return connected;
  };

  return {
    isConnected,
    lastStateChange,
    manualCheck
  };
}
