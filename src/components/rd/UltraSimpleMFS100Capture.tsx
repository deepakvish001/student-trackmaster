
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fingerprint, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { useUltraSimpleMFS100 } from "@/hooks/useUltraSimpleMFS100";

interface UltraSimpleMFS100CaptureProps {
  index: number;
  onCaptureSuccess: (imageData: string, quality: number) => void;
  onCaptureError: (error: string) => void;
  disabled?: boolean;
  fingerName?: string;
  targetQuality?: number;
}

export function UltraSimpleMFS100Capture({ 
  index, 
  onCaptureSuccess,
  onCaptureError,
  disabled = false,
  fingerName = `Finger ${index + 1}`,
  targetQuality = 60
}: UltraSimpleMFS100CaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);
  
  const { isCapturing, lastError, captureFingerprint } = useUltraSimpleMFS100();

  const handleCapture = useCallback(async () => {
    try {
      toast.info(`Place ${fingerName} on scanner`, { duration: 2000 });
      
      const result = await captureFingerprint(targetQuality, 15);
      
      if (result.success) {
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
        
        toast.success(result.message);
        onCaptureSuccess('', result.quality);
      } else {
        toast.error(`${fingerName}: ${result.message}`);
        onCaptureError(result.message);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      toast.error(`${fingerName}: ${errorMessage}`);
      onCaptureError(errorMessage);
    }
  }, [fingerName, targetQuality, captureFingerprint, onCaptureSuccess, onCaptureError]);

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
          {capturedImage && <span className="text-sm text-green-600">✓ Captured</span>}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <FingerprintDisplay 
          value={capturedImage}
          imageData={capturedImage}
          index={index}
          quality={captureQuality}
          isCapturing={isCapturing}
          showQuality={true}
        />

        {lastError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{lastError}</AlertDescription>
          </Alert>
        )}

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
      </CardContent>
    </Card>
  );
}
