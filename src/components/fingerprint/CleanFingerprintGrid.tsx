import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Fingerprint, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Activity
} from "lucide-react";
import { useMultiFingerprintCapture } from "@/hooks/useMultiFingerprintCapture";

interface CleanFingerprintGridProps {
  onAllCaptured: (fingerprintData: any[]) => void;
  disabled?: boolean;
  targetQuality?: number;
}

export function CleanFingerprintGrid({ 
  onAllCaptured, 
  disabled = false,
  targetQuality = 70
}: CleanFingerprintGridProps) {
  const {
    fingerprints,
    completedCount,
    allCaptured,
    isCapturing,
    captureFingerprint,
    retryCapture,
    resetAll,
    getAllCapturedData
  } = useMultiFingerprintCapture();

  const fingerNames = [
    "Finger 1",
    "Finger 2", 
    "Finger 3",
    "Finger 4",
    "Finger 5"
  ];

  const handleCapture = useCallback(async (index: number) => {
    if (isCapturing) {
      toast.warning("Another capture is in progress");
      return;
    }

    try {
      toast.info(`Place ${fingerNames[index]} on scanner`, { 
        duration: 3000,
        description: "Hold steady for best quality" 
      });
      
      const success = await captureFingerprint(index, targetQuality, 20);
      
      if (success) {
        const fingerprint = fingerprints.find(fp => fp.index === index);
        if (fingerprint) {
          toast.success(`${fingerNames[index]} captured!`, {
            description: `Quality: ${fingerprint.quality}%`
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      toast.error(`${fingerNames[index]} capture failed`, {
        description: errorMessage
      });
    }
  }, [isCapturing, captureFingerprint, targetQuality, fingerNames, fingerprints]);

  const handleRetry = useCallback(async (index: number) => {
    try {
      toast.info(`Retrying ${fingerNames[index]}...`);
      const success = await retryCapture(index);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Retry failed';
      toast.error(`Retry failed for ${fingerNames[index]}`, {
        description: errorMessage
      });
    }
  }, [retryCapture, fingerNames]);

  // Auto-save when all fingerprints are captured
  React.useEffect(() => {
    if (allCaptured && completedCount === 5) {
      const capturedData = getAllCapturedData();
      const fingerprintData = capturedData.fingerprints.map(fp => ({
        index: fp.index,
        imageData: fp.imageData,
        template: fp.template,
        quality: fp.quality,
        timestamp: fp.timestamp
      }));
      onAllCaptured(fingerprintData);
    }
  }, [allCaptured, completedCount, getAllCapturedData, onAllCaptured]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'captured': return <CheckCircle2 className="h-6 w-6 text-orange-400" />;
      case 'capturing': return <Activity className="h-6 w-6 text-orange-400 animate-pulse" />;
      case 'retrying': return <RotateCcw className="h-6 w-6 text-yellow-400 animate-spin" />;
      case 'failed': return <AlertCircle className="h-6 w-6 text-red-400" />;
      default: return <Fingerprint className="h-6 w-6 text-gray-400" />;
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Biometric Capture</h3>
        <p className="text-sm text-gray-400">Capture all 5 fingerprints for secure identification</p>
      </div>
      
      {/* Mobile View: Stack vertically */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
        {fingerprints.map((fingerprint, index) => (
          <div key={index} className="text-center space-y-3">
            {/* Fingerprint Preview Box */}
            <div className="w-full h-32 sm:h-36 lg:h-40 border-2 border-gray-600 rounded-lg bg-black flex items-center justify-center overflow-hidden">
              {fingerprint.imageData ? (
                <img 
                  src={fingerprint.imageData} 
                  alt={`${fingerNames[index]} preview`}
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'contrast(1.3) brightness(1.15)',
                    imageRendering: 'crisp-edges'
                  }}
                />
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  {getStatusIcon(fingerprint.status)}
                  <span className="text-xs text-gray-400">
                    {fingerprint.status === 'capturing' ? 'Capturing...' :
                     fingerprint.status === 'retrying' ? 'Retrying...' :
                     fingerprint.status === 'failed' ? 'Failed' :
                     fingerprint.status === 'captured' ? 'Captured' : 'Ready'}
                  </span>
                </div>
              )}
            </div>

            {/* Finger Label */}
            <div className="text-white font-medium text-sm sm:text-base">
              {fingerNames[index]}
            </div>

            {/* Quality Badge */}
            {fingerprint.quality > 0 && (
              <div className="text-xs text-orange-400 font-medium">
                Quality: {fingerprint.quality}%
              </div>
            )}

            {/* Capture Button */}
            <div>
              {fingerprint.status === 'captured' ? (
                <Button
                  size="sm"
                  className="w-full h-10 sm:h-11 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm touch-manipulation"
                  onClick={() => handleRetry(index)}
                  disabled={disabled || isCapturing}
                >
                  Recapture
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full h-10 sm:h-11 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm touch-manipulation"
                  onClick={() => handleCapture(index)}
                  disabled={disabled || isCapturing || fingerprint.status === 'capturing' || fingerprint.status === 'retrying'}
                >
                  {fingerprint.status === 'capturing' ? 'Capturing...' :
                   fingerprint.status === 'retrying' ? 'Retrying...' : 'Capture'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Progress Indicator */}
      <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-300">
            Progress: {completedCount}/5 fingerprints captured
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 sm:w-32 h-2 bg-gray-700 rounded-full">
              <div 
                className="h-2 bg-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${(completedCount / 5) * 100}%` }}
              />
            </div>
            <span className="text-xs text-orange-400 font-medium whitespace-nowrap">
              {Math.round((completedCount / 5) * 100)}%
            </span>
          </div>
        </div>
        {allCaptured && (
          <div className="mt-2 text-sm text-green-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            All fingerprints captured successfully!
          </div>
        )}
      </div>
    </div>
  );
}