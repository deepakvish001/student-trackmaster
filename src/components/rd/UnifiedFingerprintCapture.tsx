
import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fingerprint, Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw, Info, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { useUnifiedMFS100Service } from "@/hooks/useUnifiedMFS100Service";

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
  const [captureProgress, setCaptureProgress] = useState<string>("");
  const [isMyCapture, setIsMyCapture] = useState(false);
  const captureIdRef = useRef<string>("");
  
  const { 
    isConnected,
    isCapturing,
    error,
    deviceInfo,
    queueLength,
    currentCapture,
    lastCheckTime,
    queueCapture,
    cancelCapture,
    softReset
  } = useUnifiedMFS100Service();

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
    if (isCapturing && !isMyCapture) {
      toast.info(`${currentCapture} is being captured. Please wait...`);
      return;
    }

    if (!isConnected) {
      toast.error("Device not available. Attempting soft reset...");
      await softReset();
      return;
    }

    try {
      setLastError("");
      setCaptureProgress("Queued for capture...");
      setIsMyCapture(true);
      captureIdRef.current = `${fingerName}_${Date.now()}`;

      toast.info(`${fingerName} added to capture queue`, { 
        duration: 3000,
        description: queueLength > 0 ? `Position in queue: ${queueLength + 1}` : "Starting capture..."
      });

      const result = await queueCapture(
        fingerName, 
        targetQuality, 
        15,
        (status) => setCaptureProgress(status)
      );

      if (result.success) {
        setCaptureQuality(result.quality);

        let processedImage = "";
        if (result.imageData) {
          processedImage = processBitmapImage(result.imageData);
          setCapturedImage(processedImage);
        }

        toast.success(`${fingerName} captured successfully!`, {
          description: `Quality: ${result.quality}%`
        });

        onCaptureSuccess(result.template, result.quality, processedImage);
        setCaptureProgress("Capture completed!");

      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      setLastError(errorMessage);
      
      toast.error(`Failed to capture ${fingerName}`, {
        description: errorMessage,
        duration: 5000
      });
      
      onCaptureError(errorMessage);
      setCaptureProgress("");
      
    } finally {
      setIsMyCapture(false);
      setTimeout(() => setCaptureProgress(""), 3000);
    }
  }, [isConnected, isCapturing, isMyCapture, currentCapture, fingerName, targetQuality, queueLength, queueCapture, onCaptureSuccess, onCaptureError, processBitmapImage, softReset]);

  const handleCancel = useCallback(() => {
    if (isMyCapture) {
      cancelCapture();
      setIsMyCapture(false);
      setCaptureProgress("");
      toast.info(`${fingerName} capture cancelled`);
    }
  }, [isMyCapture, cancelCapture, fingerName]);

  const handleSoftReset = useCallback(async () => {
    setLastError("");
    setCaptureProgress("Resetting service...");
    await softReset();
    setCaptureProgress("");
    toast.info("Service reset completed");
  }, [softReset]);

  const getStatusBadge = () => {
    if (isConnected) return <Badge className="bg-green-500 text-white">Connected</Badge>;
    return <Badge variant="destructive">Disconnected</Badge>;
  };

  const isInQueue = isCapturing && currentCapture !== fingerName;
  const isCurrentlyCapturing = isCapturing && currentCapture === fingerName;

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
          isCapturing={isCurrentlyCapturing}
          showQuality={true}
        />

        {/* Queue Status */}
        {isInQueue && (
          <div className="flex items-center space-x-2 text-sm bg-blue-50 p-2 rounded">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>Waiting in queue... Current: {currentCapture}</span>
          </div>
        )}

        {/* Capture Progress */}
        {captureProgress && (
          <div className="text-sm text-center text-blue-600 bg-blue-50 p-2 rounded">
            {captureProgress}
          </div>
        )}

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
              <span>Device: {deviceInfo.SerialNo || 'MFS100'}</span>
            </div>
            {lastCheckTime && (
              <div className="mt-1">
                Last check: {lastCheckTime.toLocaleTimeString()}
              </div>
            )}
            {queueLength > 0 && (
              <div className="mt-1 text-blue-600">
                Queue: {queueLength} waiting
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {(error || lastError) && !isConnected && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>{error || lastError}</div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSoftReset}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Soft Reset
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Capture Buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={handleCapture}
            disabled={disabled || !isConnected || (isCapturing && !isMyCapture)}
            className={`flex-1 transition-all duration-300 ${
              isCurrentlyCapturing || isInQueue
                ? 'bg-blue-500 hover:bg-blue-600' 
                : isConnected 
                  ? 'bg-primary hover:bg-primary/90' 
                  : 'bg-gray-400 cursor-not-allowed'
            }`}
            size="lg"
          >
            <Fingerprint className="mr-2 h-5 w-5" />
            {isCurrentlyCapturing
              ? 'Capturing...' 
              : isInQueue
                ? 'In Queue...'
                : isConnected
                  ? `Capture ${fingerName}` 
                  : 'Device Not Available'
            }
          </Button>

          {(isCurrentlyCapturing || isInQueue) && isMyCapture && (
            <Button
              onClick={handleCancel}
              variant="outline"
              size="lg"
              className="px-3"
              aria-label={`Cancel ${fingerName} capture`}
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
