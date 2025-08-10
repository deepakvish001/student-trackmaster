// Consolidated MFS100 hook replacing 6 similar hooks
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface MFS100Config {
  pollingMode: 'standard' | 'zero' | 'persistent';
  targetQuality: number;
  timeout: number;
  autoReconnect: boolean;
}

interface CaptureResult {
  success: boolean;
  imageData?: string;
  quality?: number;
  error?: string;
}

export function useConsolidatedMFS100(config: Partial<MFS100Config> = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const finalConfig: MFS100Config = {
    pollingMode: 'standard',
    targetQuality: 60,
    timeout: 30000,
    autoReconnect: true,
    ...config
  };

  // Initialize device
  const initialize = useCallback(async () => {
    try {
      setLastError(null);
      
      // Dynamic import to reduce bundle size
      const { initializeMFS100, getDeviceInfo } = await import('@/utils/mfs100Enhanced');
      
      const initialized = await initializeMFS100();
      if (initialized) {
        setIsInitialized(true);
        const info = await getDeviceInfo();
        setDeviceInfo(info);
        setIsConnected(true);
        return true;
      }
      
      throw new Error('Failed to initialize MFS100');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMsg);
      setIsConnected(false);
      setIsInitialized(false);
      return false;
    }
  }, []);

  // Capture fingerprint
  const captureFingerprint = useCallback(async (fingerIndex: number): Promise<CaptureResult> => {
    if (!isConnected || !isInitialized) {
      return { success: false, error: 'Device not ready' };
    }

    try {
      const { captureFingerprint: capture } = await import('@/utils/mfs100Enhanced');
      
      const result = await capture({
        fingerIndex,
        targetQuality: finalConfig.targetQuality,
        timeout: finalConfig.timeout,
        mode: finalConfig.pollingMode
      });

      return {
        success: true,
        imageData: result.imageData,
        quality: result.quality
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Capture failed';
      return { success: false, error: errorMsg };
    }
  }, [isConnected, isInitialized, finalConfig]);

  // Auto-reconnect logic
  useEffect(() => {
    if (finalConfig.autoReconnect && !isConnected) {
      const reconnectInterval = setInterval(() => {
        console.log('🔄 Attempting MFS100 reconnection...');
        initialize();
      }, 5000);

      return () => clearInterval(reconnectInterval);
    }
  }, [finalConfig.autoReconnect, isConnected, initialize]);

  // Initial connection
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    isConnected,
    isInitialized,
    deviceInfo,
    lastError,
    initialize,
    captureFingerprint,
    config: finalConfig
  };
}