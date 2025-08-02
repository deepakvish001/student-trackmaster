
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Fingerprint, Wifi, WifiOff, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { useOptimizedMFS100 } from "@/hooks/useOptimizedMFS100";

interface OptimizedFingerprintCaptureProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
  onImageChange?: (imageData: string) => void;
  disabled?: boolean;
  fingerName?: string;
  targetQuality?: number;
}

export function OptimizedFingerprintCapture({ 
  index, 
  value, 
  onChange, 
  onImageChange,
  disabled = false,
  fingerName = `Finger ${index + 1}`,
  targetQuality = 60
}: OptimizedFingerprintCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);
  
  const { 
    isConnected, 
    isCapturing, 
    lastError, 
    deviceInfo,
    isInitialized,
    captureFingerprint 
  } = useOptimizedMFS100();

  // Enhanced bitmap processing
  const processFingerprintBitmap = useCallback((bitmapData: string, width: number = 256, height: number = 256): string => {
    try {
      if (!bitmapData || bitmapData.length === 0) {
        console.warn('No bitmap data provided for processing');
        return "";
      }

      console.log(`Processing fingerprint bitmap for ${fingerName}: ${bitmapData.length} bytes`);
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      const totalPixels = Math.min(binaryData.length, width * height);
      
      for (let i = 0; i < totalPixels; i++) {
        let pixelValue = binaryData.charCodeAt(i);
        
        // Invert and enhance contrast
        pixelValue = 255 - pixelValue;
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.3 + 20));
        
        const pixelIndex = i * 4;
        if (pixelIndex + 3 < data.length) {
          data[pixelIndex] = pixelValue;     // Red
          data[pixelIndex + 1] = pixelValue; // Green
          data[pixelIndex + 2] = pixelValue; // Blue
          data[pixelIndex + 3] = 255;        // Alpha
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      const result = canvas.toDataURL('image/png', 1.0);
      
      console.log(`✅ Fingerprint processed for ${fingerName}, result length: ${result.length}`);
      return result;
      
    } catch (error) {
      console.error('Bitmap processing error:', error);
      return "";
    }
  }, [fingerName]);

  const handleCapture = useCallback(async () => {
    if (!isConnected || !isInitialized) {
      toast.error("Device not ready. Please wait for connection.");
      return;
    }

    try {
      toast.info(`Place ${fingerName} on scanner`, { duration: 3000 });
      
      const result = await captureFingerprint(targetQuality, 15);
      
      if (result.success) {
        const quality = result.quality;
        setCaptureQuality(quality);

        // Process the bitmap into displayable image
        let processedImage = "";
        if (result.imageData) {
          processedImage = processFingerprintBitmap(result.imageData);
          
          if (processedImage) {
            setCapturedImage(processedImage);
            // Save the processed image
            onChange(processedImage);
            onImageChange?.(processedImage);
            
            console.log(`✅ ${fingerName} captured and saved`, {
              quality,
              imageLength: processedImage.length
            });
          }
        }

        toast.success(`${fingerName} captured! Quality: ${quality}%`);
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      console.error('Capture error:', error);
      toast.error(`${fingerName}: ${errorMessage}`);
    }
  }, [isConnected, isInitialized, targetQuality, fingerName, onChange, onImageChange, captureFingerprint, processFingerprintBitmap]);

  const getStatusColor = () => {
    if (!isInitialized) return "bg-gray-500";
    return isConnected ? "bg-green-500" : "bg-red-500";
  };

  const getStatusText = () => {
    if (!isInitialized) return "Initializing...";
    if (isConnected) return "Device ready to capture";
    return "Device not available";
  };

  const isButtonDisabled = disabled || isCapturing || !isConnected || !isInitialized;

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Fingerprint Display */}
      <FingerprintDisplay 
        value={capturedImage || value}
        imageData={capturedImage}
        index={index}
        quality={captureQuality}
        isCapturing={isCapturing}
        showQuality={true}
      />

      {/* Status Display */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <div className="flex items-center space-x-1">
              <Wifi className="h-4 w-4 text-green-500" />
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
            </div>
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
        </div>
        
        <Badge variant={isConnected ? "default" : "destructive"}>
          {getStatusText()}
        </Badge>
        
        {captureQuality && (
          <Badge variant={captureQuality >= 70 ? "default" : "secondary"}>
            Quality: {captureQuality}%
          </Badge>
        )}
      </div>

      {/* Device Info */}
      {deviceInfo && isConnected && (
        <div className="text-xs text-center text-gray-600">
          {deviceInfo.Make} {deviceInfo.Model}
        </div>
      )}

      {/* Error Display */}
      {!isConnected && lastError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {lastError} - Reconnecting in background...
          </AlertDescription>
        </Alert>
      )}

      {/* Capture Button */}
      <Button
        type="button"
        onClick={handleCapture}
        disabled={isButtonDisabled}
        className={`w-full transition-all duration-300 ${
          isCapturing 
            ? 'bg-blue-500 hover:bg-blue-600 animate-pulse' 
            : isConnected 
              ? 'bg-primary hover:bg-primary/90' 
              : 'bg-gray-400 cursor-not-allowed'
        }`}
        size="lg"
      >
        <Fingerprint className="mr-2 h-5 w-5" />
        {isCapturing 
          ? `Capturing ${fingerName}...` 
          : isConnected 
            ? `Capture ${fingerName}` 
            : 'Waiting for Device'
        }
      </Button>

      {/* Success Status */}
      {capturedImage && (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Fingerprint captured and saved</span>
        </div>
      )}
    </div>
  );
}
