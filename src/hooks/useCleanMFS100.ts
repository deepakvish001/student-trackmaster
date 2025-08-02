
import { useState, useCallback, useRef, useEffect } from 'react';
import { cleanMFS100Service, MFS100ServiceStatus, MFS100CaptureResult } from '@/services/cleanMFS100Service';

export interface CleanMFS100State {
  status: MFS100ServiceStatus;
  isCapturing: boolean;
  activeCapture: string | null;
  lastCheckTime: Date | null;
}

export function useCleanMFS100() {
  const [state, setState] = useState<CleanMFS100State>({
    status: {
      isConnected: false,
      deviceInfo: null,
      lastError: null,
      message: 'Ready to connect'
    },
    isCapturing: false,
    activeCapture: null,
    lastCheckTime: null
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Check device connection manually
   */
  const checkDevice = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return;

    try {
      const status = await cleanMFS100Service.checkConnection();
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          status,
          lastCheckTime: new Date()
        }));
      }
    } catch (error) {
      console.error('Device check failed:', error);
    }
  }, []);

  /**
   * Capture fingerprint with proper session management
   */
  const captureFingerprint = useCallback(async (
    fingerName: string,
    quality: number = 60,
    timeout: number = 15
  ): Promise<MFS100CaptureResult> => {
    if (!mountedRef.current) {
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: 'Component unmounted'
      };
    }

    // Prevent multiple simultaneous captures
    if (state.isCapturing) {
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: `Cannot capture ${fingerName} - ${state.activeCapture} is being captured`
      };
    }

    try {
      setState(prev => ({
        ...prev,
        isCapturing: true,
        activeCapture: fingerName
      }));

      console.log(`🔄 Capturing ${fingerName}...`);

      const result = await cleanMFS100Service.captureFingerprint(quality, timeout);
      
      if (mountedRef.current) {
        // Update status after capture
        const currentStatus = cleanMFS100Service.getStatus();
        setState(prev => ({
          ...prev,
          status: currentStatus,
          lastCheckTime: new Date()
        }));
      }

      return result;

    } finally {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isCapturing: false,
          activeCapture: null
        }));
      }
    }
  }, [state.isCapturing, state.activeCapture]);

  /**
   * Reconnect device manually
   */
  const reconnectDevice = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return;

    try {
      const status = await cleanMFS100Service.reconnectDevice();
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          status,
          lastCheckTime: new Date()
        }));
      }
    } catch (error) {
      console.error('Reconnect failed:', error);
    }
  }, []);

  /**
   * Get current device status without checking
   */
  const getStatus = useCallback((): MFS100ServiceStatus => {
    return cleanMFS100Service.getStatus();
  }, []);

  return {
    // State
    isConnected: state.status.isConnected,
    deviceInfo: state.status.deviceInfo,
    error: state.status.lastError,
    message: state.status.message,
    isCapturing: state.isCapturing,
    activeCapture: state.activeCapture,
    lastCheckTime: state.lastCheckTime,
    
    // Actions
    checkDevice,
    captureFingerprint,
    reconnectDevice,
    getStatus
  };
}
