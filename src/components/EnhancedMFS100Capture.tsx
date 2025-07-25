import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FingerprintDisplay } from "./FingerprintDisplay";
import { FingerprintPreview } from "./FingerprintPreview";
import { useFingerprintCaptureState } from "@/hooks/useFingerprintCaptureState";
import { useOptimizedDeviceConnection } from "@/hooks/useOptimizedDeviceConnection";
import { performanceOptimizer } from "@/utils/performanceOptimizer";
import { initializeMFS100, captureFingerprint } from "@/utils/mfs100Native";
import { useModernDeviceConnection } from "@/hooks/useModernDeviceConnection";

interface EnhancedMFS100CaptureProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
  onImageChange?: (imageData: string) => void;
  onAccepted?: () => void;
  targetQuality?: number;
  fingerName: string;
}

export function EnhancedMFS100Capture({ 
  index, 
  value, 
  onChange, 
  onImageChange,
  onAccepted,
  targetQuality = 70,
  fingerName
}: EnhancedMFS100CaptureProps) {
  // Use the modern device connection instead of the old one
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

  const [captureProgress, setCaptureProgress] = useState<{
    isCapturing: boolean;
    currentStep: string;
    progress: number;
    attempt: number;
    maxAttempts: number;
  }>({
    isCapturing: false,
    currentStep: '',
    progress: 0,
    attempt: 0,
    maxAttempts: 3
  });

  const {
    captureState,
    captureData,
    startCapture,
    showPreview,
    acceptCapture,
    resetCapture
  } = useFingerprintCaptureState();

  // Remove the old initialization useEffect - now handled by useModernDeviceConnection

  const handleProgressUpdate = useCallback((status: string, attempt?: number) => {
    setCaptureProgress(prev => ({
      ...prev,
      currentStep: status,
      attempt: attempt || prev.attempt,
      progress: attempt ? (attempt / prev.maxAttempts) * 100 : prev.progress
    }));
  }, []);

  // Updated capture function using modern client
  const handleCapture = useCallback(async () => {
    if (!isConnected || !isInitialized) {
      toast.error(`Device not ready: Please check MFS100 connection`);
      return;
    }

    try {
      startCapture();
      setCaptureProgress({
        isCapturing: true,
        currentStep: 'Preparing device...',
        progress: 10,
        attempt: 0,
        maxAttempts: 3
      });

      toast.info(`Place ${fingerName} on scanner`, { duration: 4000 });

      handleProgressUpdate('Capturing fingerprint...', 1);
      
      // Use modern async client
      const result = await mfs100Client.captureFingerprint({
        quality: targetQuality,
        timeout: 15,
        retries: 3
      });

      if (!result.httpStaus || result.data?.ErrorCode !== "0") {
        throw new Error(result.data?.ErrorDescription || result.err || "Capture failed");
      }

      handleProgressUpdate('Processing image...', 2);
      
      const quality = result.data.Quality || 0;
      let processedImage = "";

      if (result.data.BitmapData) {
        processedImage = processFingerprintBitmap(
          result.data.BitmapData,
          result.data.InWidth || 256,
          result.data.InHeight || 256
        );
      }

      if (result.data.IsoTemplate) {
        showPreview({
          template: result.data.IsoTemplate,
          imageData: processedImage,
          quality: quality
        });

        toast.success(`${fingerName} captured! Please review and accept.`);
        handleProgressUpdate('Capture completed!', 3);
      } else {
        throw new Error("No template data received");
      }

    } catch (error) {
      console.error('Capture error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      toast.error(errorMessage, { duration: 5000 });
      
      resetCapture();
      setCaptureProgress(prev => ({
        ...prev,
        currentStep: 'Capture failed',
        progress: 0
      }));
    } finally {
      setTimeout(() => {
        setCaptureProgress(prev => ({
          ...prev,
          isCapturing: false,
          currentStep: '',
          progress: 0,
          attempt: 0
        }));
      }, 2000);
    }
  }, [isConnected, isInitialized, targetQuality, fingerName, startCapture, showPreview, resetCapture, handleProgressUpdate, mfs100Client]);

  // Optimized bitmap processing with memoization
  const processFingerprintBitmap = useCallback((bitmapData: string, width: number, height: number): string => {
    const cacheKey = `bitmap_${bitmapData.slice(0, 50)}_${width}_${height}`;
    
    return performanceOptimizer.memoize(cacheKey, () => {
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
    }, 60000); // Cache for 1 minute
  }, []);

  const handleAcceptCapture = useCallback(() => {
    if (!captureData) return;

    onChange(captureData.template);
    onImageChange?.(captureData.imageData);
    
    acceptCapture();
    onAccepted?.();
    
    toast.success(`${fingerName} accepted and saved!`);
  }, [captureData, onChange, onImageChange, acceptCapture, onAccepted, fingerName]);

  const handleRecapture = useCallback(() => {
    resetCapture();
    toast.info(`Ready to recapture ${fingerName}`);
  }, [resetCapture, fingerName]);

  // Show preview if in previewing state
  if (captureState === 'previewing' && captureData) {
    return (
      <FingerprintPreview
        fingerIndex={index}
        imageData={captureData.imageData}
        quality={captureData.quality}
        onAccept={handleAcceptCapture}
        onRecapture={handleRecapture}
        fingerName={fingerName}
      />
    );
  }

  const getConnectionStatusColor = () => {
    if (!isInitialized) return 'bg-gray-500';
    if (isChecking) return 'bg-yellow-500';
    return isConnected ? 'bg-green-500' : 'bg-red-500';
  };

  const getConnectionStatusText = () => {
    if (!isInitialized) return 'Initializing...';
    if (isChecking) return 'Checking...';
    return isConnected ? 'Connected' : 'Disconnected';
  };

  return (
    <div className="flex flex-col items-center space-y-4 animate-fade-in">
      {/* Fingerprint Display */}
      <div className="relative">
        <FingerprintDisplay 
          value={captureState === 'accepted' ? (captureData?.imageData || value) : ''}
          index={index}
          quality={captureState === 'accepted' ? captureData?.quality || null : null}
          isCapturing={captureState === 'capturing'}
          showQuality={true}
        />
        
        {/* Capturing overlay */}
        {captureState === 'capturing' && (
          <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
            <div className="bg-white p-3 rounded-lg shadow-lg text-center">
              <div className="flex items-center space-x-2 mb-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm font-medium">Capturing...</span>
              </div>
              {captureProgress.progress > 0 && (
                <Progress value={captureProgress.progress} className="w-32 h-2" />
              )}
            </div>
          </div>
        )}

        {/* Accepted indicator */}
        {captureState === 'accepted' && (
          <div className="absolute -top-2 -right-2">
            <div className="bg-green-500 text-white rounded-full p-1 animate-bounce">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>

      {/* Updated Device Status */}
      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <div className="flex items-center space-x-1">
                <Wifi className="h-4 w-4 text-green-500" />
                <div className={`w-2 h-2 rounded-full animate-pulse ${getConnectionStatusColor()}`}></div>
              </div>
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </div>
          
          <Badge variant={isConnected ? "default" : "destructive"}>
            {getConnectionStatusText()}
          </Badge>
          
          {captureState === 'accepted' && captureData?.quality && (
            <Badge variant={captureData.quality >= 70 ? "default" : "secondary"}>
              Quality: {captureData.quality}%
            </Badge>
          )}
        </div>

        {/* Device Info */}
        {deviceInfo && isConnected && (
          <div className="text-xs text-center text-gray-600">
            {deviceInfo.Make} {deviceInfo.Model}
            {deviceInfo.SerialNo && <div>S/N: {deviceInfo.SerialNo}</div>}
          </div>
        )}
      </div>

      {/* Updated Error States */}
      {!isConnected && !isChecking && error && (
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
      {captureProgress.isCapturing && captureProgress.currentStep && (
        <div className="w-full text-center space-y-2">
          <div className="text-sm text-gray-600">{captureProgress.currentStep}</div>
          {captureProgress.attempt > 0 && (
            <div className="text-xs text-gray-500">
              Attempt {captureProgress.attempt} of {captureProgress.maxAttempts}
            </div>
          )}
        </div>
      )}

      {/* Capture Button */}
      <Button
        type="button"
        onClick={handleCapture}
        disabled={captureState === 'capturing' || captureState === 'accepted' || !isConnected || !isInitialized}
        className={`w-full transition-all duration-300 rounded-md ${
          captureState === 'capturing' 
            ? 'bg-blue-500 hover:bg-blue-600 animate-pulse cursor-wait' 
            : captureState === 'accepted'
              ? 'bg-green-500 hover:bg-green-600'
            : isConnected && isInitialized
              ? 'bg-primary hover:bg-primary/90' 
              : 'bg-gray-400 cursor-not-allowed'
        }`}
        size="lg"
      >
        <Fingerprint className="mr-2 h-5 w-5" />
        {captureState === 'capturing' 
          ? `Capturing ${fingerName}...` 
          : captureState === 'accepted'
            ? `${fingerName} Accepted ✓`
          : isConnected && isInitialized
            ? `Capture ${fingerName}` 
            : 'Device Not Ready'
        }
      </Button>

      {/* Success Status */}
      {captureState === 'accepted' && (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Fingerprint captured and saved</span>
        </div>
      )}
    </div>
  );
}
