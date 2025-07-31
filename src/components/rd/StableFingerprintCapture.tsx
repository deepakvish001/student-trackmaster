
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fingerprint, Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { useStableMFS100 } from "@/hooks/useStableMFS100";

interface StableFingerprintCaptureProps {
  index: number;
  onCaptureSuccess: (pidData: string, quality: number, imageData?: string) => void;
  onCaptureError: (error: string) => void;
  disabled?: boolean;
  fingerName?: string;
  targetQuality?: number;
}

export function StableFingerprintCapture({ 
  index, 
  onCaptureSuccess,
  onCaptureError,
  disabled = false,
  fingerName = `Finger ${index + 1}`,
  targetQuality = 60
}: StableFingerprintCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string>("");
  
  const { 
    isAvailable, 
    isChecking, 
    error, 
    deviceInfo, 
    consecutiveFailures,
    lastCheckTime,
    isCapturing,
    checkDevice,
    captureFingerprint,
    resetConnection
  } = useStableMFS100();

  // Process bitmap data to displayable image
  const processBitmapImage = useCallback((bitmapData: string): string => {
    if (!bitmapData) return "";

    try {
      console.log(`Processing bitmap for ${fingerName}, data length: ${bitmapData.length}`);
      
      // Create canvas for processing
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return "";

      // Decode base64 bitmap data
      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(256, 256);
      const data = imageData.data;

      // Process each pixel (MFS100 provides grayscale data)
      for (let i = 0; i < binaryData.length && i < 65536; i++) {
        // Invert and enhance the pixel
        let pixelValue = 255 - binaryData.charCodeAt(i);
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.2 + 10));
        
        const pixelIndex = i * 4;
        data[pixelIndex] = pixelValue;     // Red
        data[pixelIndex + 1] = pixelValue; // Green
        data[pixelIndex + 2] = pixelValue; // Blue
        data[pixelIndex + 3] = 255;        // Alpha
      }

      ctx.putImageData(imageData, 0, 0);
      const result = canvas.toDataURL('image/png', 1.0);
      
      console.log(`✅ Bitmap processed successfully for ${fingerName}`);
      return result;
      
    } catch (error) {
      console.error('Bitmap processing error:', error);
      return "";
    }
  }, [fingerName]);

  const handleCapture = useCallback(async () => {
    if (!isAvailable || isCapturing) {
      if (!isAvailable) {
        toast.error("Device not available. Please check connection.");
        onCaptureError("Device not available");
      }
      return;
    }

    try {
      setLastError("");
      
      toast.info(`Place ${fingerName} on scanner`, { 
        duration: 8000,
        description: "Keep finger steady until capture completes"
      });

      console.log(`🔄 Starting capture for ${fingerName}...`);

      const result = await captureFingerprint(targetQuality, 15);
      
      if (result.success) {
        setCaptureQuality(result.quality);

        // Process the bitmap image
        let processedImage = "";
        if (result.imageData) {
          processedImage = processBitmapImage(result.imageData);
          setCapturedImage(processedImage);
        }

        toast.success(`${fingerName} captured successfully!`, {
          description: `Quality: ${result.quality}%`
        });

        console.log(`✅ ${fingerName} captured successfully:`, {
          quality: result.quality,
          templateLength: result.template.length,
          hasImage: !!processedImage
        });

        onCaptureSuccess(result.template, result.quality, processedImage);

      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      console.error(`❌ Capture failed for ${fingerName}:`, error);
      setLastError(errorMessage);
      
      toast.error(`Failed to capture ${fingerName}`, {
        description: errorMessage
      });
      
      onCaptureError(errorMessage);
    }
  }, [isAvailable, isCapturing, fingerName, targetQuality, captureFingerprint, onCaptureSuccess, onCaptureError, processBitmapImage]);

  const handleRetry = useCallback(async () => {
    console.log(`🔄 Retrying connection for ${fingerName}...`);
    toast.info("Checking device connection...");
    await checkDevice();
  }, [fingerName, checkDevice]);

  const handleReset = useCallback(async () => {
    console.log(`🔄 Resetting connection for ${fingerName}...`);
    toast.info("Resetting device connection...");
    await resetConnection();
  }, [fingerName, resetConnection]);

  const getStatusBadge = () => {
    if (isChecking) return <Badge variant="secondary">Checking...</Badge>;
    if (isAvailable) return <Badge className="bg-green-500 text-white">Connected</Badge>;
    return <Badge variant="destructive">Disconnected</Badge>;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Fingerprint className="h-5 w-5" />
            <span>{fingerName}</span>
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Fingerprint Display */}
        <FingerprintDisplay 
          value={capturedImage}
          imageData={capturedImage}
          index={index}
          quality={captureQuality}
          isCapturing={isCapturing}
          showQuality={true}
        />

        {/* Status Information */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {isAvailable ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-gray-600">
              {isAvailable ? 'Device Ready' : 'Device Not Available'}
            </span>
          </div>
          
          {captureQuality && (
            <Badge variant={captureQuality >= 70 ? "default" : captureQuality >= 60 ? "secondary" : "destructive"}>
              Quality: {captureQuality}%
            </Badge>
          )}
        </div>

        {/* Device Information */}
        {deviceInfo && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <div className="flex items-center space-x-1">
              <Info className="h-3 w-3" />
              <span>Device: {deviceInfo.dpId}</span>
            </div>
            {lastCheckTime && (
              <div className="mt-1">
                Last check: {lastCheckTime.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {(error || lastError) && !isAvailable && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>{error || lastError}</div>
                {consecutiveFailures > 0 && (
                  <div className="text-xs">
                    Failed attempts: {consecutiveFailures}
                  </div>
                )}
                <div className="flex space-x-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRetry}
                    disabled={isChecking}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
                    Check Device
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleReset}
                    disabled={isChecking}
                  >
                    Reset Connection
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Instructions */}
        {!isAvailable && consecutiveFailures >= 3 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Device Setup Check:</p>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Ensure MFS100 device is connected via USB</li>
                  <li>Start the MFS100 service application</li>
                  <li>Verify service runs on https://localhost:8003</li>
                  <li>Try the "Reset Connection" button</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Capture Button */}
        <Button
          onClick={handleCapture}
          disabled={isCapturing || !isAvailable || disabled}
          className={`w-full transition-all duration-300 ${
            isCapturing 
              ? 'bg-blue-500 hover:bg-blue-600 animate-pulse' 
              : isAvailable 
                ? 'bg-primary hover:bg-primary/90' 
                : 'bg-gray-400 cursor-not-allowed'
          }`}
          size="lg"
        >
          <Fingerprint className="mr-2 h-5 w-5" />
          {isCapturing 
            ? `Capturing ${fingerName}...` 
            : isAvailable
              ? `Capture ${fingerName}` 
              : 'Device Not Available'
          }
        </Button>

        {/* Success Status */}
        {capturedImage && (
          <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2 rounded">
            <CheckCircle className="h-4 w-4" />
            <span>Fingerprint captured and ready</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
