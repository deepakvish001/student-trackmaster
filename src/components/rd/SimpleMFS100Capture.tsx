
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fingerprint, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { useSimpleMFS100 } from "@/hooks/useSimpleMFS100";

interface SimpleMFS100CaptureProps {
  index: number;
  onCaptureSuccess: (imageData: string, quality: number) => void;
  onCaptureError: (error: string) => void;
  disabled?: boolean;
  fingerName?: string;
  targetQuality?: number;
}

export function SimpleMFS100Capture({ 
  index, 
  onCaptureSuccess,
  onCaptureError,
  disabled = false,
  fingerName = `Finger ${index + 1}`,
  targetQuality = 60
}: SimpleMFS100CaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);
  const [serviceChecked, setServiceChecked] = useState(false);
  const [serviceAvailable, setServiceAvailable] = useState(true); // Assume available until proven otherwise
  
  const { isCapturing, lastError, captureFingerprint, checkService } = useSimpleMFS100();

  const handleCapture = useCallback(async () => {
    try {
      toast.info(`Place ${fingerName} on scanner`, { duration: 3000 });
      
      const result = await captureFingerprint(targetQuality, 15);
      
      if (result.success) {
        // Process image if available
        if (result.imageData) {
          const processedImage = processFingerprintBitmap(result.imageData);
          if (processedImage) {
            setCapturedImage(processedImage);
            setCaptureQuality(result.quality);
            
            toast.success(`${fingerName} captured! Quality: ${result.quality}%`);
            
            onCaptureSuccess(processedImage, result.quality);
            return;
          }
        }
        
        // If no image but successful, still report success
        toast.success(result.message);
        onCaptureSuccess('', result.quality);
        
      } else {
        // Handle failure
        throw new Error(result.message);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      console.error('Capture error:', error);
      toast.error(`Failed to capture ${fingerName}: ${errorMessage}`);
      onCaptureError(errorMessage);
      
      // If service-related error, mark as unavailable
      if (errorMessage.includes('service') || errorMessage.includes('connection')) {
        setServiceAvailable(false);
      }
    }
  }, [fingerName, targetQuality, captureFingerprint, onCaptureSuccess, onCaptureError]);

  const handleCheckService = useCallback(async () => {
    const available = await checkService();
    setServiceAvailable(available);
    setServiceChecked(true);
    
    if (available) {
      toast.success('MFS100 service is ready');
    } else {
      toast.error('MFS100 service not available - please ensure it is running');
    }
  }, [checkService]);

  // Enhanced bitmap processing
  const processFingerprintBitmap = useCallback((bitmapData: string): string => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return "";
      
      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(256, 256);
      const data = imageData.data;
      
      for (let i = 0; i < Math.min(binaryData.length, 256 * 256); i++) {
        let pixelValue = 255 - binaryData.charCodeAt(i);
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.3 + 20));
        
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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{fingerName}</span>
          <Badge variant={serviceAvailable ? "default" : "destructive"}>
            {isCapturing ? 'Capturing...' : serviceAvailable ? 'Ready' : 'Check Service'}
          </Badge>
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

        {/* Service Check Button - only show when needed */}
        {!serviceAvailable && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>MFS100 service needs verification</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCheckService}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Check Service
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {lastError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{lastError}</AlertDescription>
          </Alert>
        )}

        {/* Main Capture Button */}
        <Button
          onClick={handleCapture}
          disabled={isCapturing || disabled}
          className={`w-full transition-all duration-300 ${
            isCapturing 
              ? 'bg-blue-500 hover:bg-blue-600 animate-pulse' 
              : 'bg-primary hover:bg-primary/90'
          }`}
          size="lg"
        >
          <Fingerprint className="mr-2 h-5 w-5" />
          {isCapturing 
            ? `Capturing ${fingerName}...` 
            : `Capture ${fingerName}`
          }
        </Button>

        {/* Success Status */}
        {capturedImage && (
          <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2 rounded">
            <CheckCircle className="h-4 w-4" />
            <span>Fingerprint captured successfully</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
