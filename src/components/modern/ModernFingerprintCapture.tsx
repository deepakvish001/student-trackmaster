
/**
 * Modern Fingerprint Capture Component
 * Uses the new async MFS100 client for non-blocking UI
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Fingerprint, Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { useModernDeviceConnection } from "@/hooks/useModernDeviceConnection";

interface ModernFingerprintCaptureProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
  onImageChange?: (imageData: string) => void;
  fingerName?: string;
  targetQuality?: number;
  onCaptureComplete?: (data: { template: string; image: string; quality: number }) => void;
}

interface CaptureProgress {
  step: string;
  progress: number;
  attempt: number;
  maxAttempts: number;
}

export function ModernFingerprintCapture({
  index,
  value,
  onChange,
  onImageChange,
  fingerName = `Finger ${index + 1}`,
  targetQuality = 60,
  onCaptureComplete
}: ModernFingerprintCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState<CaptureProgress>({
    step: '',
    progress: 0,
    attempt: 0,
    maxAttempts: 3
  });
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);

  const {
    isConnected,
    isChecking,
    error,
    deviceInfo,
    isInitialized,
    forceCheck,
    reconnect,
    mfs100Client
  } = useModernDeviceConnection();

  const updateProgress = useCallback((step: string, progress: number, attempt?: number) => {
    setCaptureProgress(prev => ({
      ...prev,
      step,
      progress,
      attempt: attempt ?? prev.attempt
    }));
  }, []);

  const processBitmapData = useCallback((bitmapData: string, width: number, height: number): string => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return "";
      
      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      const totalPixels = Math.min(binaryData.length, width * height);
      for (let i = 0; i < totalPixels; i++) {
        const pixelValue = binaryData.charCodeAt(i);
        const pixelIndex = i * 4;
        
        data[pixelIndex] = pixelValue;
        data[pixelIndex + 1] = pixelValue;
        data[pixelIndex + 2] = pixelValue;
        data[pixelIndex + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL('image/png', 0.8);
      
    } catch (error) {
      console.error('Bitmap processing error:', error);
      return "";
    }
  }, []);

  const handleCapture = useCallback(async () => {
    if (!isConnected || !isInitialized) {
      toast.error("Device not ready. Please check connection.");
      return;
    }

    try {
      setIsCapturing(true);
      setCaptureProgress({
        step: 'Initializing capture...',
        progress: 10,
        attempt: 1,
        maxAttempts: 3
      });

      toast.info(`Place ${fingerName} on the scanner`, { duration: 4000 });

      updateProgress('Capturing fingerprint...', 30, 1);

      const result = await mfs100Client.captureFingerprint({
        quality: targetQuality,
        timeout: 15,
        retries: 3
      });

      if (!result.httpStaus || result.data?.ErrorCode !== "0") {
        throw new Error(result.data?.ErrorDescription || result.err || "Capture failed");
      }

      updateProgress('Processing image...', 70);

      const quality = result.data.Quality || 0;
      setCaptureQuality(quality);

      // Process fingerprint image
      let processedImage = "";
      if (result.data.BitmapData) {
        processedImage = processBitmapData(
          result.data.BitmapData,
          result.data.InWidth || 256,
          result.data.InHeight || 256
        );
        setCapturedImage(processedImage);
        onImageChange?.(processedImage);
      }

      updateProgress('Saving template...', 90);

      // Save template
      if (result.data.IsoTemplate) {
        onChange(result.data.IsoTemplate);
        
        onCaptureComplete?({
          template: result.data.IsoTemplate,
          image: processedImage,
          quality
        });
      }

      updateProgress('Capture completed!', 100);
      
      toast.success(`${fingerName} captured successfully! Quality: ${quality}%`);

      if (quality < targetQuality) {
        toast.warning(`Quality ${quality}% is below target (${targetQuality}%). Consider recapturing for better results.`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      console.error('Modern capture error:', error);
      toast.error(errorMessage);
      
      setCaptureProgress(prev => ({
        ...prev,
        step: 'Capture failed',
        progress: 0
      }));
      
    } finally {
      setTimeout(() => {
        setIsCapturing(false);
        setCaptureProgress({
          step: '',
          progress: 0,
          attempt: 0,
          maxAttempts: 3
        });
      }, 2000);
    }
  }, [isConnected, isInitialized, mfs100Client, targetQuality, fingerName, onChange, onImageChange, onCaptureComplete, updateProgress, processBitmapData]);

  const getStatusColor = () => {
    if (!isInitialized) return "bg-gray-500";
    if (isChecking) return "bg-yellow-500";
    return isConnected ? "bg-green-500" : "bg-red-500";
  };

  const getStatusText = () => {
    if (!isInitialized) return "Initializing...";
    if (isChecking) return "Checking...";
    return isConnected ? "Connected" : "Disconnected";
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Fingerprint Display */}
      <FingerprintDisplay 
        value={capturedImage || value}
        index={index}
        quality={captureQuality}
        isCapturing={isCapturing}
        showQuality={true}
      />

      {/* Device Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <div className="flex items-center space-x-1">
              <Wifi className="h-4 w-4 text-green-500" />
              <div className={`w-2 h-2 rounded-full animate-pulse ${getStatusColor()}`}></div>
            </div>
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
        </div>
        
        <Badge variant={isConnected ? "default" : "destructive"}>
          {getStatusText()}
        </Badge>
        
        {captureQuality && (
          <Badge variant={captureQuality >= targetQuality ? "default" : "secondary"}>
            Quality: {captureQuality}%
          </Badge>
        )}
      </div>

      {/* Device Info */}
      {deviceInfo && (
        <div className="text-xs text-center text-gray-600">
          {deviceInfo.Make} {deviceInfo.Model}
          {deviceInfo.SerialNo && <div>S/N: {deviceInfo.SerialNo}</div>}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <div className="flex space-x-1">
              <Button variant="outline" size="sm" onClick={forceCheck} disabled={isChecking}>
                <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={reconnect}>
                Reconnect
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Display */}
      {isCapturing && captureProgress.step && (
        <div className="w-full space-y-2">
          <div className="text-sm text-center text-gray-600">{captureProgress.step}</div>
          {captureProgress.progress > 0 && (
            <Progress value={captureProgress.progress} className="w-full h-2" />
          )}
          {captureProgress.attempt > 0 && (
            <div className="text-xs text-center text-gray-500">
              Attempt {captureProgress.attempt} of {captureProgress.maxAttempts}
            </div>
          )}
        </div>
      )}

      {/* Capture Button */}
      <Button
        type="button"
        onClick={handleCapture}
        disabled={isCapturing || !isConnected || !isInitialized}
        className={`w-full transition-all duration-300 ${
          isCapturing 
            ? 'bg-blue-500 hover:bg-blue-600 animate-pulse cursor-wait' 
            : isConnected && isInitialized
              ? 'bg-primary hover:bg-primary/90' 
              : 'bg-gray-400 cursor-not-allowed'
        }`}
        size="lg"
      >
        <Fingerprint className="mr-2 h-5 w-5" />
        {isCapturing 
          ? `Capturing ${fingerName}...` 
          : isConnected && isInitialized
            ? `Capture ${fingerName}` 
            : !isInitialized
              ? 'Initializing...'
              : 'Device Not Ready'
        }
      </Button>

      {/* Success Status */}
      {value && capturedImage && !isCapturing && (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>{fingerName} captured and ready</span>
        </div>
      )}
    </div>
  );
}
