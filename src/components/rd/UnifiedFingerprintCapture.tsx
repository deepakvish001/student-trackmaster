
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fingerprint, Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw, Info, X } from "lucide-react";
import { toast } from "sonner";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { useUnifiedMFS100 } from "@/hooks/useUnifiedMFS100";

interface UnifiedFingerprintCaptureProps {
  index: number;
  onCaptureSuccess: (pidData: string, quality: number, imageData?: string) => void;
  onCaptureError: (error: string) => void;
  disabled?: boolean;
  fingerName?: string;
  targetQuality?: number;
}

export function UnifiedFingerprintCapture({ 
  index, 
  onCaptureSuccess,
  onCaptureError,
  disabled = false,
  fingerName = `Finger ${index + 1}`,
  targetQuality = 60
}: UnifiedFingerprintCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string>("");
  const [retryAttempts, setRetryAttempts] = useState<number>(0);
  
  const { 
    isConnected, 
    error, 
    deviceInfo, 
    consecutiveFailures,
    lastCheckTime,
    isCapturing,
    checkDevice,
    captureFingerprint,
    resetConnection,
    cancelCapture
  } = useUnifiedMFS100();

  // Process bitmap data to displayable image
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

  const handleCapture = useCallback(async () => {
    if (!isConnected || isCapturing) {
      if (!isConnected) {
        toast.error("Device not available. Please check connection.");
        onCaptureError("Device not available");
      }
      return;
    }

    try {
      setLastError("");
      setRetryAttempts(prev => prev + 1);
      
      toast.info(`Place ${fingerName} on scanner`, { 
        duration: 10000,
        description: "Keep finger steady until capture completes"
      });

      const result = await captureFingerprint(targetQuality, 15);
      
      if (result.success) {
        setCaptureQuality(result.quality);
        setRetryAttempts(0);

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
      setLastError(errorMessage);
      
      toast.error(`Failed to capture ${fingerName}`, {
        description: errorMessage,
        action: retryAttempts < 3 ? {
          label: "Retry",
          onClick: () => setTimeout(() => handleCapture(), 1000)
        } : undefined
      });
      
      onCaptureError(errorMessage);
    }
  }, [isConnected, isCapturing, fingerName, targetQuality, captureFingerprint, onCaptureSuccess, onCaptureError, processBitmapImage, retryAttempts]);

  const handleCancelCapture = useCallback(() => {
    if (isCapturing) {
      cancelCapture();
      toast.info(`${fingerName} capture cancelled`);
    }
  }, [isCapturing, cancelCapture, fingerName]);

  const handleRecovery = useCallback(async () => {
    setLastError("");
    setRetryAttempts(0);
    await resetConnection();
    toast.info("Service recovery initiated...");
  }, [resetConnection]);

  const getStatusBadge = () => {
    if (isConnected) return <Badge className="bg-green-500 text-white">Connected</Badge>;
    if (consecutiveFailures >= 3) return <Badge variant="destructive">Service Error</Badge>;
    return <Badge variant="destructive">Disconnected</Badge>;
  };

  const isServiceDown = consecutiveFailures >= 3 || (error && error.includes('service not running'));

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
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-gray-600">
              {isConnected ? 'Device Ready' : 'Device Not Available'}
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
            {retryAttempts > 0 && (
              <div className="mt-1 text-orange-600">
                Retry attempts: {retryAttempts}
              </div>
            )}
          </div>
        )}

        {/* Error Display with Recovery */}
        {(error || lastError) && !isConnected && (
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
                    onClick={checkDevice}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Check Device
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRecovery}
                  >
                    Recover Service
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Service Setup Instructions */}
        {isServiceDown && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Service Recovery Required:</p>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Ensure MFS100 device is connected via USB</li>
                  <li>Start the MFS100 service application</li>
                  <li>Verify service runs on https://localhost:8003</li>
                  <li>Click "Recover Service" above</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Capture Buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={handleCapture}
            disabled={isCapturing || !isConnected || disabled}
            className={`flex-1 transition-all duration-300 ${
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
              ? `Capturing...` 
              : isConnected
                ? `Capture ${fingerName}` 
                : 'Device Not Available'
            }
          </Button>

          {isCapturing && (
            <Button
              onClick={handleCancelCapture}
              variant="outline"
              size="lg"
              className="px-3"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
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
