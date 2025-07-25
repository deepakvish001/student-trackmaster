
import { useState } from 'react';

export type CaptureState = 'idle' | 'capturing' | 'previewing' | 'accepted';

interface FingerprintCaptureData {
  template: string;
  imageData: string;
  quality: number | null;
}

export function useFingerprintCaptureState() {
  const [captureState, setCaptureState] = useState<CaptureState>('idle');
  const [captureData, setCaptureData] = useState<FingerprintCaptureData | null>(null);

  const startCapture = () => {
    setCaptureState('capturing');
    setCaptureData(null);
  };

  const showPreview = (data: FingerprintCaptureData) => {
    setCaptureData(data);
    setCaptureState('previewing');
  };

  const acceptCapture = () => {
    setCaptureState('accepted');
  };

  const resetCapture = () => {
    setCaptureState('idle');
    setCaptureData(null);
  };

  return {
    captureState,
    captureData,
    startCapture,
    showPreview,
    acceptCapture,
    resetCapture,
  };
}
