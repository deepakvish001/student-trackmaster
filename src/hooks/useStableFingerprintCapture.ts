import { useState, useCallback, useRef } from 'react';

export type StableCaptureState = 'idle' | 'capturing' | 'previewing' | 'accepted';

interface StableFingerprintData {
  template: string;
  imageData: string;
  quality: number | null;
  timestamp: number;
  locked: boolean; // Prevents auto-dismissal
}

export function useStableFingerprintCapture() {
  const [captureState, setCaptureState] = useState<StableCaptureState>('idle');
  const [captureData, setCaptureData] = useState<StableFingerprintData | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lockedRef = useRef<boolean>(false);

  // Clear any existing timeouts when component unmounts or resets
  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startCapture = useCallback(() => {
    clearTimeouts();
    lockedRef.current = false;
    setCaptureState('capturing');
    setCaptureData(null);
    console.log('🔄 Starting stable fingerprint capture...');
  }, [clearTimeouts]);

  const showPreview = useCallback((data: {
    template: string;
    imageData: string;
    quality: number | null;
  }) => {
    clearTimeouts();
    
    const stableData: StableFingerprintData = {
      ...data,
      timestamp: Date.now(),
      locked: true // Lock immediately to prevent dismissal
    };

    lockedRef.current = true;
    setCaptureData(stableData);
    setCaptureState('previewing');
    
    console.log('👁️ Showing stable preview - LOCKED to prevent auto-dismissal');
    
    // NO auto-dismissal timeout - preview stays until user action
    
  }, [clearTimeouts]);

  const acceptCapture = useCallback(() => {
    console.log('✅ User accepted capture - moving to accepted state');
    clearTimeouts();
    setCaptureState('accepted');
    // Keep capture data for display
  }, [clearTimeouts]);

  const resetCapture = useCallback(() => {
    console.log('🔄 Resetting capture state');
    clearTimeouts();
    lockedRef.current = false;
    setCaptureState('idle');
    setCaptureData(null);
  }, [clearTimeouts]);

  const recapture = useCallback(() => {
    console.log('🔄 Recapturing - back to idle for new capture');
    clearTimeouts();
    lockedRef.current = false;
    setCaptureState('idle');
    setCaptureData(null);
  }, [clearTimeouts]);

  // Lock/unlock functions for extra protection
  const lockPreview = useCallback(() => {
    lockedRef.current = true;
    if (captureData) {
      setCaptureData({ ...captureData, locked: true });
    }
    console.log('🔒 Preview locked against dismissal');
  }, [captureData]);

  const unlockPreview = useCallback(() => {
    lockedRef.current = false;
    if (captureData) {
      setCaptureData({ ...captureData, locked: false });
    }
    console.log('🔓 Preview unlocked');
  }, [captureData]);

  // Check if preview is locked
  const isLocked = useCallback(() => {
    return lockedRef.current || (captureData?.locked ?? false);
  }, [captureData]);

  return {
    captureState,
    captureData,
    startCapture,
    showPreview,
    acceptCapture,
    resetCapture,
    recapture,
    lockPreview,
    unlockPreview,
    isLocked,
    clearTimeouts
  };
}
