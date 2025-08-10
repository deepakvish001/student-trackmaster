import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Fingerprint, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Activity
} from "lucide-react";
import { useMultiFingerprintCapture } from "@/hooks/useMultiFingerprintCapture";

interface SimpleFingerprintGridProps {
  onAllCaptured: (fingerprintData: any[]) => void;
  disabled?: boolean;
  targetQuality?: number;
}

export function SimpleFingerprintGrid({ 
  onAllCaptured, 
  disabled = false,
  targetQuality = 70
}: SimpleFingerprintGridProps) {
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
    "Right Thumb",
    "Right Index", 
    "Right Middle",
    "Left Index",
    "Left Thumb"
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'captured': return 'border-orange-500 bg-orange-500/10';
      case 'capturing': return 'border-orange-400 bg-orange-400/10 animate-pulse';
      case 'retrying': return 'border-yellow-500 bg-yellow-500/10 animate-pulse';
      case 'failed': return 'border-red-500 bg-red-500/10';
      default: return 'border-gray-700 bg-gray-900/50 hover:border-orange-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'captured': return <CheckCircle2 className="h-8 w-8 text-orange-400" />;
      case 'capturing': return <Activity className="h-8 w-8 text-orange-400 animate-pulse" />;
      case 'retrying': return <RotateCcw className="h-8 w-8 text-yellow-400 animate-spin" />;
      case 'failed': return <AlertCircle className="h-8 w-8 text-red-400" />;
      default: return <Fingerprint className="h-8 w-8 text-gray-400" />;
    }
  };

  return (
    <div className="grid grid-cols-5 gap-8 justify-items-center px-4">
      {fingerprints.map((fingerprint, index) => (
        <Card 
          key={index}
          className={`w-full max-w-[200px] transition-all duration-300 hover:scale-105 ${getStatusColor(fingerprint.status)} border-2 bg-gray-900/70 backdrop-blur-sm`}
        >
          <CardContent className="p-4 text-center space-y-3">
            {/* Fingerprint Display */}
            <div className={`mx-auto w-32 h-40 border-2 rounded-lg flex items-center justify-center transition-all duration-300 ${
              fingerprint.status === 'capturing' || fingerprint.status === 'retrying'
                ? 'border-orange-500 border-dashed animate-pulse bg-orange-500/10' 
                : fingerprint.status === 'captured'
                  ? 'border-orange-500 bg-orange-500/10'
                  : fingerprint.status === 'failed'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-700 bg-gray-900/50'
            }`}>
              {fingerprint.imageData ? (
                <img 
                  src={fingerprint.imageData} 
                  alt={`${fingerNames[index]} preview`}
                  className="w-full h-full object-contain rounded"
                  style={{
                    filter: 'contrast(1.3) brightness(1.15)',
                    imageRendering: 'crisp-edges'
                  }}
                />
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  {getStatusIcon(fingerprint.status)}
                  <span className="text-sm font-medium text-gray-300">
                    {fingerprint.status === 'capturing' ? 'Capturing...' :
                     fingerprint.status === 'retrying' ? 'Retrying...' :
                     fingerprint.status === 'failed' ? 'Failed' :
                     fingerprint.status === 'captured' ? 'Captured' : 'Ready'}
                  </span>
                </div>
              )}
            </div>

            {/* Finger Name */}
            <div className="text-sm font-semibold text-white">
              {fingerNames[index]}
            </div>

            {/* Action Button */}
            <div>
              {fingerprint.status === 'captured' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full py-2 text-xs font-bold bg-orange-500/20 border-orange-500/50 text-orange-400 hover:bg-orange-500/30 transition-all duration-200"
                  onClick={() => handleRetry(index)}
                  disabled={disabled || isCapturing}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Recapture
                </Button>
              ) : fingerprint.status === 'failed' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full py-2 text-xs font-bold bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 transition-all duration-200"
                  onClick={() => handleRetry(index)}
                  disabled={disabled || isCapturing}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Retry
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant={fingerprint.status === 'capturing' || fingerprint.status === 'retrying' ? "default" : "outline"}
                  className="w-full py-2 text-xs font-bold bg-gray-800/80 border-gray-600 text-white hover:bg-orange-500 hover:border-orange-500 transition-all duration-200"
                  onClick={() => handleCapture(index)}
                  disabled={disabled || isCapturing || fingerprint.status === 'capturing' || fingerprint.status === 'retrying'}
                >
                  <Fingerprint className="mr-1 h-3 w-3" />
                  {fingerprint.status === 'capturing' ? 'Capturing...' :
                   fingerprint.status === 'retrying' ? 'Retrying...' : 'Capture'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}