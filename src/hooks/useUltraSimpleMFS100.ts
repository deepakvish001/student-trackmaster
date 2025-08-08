
import { useState, useCallback } from 'react';
import { ultraSimpleMFS100Service, UltraSimpleMFS100Result } from '@/services/ultraSimpleMFS100';

export function useUltraSimpleMFS100() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const captureFingerprint = useCallback(async (
    quality: number = 60,
    timeout: number = 15
  ): Promise<UltraSimpleMFS100Result> => {
    if (isCapturing) {
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: 'Capture in progress'
      };
    }

    setIsCapturing(true);
    setLastError(null);

    try {
      const result = await ultraSimpleMFS100Service.captureFingerprint(quality, timeout);
      
      if (!result.success) {
        setLastError(result.message);
      }
      
      return result;
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  return {
    isCapturing,
    lastError,
    captureFingerprint
  };
}
