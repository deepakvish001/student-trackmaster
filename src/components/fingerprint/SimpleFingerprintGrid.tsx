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
      case 'captured': return 'border-orange-500 bg-orange-500/15 shadow-orange-500/20';
      case 'capturing': return 'border-orange-400 bg-orange-400/15 animate-pulse shadow-orange-400/30';
      case 'retrying': return 'border-yellow-500 bg-yellow-500/15 animate-pulse shadow-yellow-500/20';
      case 'failed': return 'border-red-400 bg-red-400/10 shadow-red-400/20';
      default: return 'border-gray-600 bg-gray-800/40 hover:border-orange-500 hover:shadow-orange-500/20';
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
    <div className="grid grid-cols-5 gap-10 justify-items-center px-8">
      {fingerprints.map((fingerprint, index) => (
        <Card 
          key={index}
          className={`w-full max-w-[220px] transition-all duration-300 hover:scale-105 ${getStatusColor(fingerprint.status)} border-2 bg-gray-900/80 backdrop-blur-sm shadow-xl rounded-3xl`}
        >
          <CardContent className="p-6 text-center space-y-4">
            {/* Fingerprint Display */}
            <div className={`mx-auto w-36 h-44 border-2 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              fingerprint.status === 'capturing' || fingerprint.status === 'retrying'
                ? 'border-orange-500 border-dashed animate-pulse bg-orange-500/15' 
                : fingerprint.status === 'captured'
                  ? 'border-orange-500 bg-orange-500/15'
                  : fingerprint.status === 'failed'
                    ? 'border-red-400 bg-red-400/10'
                    : 'border-gray-600 bg-gray-800/40'
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
            <div className="text-sm font-bold text-white tracking-wide">
              {fingerNames[index]}
            </div>

            {/* Action Button */}
            <div>
              {fingerprint.status === 'captured' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full py-3 text-sm font-bold bg-orange-500/20 border-orange-500/60 text-orange-300 hover:bg-orange-500/30 hover:text-orange-200 transition-all duration-200 rounded-xl"
                  onClick={() => handleRetry(index)}
                  disabled={disabled || isCapturing}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              ) : fingerprint.status === 'failed' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full py-3 text-sm font-bold bg-yellow-500/20 border-yellow-500/60 text-yellow-300 hover:bg-yellow-500/30 hover:text-yellow-200 transition-all duration-200 rounded-xl"
                  onClick={() => handleRetry(index)}
                  disabled={disabled || isCapturing}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant={fingerprint.status === 'capturing' || fingerprint.status === 'retrying' ? "default" : "outline"}
                  className="w-full py-3 text-sm font-bold bg-gray-700/80 border-gray-500 text-white hover:bg-orange-500 hover:border-orange-500 hover:text-white transition-all duration-200 rounded-xl"
                  onClick={() => handleCapture(index)}
                  disabled={disabled || isCapturing || fingerprint.status === 'capturing' || fingerprint.status === 'retrying'}
                >
                  <Fingerprint className="mr-2 h-4 w-4" />
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