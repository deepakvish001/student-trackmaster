import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fingerprint, Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw, Info, Clock, Settings } from "lucide-react";
import { toast } from "sonner";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { useUnifiedMFS100 } from "@/hooks/useUnifiedMFS100";
import { fingerprintCaptureQueue } from "@/services/fingerprintCaptureQueue";
import { MFS100ServiceHelper } from "@/components/MFS100ServiceHelper";

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
  const [isInQueue, setIsInQueue] = useState(false);
  const [showServiceHelper, setShowServiceHelper] = useState(false);
  
  const { 
    isConnected, 
    error, 
    deviceInfo, 
    consecutiveFailures,
    lastCheckTime,
    checkDevice,
    resetConnection
  } = useUnifiedMFS100();

  // Show service helper when there are connection issues
  useEffect(() => {
    if (consecutiveFailures >= 3 && error?.includes('ERR_CONNECTION_REFUSED')) {
      setShowServiceHelper(true);
    }
  }, [consecutiveFailures, error]);

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
    if (!isConnected) {
      toast.error("Device not available. Please check connection.");
      onCaptureError("Device not available");
      return;
    }

    // Check if already in queue or capturing
    if (fingerprintCaptureQueue.isFingerInQueue(index)) {
      toast.warning("This finger is already in the capture queue");
      return;
    }

    try {
      setLastError("");
      setIsInQueue(true);
      
      const queueInfo = fingerprintCaptureQueue.getCurrentCaptureInfo();
      if (queueInfo.fingerIndex !== null && queueInfo.fingerIndex !== index) {
        toast.info(`${fingerName} added to queue`, { 
          description: `Currently capturing Finger ${queueInfo.fingerIndex + 1}. Queue position: ${queueInfo.queueLength + 1}`
        });
      } else {
        toast.info(`Starting capture for ${fingerName}`, { 
          description: "Keep finger steady on scanner"
        });
      }

      const result = await fingerprintCaptureQueue.captureFingerprint(index, targetQuality, 15);
      
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

      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      setLastError(errorMessage);
      
      toast.error(`Failed to capture ${fingerName}`, {
        description: errorMessage
      });
      
      onCaptureError(errorMessage);
    } finally {
      setIsInQueue(false);
    }
  }, [isConnected, fingerName, targetQuality, index, onCaptureSuccess, onCaptureError, processBitmapImage]);

  const getStatusBadge = () => {
    if (isInQueue) return <Badge className="bg-blue-500 text-white animate-pulse">In Queue</Badge>;
    if (isConnected) return <Badge className="bg-green-500 text-white">Connected</Badge>;
    return <Badge variant="destructive">Disconnected</Badge>;
  };

  const queueInfo = fingerprintCaptureQueue.getCurrentCaptureInfo();
  const isCurrentlyCapturing = queueInfo.fingerIndex === index;
  const isOtherCapturing = queueInfo.fingerIndex !== null && queueInfo.fingerIndex !== index;

  const handleServiceReady = () => {
    setShowServiceHelper(false);
    setLastError("");
    checkDevice();
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
        {/* Service Helper - Show when service is down */}
        {showServiceHelper && (
          <div className="mb-4">
            <MFS100ServiceHelper onServiceReady={handleServiceReady} />
          </div>
        )}

        {/* Queue Status */}
        {isOtherCapturing && (
          <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
            <Clock className="h-4 w-4" />
            <span>Waiting... Finger {queueInfo.fingerIndex! + 1} is capturing</span>
          </div>
        )}

        {/* Fingerprint Display */}
        <FingerprintDisplay 
          value={capturedImage}
          imageData={capturedImage}
          index={index}
          quality={captureQuality}
          isCapturing={isCurrentlyCapturing}
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
          </div>
        )}

        {/* Enhanced Error Display with Service Helper */}
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
                    onClick={resetConnection}
                  >
                    Reset Connection
                  </Button>
                  {error?.includes('ERR_CONNECTION_REFUSED') && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowServiceHelper(true)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Service Help
                    </Button>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Instructions */}
        {!isConnected && consecutiveFailures >= 3 && (
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
          disabled={isInQueue || isOtherCapturing || !isConnected || disabled}
          className={`w-full transition-all duration-300 ${
            isCurrentlyCapturing 
              ? 'bg-blue-500 hover:bg-blue-600 animate-pulse' 
              : isOtherCapturing
                ? 'bg-gray-400 cursor-not-allowed'
              : isConnected 
                ? 'bg-primary hover:bg-primary/90' 
                : 'bg-gray-400 cursor-not-allowed'
          }`}
          size="lg"
        >
          <Fingerprint className="mr-2 h-5 w-5" />
          {isCurrentlyCapturing
            ? `Capturing ${fingerName}...` 
            : isOtherCapturing
              ? `Wait for Finger ${queueInfo.fingerIndex! + 1}`
              : isInQueue
                ? `${fingerName} in Queue`
              : isConnected
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
