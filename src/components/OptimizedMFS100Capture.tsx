
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FingerprintDisplay } from "./FingerprintDisplay";
import { useOptimizedDeviceConnection } from "@/hooks/useOptimizedDeviceConnection";
import { initializeMFS100, captureFingerprint } from "@/utils/mfs100Native";

interface OptimizedMFS100CaptureProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
  onImageChange?: (imageData: string) => void;
  fingerName?: string;
  targetQuality?: number;
}

export function OptimizedMFS100Capture({ 
  index, 
  value, 
  onChange, 
  onImageChange,
  fingerName = `Finger ${index + 1}`,
  targetQuality = 60
}: OptimizedMFS100CaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { isConnected, isChecking, error, forceCheck } = useOptimizedDeviceConnection('mfs100');

  // Initialize SDK
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      try {
        const initialized = await initializeMFS100();
        if (mounted) {
          setIsInitialized(initialized);
          if (!initialized) {
            toast.error("Failed to initialize MFS100 SDK");
          }
        }
      } catch (error) {
        if (mounted) {
          console.error('SDK initialization error:', error);
          setIsInitialized(false);
        }
      }
    };

    initialize();
    
    return () => {
      mounted = false;
    };
  }, []);

  const handleCapture = useCallback(async () => {
    if (!isConnected || !isInitialized) {
      toast.error("Device not ready. Please check connection.");
      return;
    }

    try {
      setIsCapturing(true);
      
      toast.info(`Place ${fingerName} on scanner`, { duration: 3000 });
      
      const result = await captureFingerprint(targetQuality, 15);
      
      if (!result.httpStaus || result.data?.ErrorCode !== "0") {
        throw new Error(result.data?.ErrorDescription || result.err || "Capture failed");
      }

      const quality = result.data.Quality || 0;
      setCaptureQuality(quality);

      // Process image data - this is the main focus
      let processedImage = "";
      if (result.data.BitmapData) {
        processedImage = processFingerprintBitmap(
          result.data.BitmapData,
          result.data.InWidth || 256,
          result.data.InHeight || 256
        );
        
        if (processedImage) {
          setCapturedImage(processedImage);
          // Save the image as the main value
          onChange(processedImage);
          onImageChange?.(processedImage);
          
          console.log(`✅ Fingerprint image captured for ${fingerName}`, {
            quality,
            imageDataLength: processedImage.length
          });
          
          toast.success(`${fingerName} image captured! Quality: ${quality}%`);
        } else {
          throw new Error("Failed to process fingerprint image");
        }
      } else {
        throw new Error("No fingerprint image data received from device");
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      console.error('Capture error:', error);
      toast.error(errorMessage);
    } finally {
      setIsCapturing(false);
    }
  }, [isConnected, isInitialized, targetQuality, fingerName, onChange, onImageChange]);

  // Enhanced bitmap processing for clearer images
  const processFingerprintBitmap = useCallback((bitmapData: string, width: number, height: number): string => {
    try {
      console.log(`Processing fingerprint bitmap for ${fingerName}:`, {
        dataLength: bitmapData.length,
        width,
        height
      });

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Failed to get canvas context');
        return "";
      }
      
      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      // Process each pixel with enhanced contrast and inversion
      const totalPixels = Math.min(binaryData.length, width * height);
      for (let i = 0; i < totalPixels; i++) {
        // Get pixel value and invert it (MFS100 typically returns inverted images)
        let pixelValue = 255 - binaryData.charCodeAt(i);
        
        // Apply contrast enhancement
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.3 + 20));
        
        const pixelIndex = i * 4;
        data[pixelIndex] = pixelValue;     // Red
        data[pixelIndex + 1] = pixelValue; // Green
        data[pixelIndex + 2] = pixelValue; // Blue
        data[pixelIndex + 3] = 255;        // Alpha
      }
      
      ctx.putImageData(imageData, 0, 0);
      const result = canvas.toDataURL('image/png', 1.0);
      
      console.log(`✅ Bitmap processed successfully for ${fingerName}, result length:`, result.length);
      return result;
      
    } catch (error) {
      console.error('Bitmap processing error:', error);
      return "";
    }
  }, [fingerName]);

  const getStatusColor = () => {
    if (isChecking) return "bg-yellow-500";
    return isConnected ? "bg-green-500" : "bg-red-500";
  };

  return (
    <div className="flex flex-col items-center space-y-4">
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
          {isChecking ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
        
        {captureQuality && (
          <Badge variant={captureQuality >= 70 ? "default" : "secondary"}>
            Quality: {captureQuality}%
          </Badge>
        )}
      </div>

      {/* Error Display */}
      {error && !isConnected && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={forceCheck}
              disabled={isChecking}
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Capture Button */}
      <Button
        type="button"
        onClick={handleCapture}
        disabled={isCapturing || !isConnected || !isInitialized}
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
          : isConnected && isInitialized
            ? `Capture ${fingerName}` 
            : 'Device Not Ready'
        }
      </Button>

      {/* Success Status */}
      {capturedImage && (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Fingerprint image captured successfully</span>
        </div>
      )}
    </div>
  );
}
