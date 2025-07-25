
import { useState, useCallback } from 'react';

interface FingerprintData {
  template: string;
  imageData: string;
  quality: number | null;
  timestamp: Date;
}

export const useRealTimeFingerprintCapture = () => {
  const [capturedFingerprints, setCapturedFingerprints] = useState<Record<number, FingerprintData>>({});
  const [isCapturing, setIsCapturing] = useState<Record<number, boolean>>({});

  const startCapture = useCallback((fingerIndex: number) => {
    setIsCapturing(prev => ({ ...prev, [fingerIndex]: true }));
  }, []);

  const completeCapture = useCallback((
    fingerIndex: number, 
    template: string, 
    imageData: string, 
    quality: number | null
  ) => {
    setCapturedFingerprints(prev => ({
      ...prev,
      [fingerIndex]: {
        template,
        imageData,
        quality,
        timestamp: new Date()
      }
    }));
    setIsCapturing(prev => ({ ...prev, [fingerIndex]: false }));
  }, []);

  const clearFingerprint = useCallback((fingerIndex: number) => {
    setCapturedFingerprints(prev => {
      const { [fingerIndex]: removed, ...rest } = prev;
      return rest;
    });
    setIsCapturing(prev => ({ ...prev, [fingerIndex]: false }));
  }, []);

  const clearAllFingerprints = useCallback(() => {
    setCapturedFingerprints({});
    setIsCapturing({});
  }, []);

  const getFingerprint = useCallback((fingerIndex: number): FingerprintData | null => {
    return capturedFingerprints[fingerIndex] || null;
  }, [capturedFingerprints]);

  const isFingerCapturing = useCallback((fingerIndex: number): boolean => {
    return isCapturing[fingerIndex] || false;
  }, [isCapturing]);

  const getTotalCaptured = useCallback((): number => {
    return Object.keys(capturedFingerprints).length;
  }, [capturedFingerprints]);

  const getAllCapturedData = useCallback(() => {
    const templates: Record<string, string> = {};
    const images: Record<string, string> = {};

    Object.entries(capturedFingerprints).forEach(([index, data]) => {
      const fingerNum = parseInt(index) + 1;
      templates[`finger_${fingerNum}`] = data.template;
      images[`finger_${fingerNum}_image`] = data.imageData;
    });

    return { templates, images };
  }, [capturedFingerprints]);

  return {
    capturedFingerprints,
    isCapturing,
    startCapture,
    completeCapture,
    clearFingerprint,
    clearAllFingerprints,
    getFingerprint,
    isFingerCapturing,
    getTotalCaptured,
    getAllCapturedData
  };
};
