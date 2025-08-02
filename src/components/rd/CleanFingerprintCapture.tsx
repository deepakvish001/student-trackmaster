import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fingerprint, Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw, Power } from "lucide-react";
import { toast } from "sonner";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { useCleanMFS100 } from "@/hooks/useCleanMFS100";

interface CleanFingerprintCaptureProps {
  index: number;
  onCaptureSuccess: (template: string, quality: number, imageData?: string) => void;
  onCaptureError: (error: string) => void;
  disabled?: boolean;
  fingerName?: string;
  targetQuality?: number;
}

export function CleanFingerprintCapture({ 
  index, 
  onCaptureSuccess,
  onCaptureError,
  disabled = false,
  fingerName = `Finger ${index + 1}`,
  targetQuality = 60
}: CleanFingerprintCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  
  const { 
    isConnected,
    deviceInfo,
    error,
    message,
    isCapturing,
    activeCapture,
    lastCheckTime,
    checkDevice,
    captureFingerprint,
    reconnectDevice
  } = useCleanMFS100();

  // Process bitmap image
  const processBitmapImage = useCallback((bitmapData: string): string => {
    if (!bitmapData) return "";

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return "";

      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(256, 256);
      const data = imageData.data;

      for (let i = 0; i < binaryData.length && i < 65536; i++) {
        let pixelValue = 255 - binaryData.charCodeAt(i);
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.2 + 10));
        
        const pixelIndex = i * 4;
        data[pixelIndex] = pixelValue;
        data[pixelIndex + 1] = pixelValue;
        data[pixelIndex + 2] = pixelValue;
        data[pixelIndex + 3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL('image/png', 1.0);
      
    } catch (error) {
      console.error('Bitmap processing error:', error);
      return "";
    }
  }, []);

  // Connect device
  const handleConnect = useCallback(async () => {
    toast.info("Connecting to MFS100 device...");
    
    try {
      await checkDevice();
      if (isConnected) {
        setHasConnectedOnce(true);
        toast.success("Device connected successfully!");
      } else {
        toast.error("Failed to connect device - ensure MFS100 service is running");
      }
    } catch (error) {
      toast.error("Connection failed");
    }
  }, [checkDevice, isConnected]);

  // Reconnect device
  const handleReconnect = useCallback(async () => {
    toast.info("Reconnecting device...");
    
    try {
      await reconnectDevice();
      if (isConnected) {
        toast.success("Device reconnected successfully!");
      } else {
        toast.error("Reconnection failed");
      }
    } catch (error) {
      toast.error("Reconnection failed");
    }
  }, [reconnectDevice, isConnected]);

  // Capture fingerprint
  const handleCapture = useCallback(async () => {
    if (!isConnected) {
      toast.error("Device not connected");
      onCaptureError("Device not connected");
      return;
    }

    if (isCapturing && activeCapture !== fingerName) {
      toast.info(`${activeCapture} is being captured. Please wait...`);
      return;
    }

    try {
      toast.info(`Place ${fingerName} on scanner`, { 
        duration: 8000,
        description: "Keep finger steady until capture completes"
      });

      const result = await captureFingerprint(fingerName, targetQuality, 15);
      
      if (result.success) {
        setCaptureQuality(result.quality);

        // Process image if available
        let processedImage = "";
        if (result.imageData) {
          processedImage = processBitmapImage(result.imageData);
          setCapturedImage(processedImage);
        }

        toast.success(`${fingerName} captured successfully!`, {
          description: `Quality: ${result.quality}%`
        });

        onCaptureSuccess(result.template, result.quality, processedImage);

      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      toast.error(`Failed to capture ${fingerName}`, {
        description: errorMessage
      });
      onCaptureError(errorMessage);
    }
  }, [isConnected, isCapturing, activeCapture, fingerName, targetQuality, captureFingerprint, onCaptureSuccess, onCaptureError, processBitmapImage]);

  // Determine if this capture button should be disabled
  const isCaptureDisabled = disabled || !isConnected || (isCapturing && activeCapture !== fingerName);
  const isThisCapturing = isCapturing && activeCapture === fingerName;
  const isOtherCapturing = isCapturing && activeCapture !== fingerName;

  const getStatusBadge = () => {
    if (isThisCapturing) return <Badge className="bg-blue-500 text-white">Capturing...</Badge>;
    if (isOtherCapturing) return <Badge variant="secondary">Waiting...</Badge>;
    if (isConnected) return <Badge className="bg-green-500 text-white">Ready</Badge>;
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
          isCapturing={isThisCapturing}
          showQuality={true}
        />

        {/* Device Status */}
        <div className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span>{message}</span>
          </div>
          
          {captureQuality && (
            <Badge variant={captureQuality >= 70 ? "default" : captureQuality >= 60 ? "secondary" : "destructive"}>
              {captureQuality}%
            </Badge>
          )}
        </div>

        {/* Device Info */}
        {deviceInfo && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <div>Device: {deviceInfo.serialNo}</div>
            {lastCheckTime && (
              <div>Last check: {lastCheckTime.toLocaleTimeString()}</div>
            )}
          </div>
        )}

        {/* Other Capture Status */}
        {isOtherCapturing && (
          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
            <span>⏳ {activeCapture} is being captured...</span>
          </div>
        )}

        {/* Error Display */}
        {error && !isConnected && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Connection Buttons */}
          {!isConnected && (
            <div className="flex space-x-2">
              {!hasConnectedOnce ? (
                <Button
                  onClick={handleConnect}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  <Power className="mr-2 h-4 w-4" />
                  Connect Device
                </Button>
              ) : (
                <Button
                  onClick={handleReconnect}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reconnect Device
                </Button>
              )}
            </div>
          )}

          {/* Capture Button */}
          <Button
            onClick={handleCapture}
            disabled={isCaptureDisabled}
            className={`w-full transition-all duration-300 ${
              isThisCapturing 
                ? 'bg-blue-500 hover:bg-blue-600 animate-pulse' 
                : isConnected 
                  ? 'bg-primary hover:bg-primary/90' 
                  : 'bg-gray-400 cursor-not-allowed'
            }`}
            size="lg"
          >
            <Fingerprint className="mr-2 h-5 w-5" />
            {isThisCapturing
              ? `Capturing ${fingerName}...`
              : isOtherCapturing
                ? `Wait for ${activeCapture}...`
                : isConnected
                  ? `Capture ${fingerName}`
                  : 'Connect Device First'
            }
          </Button>
        </div>

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
