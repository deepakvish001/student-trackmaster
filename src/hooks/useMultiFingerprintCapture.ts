import { useState, useEffect, useCallback } from 'react';
import { multiFingerprintCaptureService, MultiFingerprintResult, FingerprintCaptureState } from '@/services/multiFingerprintCapture';

export function useMultiFingerprintCapture() {
  const [result, setResult] = useState<MultiFingerprintResult>({
    fingerprints: [],
    completedCount: 0,
    averageQuality: 0,
    allCaptured: false
  });

  const [isCapturing, setIsCapturing] = useState(false);

  // Subscribe to service state changes
  useEffect(() => {
    const unsubscribe = multiFingerprintCaptureService.subscribe((newResult) => {
      setResult(newResult);
      setIsCapturing(multiFingerprintCaptureService.isCurrentlyCapturing());
    });

    return unsubscribe;
  }, []);

  // Capture specific fingerprint
  const captureFingerprint = useCallback(async (
    index: number,
    quality: number = 70,
    timeout: number = 20
  ): Promise<boolean> => {
    try {
      return await multiFingerprintCaptureService.captureFingerprint(index, quality, timeout);
    } catch (error) {
      throw error;
    }
  }, []);

  // Retry failed capture
  const retryCapture = useCallback(async (index: number): Promise<boolean> => {
    try {
      return await multiFingerprintCaptureService.retryCapture(index);
    } catch (error) {
      throw error;
    }
  }, []);

  // Reset all captures
  const resetAll = useCallback(() => {
    multiFingerprintCaptureService.resetAll();
  }, []);

  // Cancel current capture
  const cancelCapture = useCallback(() => {
    multiFingerprintCaptureService.cancelCurrentCapture();
  }, []);

  // Get specific fingerprint status
  const getFingerprintStatus = useCallback((index: number): FingerprintCaptureState | null => {
    return multiFingerprintCaptureService.getFingerprintStatus(index);
  }, []);

  // Get all captured data for saving
  const getAllCapturedData = useCallback(() => {
    return multiFingerprintCaptureService.getAllCapturedData();
  }, []);

  return {
    // State
    fingerprints: result.fingerprints,
    completedCount: result.completedCount,
    averageQuality: result.averageQuality,
    allCaptured: result.allCaptured,
    isCapturing,
    
    // Actions
    captureFingerprint,
    retryCapture,
    resetAll,
    cancelCapture,
    getFingerprintStatus,
    getAllCapturedData
  };
}