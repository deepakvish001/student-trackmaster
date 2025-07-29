
import { useState, useCallback, useRef, useEffect } from 'react';

interface PreviewState {
  isVisible: boolean;
  fingerIndex: number | null;
  imageData: string;
  quality: number | null;
  timestamp: number;
}

export function useStableFingerprintPreview() {
  const [previewState, setPreviewState] = useState<PreviewState>({
    isVisible: false,
    fingerIndex: null,
    imageData: '',
    quality: null,
    timestamp: 0
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preventCloseRef = useRef<boolean>(false);

  // Clear any existing timeouts
  const clearPreviewTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Show preview with stable state
  const showPreview = useCallback((
    fingerIndex: number,
    imageData: string,
    quality: number | null
  ) => {
    console.log(`📸 Showing stable preview for finger ${fingerIndex + 1}`, {
      quality,
      imageLength: imageData.length,
      timestamp: Date.now()
    });

    clearPreviewTimeout();
    preventCloseRef.current = false;

    setPreviewState({
      isVisible: true,
      fingerIndex,
      imageData,
      quality,
      timestamp: Date.now()
    });
  }, [clearPreviewTimeout]);

  // Hide preview
  const hidePreview = useCallback(() => {
    console.log('🔒 Hiding fingerprint preview');
    clearPreviewTimeout();
    setPreviewState(prev => ({
      ...prev,
      isVisible: false
    }));
  }, [clearPreviewTimeout]);

  // Accept current preview
  const acceptPreview = useCallback(() => {
    console.log(`✅ Accepted preview for finger ${previewState.fingerIndex! + 1}`);
    preventCloseRef.current = true;
    hidePreview();
    return previewState;
  }, [previewState, hidePreview]);

  // Reject and show recapture
  const rejectPreview = useCallback(() => {
    console.log(`❌ Rejected preview for finger ${previewState.fingerIndex! + 1}`);
    hidePreview();
    return previewState;
  }, [previewState, hidePreview]);

  // Prevent auto-close during critical operations
  const lockPreview = useCallback(() => {
    preventCloseRef.current = true;
    clearPreviewTimeout();
  }, [clearPreviewTimeout]);

  // Allow preview to be closed
  const unlockPreview = useCallback(() => {
    preventCloseRef.current = false;
  }, []);

  // Handle visibility change with lock protection
  const handleVisibilityChange = useCallback((visible: boolean) => {
    if (!visible && !preventCloseRef.current) {
      hidePreview();
    }
  }, [hidePreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPreviewTimeout();
    };
  }, [clearPreviewTimeout]);

  return {
    previewState,
    showPreview,
    hidePreview,
    acceptPreview,
    rejectPreview,
    lockPreview,
    unlockPreview,
    handleVisibilityChange,
    isPreviewVisible: previewState.isVisible
  };
}
