
import { useState, useCallback } from 'react';
import { simpleMFS100Service, SimpleMFS100Result } from '@/services/simpleMFS100Service';

export function useSimpleMFS100() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const captureFingerprint = useCallback(async (
    quality: number = 60,
    timeout: number = 15
  ): Promise<SimpleMFS100Result> => {
    setIsCapturing(true);
    setLastError(null);

    try {
      const result = await simpleMFS100Service.captureFingerprint(quality, timeout);
      
      if (!result.success) {
        setLastError(result.message);
      }
      
      return result;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const checkService = useCallback(async (): Promise<boolean> => {
    return await simpleMFS100Service.isServiceAvailable();
  }, []);

  return {
    isCapturing,
    lastError,
    captureFingerprint,
    checkService
  };
}
