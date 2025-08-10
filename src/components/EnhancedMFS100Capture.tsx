import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FingerprintDisplay } from "./FingerprintDisplay";
import { FingerprintPreview } from "./FingerprintPreview";
import { useFingerprintCaptureState } from "@/hooks/useFingerprintCaptureState";
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
  }>({
    isCapturing: false,
    currentStep: '',
    progress: 0
  });

  const [capturedImageData, setCapturedImageData] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);

  const {
    captureState,
    captureData,
    startCapture,
    showPreview,
    acceptCapture,
    resetCapture
  } = useFingerprintCaptureState();

  const handleProgressUpdate = useCallback((status: string) => {
    setCaptureProgress(prev => ({
      ...prev,
      currentStep: status,
      progress: Math.min(prev.progress + 25, 90)
    }));
  }, []);

  // Enhanced bitmap processing for crystal-clear fingerprint images
  const processFingerprintBitmap = useCallback((bitmapData: string, width: number = 256, height: number = 256): string => {
    try {
      if (!bitmapData || bitmapData.length === 0) {
        console.warn('No bitmap data provided for processing');
        return "";
      }

      console.log(`Processing fingerprint bitmap for ${fingerName}: ${bitmapData.length} bytes, dimensions: ${width}x${height}`);
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Convert base64 bitmap data to binary
      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      // Process each pixel - MFS100 provides raw grayscale bitmap data
      const totalPixels = Math.min(binaryData.length, width * height);
      
      for (let i = 0; i < totalPixels; i++) {
        let pixelValue = binaryData.charCodeAt(i);
        
        // Invert the pixel values - MFS100 typically returns inverted images
        pixelValue = 255 - pixelValue;
        
        // Apply contrast and brightness enhancement
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.3 + 20));
        
        const pixelIndex = i * 4;
        if (pixelIndex + 3 < data.length) {
          data[pixelIndex] = pixelValue;     // Red
          data[pixelIndex + 1] = pixelValue; // Green
          data[pixelIndex + 2] = pixelValue; // Blue
          data[pixelIndex + 3] = 255;        // Alpha (fully opaque)
        }
      }
      
      // Put the processed image data onto the canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to high-quality PNG data URI
      const result = canvas.toDataURL('image/png', 1.0);
      console.log(`✅ Fingerprint image processed successfully for ${fingerName}, result length: ${result.length}`);
      
      return result;
      
    } catch (error) {
      console.error('Fingerprint bitmap processing error:', error);
      return "";
    }
  }, [fingerName]);

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
        progress: 10
      });

      toast.info(`Place ${fingerName} on scanner`, { duration: 4000 });

      handleProgressUpdate('Capturing fingerprint...');
      
      const result = await mfs100Client.captureFingerprint({
        quality: targetQuality,
        timeout: 15,
        retries: 3
      });

      if (!result.httpStaus || result.data?.ErrorCode !== "0") {
        throw new Error(result.data?.ErrorDescription || result.err || "Capture failed");
      }

      handleProgressUpdate('Processing image...');
      
      const quality = result.data.Quality || 0;
      setCaptureQuality(quality);
      
      let processedImage = "";

      // Process the raw bitmap data into a displayable image
      if (result.data.BitmapData) {
        processedImage = processFingerprintBitmap(
          result.data.BitmapData,
          result.data.InWidth || 256,
          result.data.InHeight || 256
        );
        
        if (processedImage) {
          setCapturedImageData(processedImage);
          
          showPreview({
            template: result.data.IsoTemplate || '',
            imageData: processedImage,
            quality: quality
          });

          toast.success(`${fingerName} image captured! Please review and accept.`);
          handleProgressUpdate('Capture completed!');
        } else {
          throw new Error("Failed to process fingerprint image");
        }
      } else {
        throw new Error("No fingerprint image data received from device");
      }

    } catch (error) {
      console.error('Capture error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      toast.error(errorMessage, { duration: 5000 });
      
      resetCapture();
      setCaptureProgress({
        isCapturing: false,
        currentStep: 'Capture failed',
        progress: 0
      });
    } finally {
      setTimeout(() => {
        setCaptureProgress({
          isCapturing: false,
          currentStep: '',
          progress: 0
        });
      }, 2000);
    }
  }, [isConnected, isInitialized, targetQuality, fingerName, startCapture, showPreview, resetCapture, handleProgressUpdate, mfs100Client, processFingerprintBitmap]);

  const handleAcceptCapture = useCallback(() => {
    if (!captureData) return;

    // Save the processed image as the main value
    onChange(captureData.imageData);
    onImageChange?.(captureData.imageData);
    
    acceptCapture();
    onAccepted?.();
    
    toast.success(`${fingerName} image accepted and saved!`);
  }, [captureData, onChange, onImageChange, acceptCapture, onAccepted, fingerName]);

  const handleRecapture = useCallback(() => {
    resetCapture();
    setCapturedImageData("");
    setCaptureQuality(null);
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

  // Show the captured image (processed image data)
  const displayImageData = captureState === 'accepted' ? capturedImageData : '';
  const displayQuality = captureState === 'accepted' ? captureQuality : null;

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <FingerprintDisplay 
          value={displayImageData}
          imageData={displayImageData}
          index={index}
          quality={displayQuality}
          isCapturing={captureState === 'capturing'}
          showQuality={true}
        />
        
        {captureState === 'capturing' && (
          <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
            <div className="bg-background border border-border p-3 rounded-lg shadow-lg text-center">
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

        {captureState === 'accepted' && (
          <div className="absolute -top-2 -right-2">
            <div className="bg-green-500 text-white rounded-full p-1">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <div className="flex items-center space-x-1">
                <Wifi className="h-4 w-4 text-green-500" />
                <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
              </div>
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </div>
          
          <Badge variant={isConnected ? "default" : "destructive"}>
            {getConnectionStatusText()}
          </Badge>
          
          {captureState === 'accepted' && captureQuality && (
            <Badge variant={captureQuality >= 70 ? "default" : "secondary"}>
              Quality: {captureQuality}%
            </Badge>
          )}
        </div>

        {deviceInfo && isConnected && (
          <div className="text-xs text-center text-gray-600">
            {deviceInfo.Make} {deviceInfo.Model}
          </div>
        )}
      </div>

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

      {captureProgress.isCapturing && captureProgress.currentStep && (
        <div className="w-full text-center space-y-2">
          <div className="text-sm text-gray-600">{captureProgress.currentStep}</div>
        </div>
      )}

      <Button
        type="button"
        onClick={handleCapture}
        disabled={captureState === 'capturing' || captureState === 'accepted' || !isConnected || !isInitialized}
        className={`w-full transition-all duration-300 ${
          captureState === 'capturing' 
            ? 'bg-blue-500 hover:bg-blue-600 animate-pulse' 
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
            ? `${fingerName} Image Saved ✓`
          : isConnected && isInitialized
            ? `Capture ${fingerName}` 
            : 'Device Not Ready'
        }
      </Button>

      {captureState === 'accepted' && (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Fingerprint image captured and saved</span>
        </div>
      )}
    </div>
  );
}
