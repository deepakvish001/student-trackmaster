/**
 * Modern Device Connection Hook - React integration for device connection management
 */

import { useState, useEffect, useRef } from 'react';
import { modernMFS100Client } from '@/services/modernMFS100Client';
import { deviceConnectionManager, DeviceStatus } from '@/services/deviceConnectionManager';

interface UseModernDeviceConnectionOptions {
  autoInitialize?: boolean;
  checkInterval?: number;
}

export function useModernDeviceConnection(options: UseModernDeviceConnectionOptions = {}) {
  const { autoInitialize = true, checkInterval = 5000 } = options;
  
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    isConnected: false,
    lastCheck: new Date(),
    isChecking: true
  });
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize the modern MFS100 system
  useEffect(() => {
    if (!autoInitialize) return;

    let mounted = true;

    const initializeSystem = async () => {
      try {
        console.log('Initializing modern MFS100 system...');
        
        // Initialize the MFS100 client
        const clientInitialized = await modernMFS100Client.initialize();
        
        if (!mounted) return;
        
        if (!clientInitialized) {
          throw new Error('Failed to initialize MFS100 client');
        }
        
        // Initialize the connection manager
        await deviceConnectionManager.initialize(modernMFS100Client, {
          checkInterval,
          retryAttempts: 3,
          healthCheckTimeout: 10000
        });
        
        if (mounted) {
          setIsInitialized(true);
          setInitError(null);
          console.log('Modern MFS100 system initialized successfully');
        }
        
      } catch (error) {
        if (mounted) {
          const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
          setInitError(errorMessage);
          setIsInitialized(false);
          console.error('Failed to initialize modern MFS100 system:', error);
        }
      }
    };

    initializeSystem();

    return () => {
      mounted = false;
    };
  }, [autoInitialize, checkInterval]);

  // Subscribe to device status updates
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = deviceConnectionManager.subscribe((status) => {
      setDeviceStatus(status);
    });
    
    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const forceCheck = async () => {
    if (!isInitialized) return;
    await deviceConnectionManager.forceCheck();
  };

  const reconnect = async () => {
    if (!isInitialized) return false;
    return await deviceConnectionManager.reconnect();
  };

  return {
    // Status
    isConnected: deviceStatus.isConnected,
    isChecking: deviceStatus.isChecking,
    lastCheck: deviceStatus.lastCheck,
    error: deviceStatus.error || initError,
    deviceInfo: deviceStatus.deviceInfo,
    
    // System status
    isInitialized,
    
    // Actions
    forceCheck,
    reconnect,
    
    // Direct access to clients
    mfs100Client: modernMFS100Client,
    connectionManager: deviceConnectionManager
  };
}
