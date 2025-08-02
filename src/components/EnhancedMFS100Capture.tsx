
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
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
    mfs100Client
  } = useModernDeviceConnection();

  const [captureProgress, setCaptureProgress] = useState<{
    isCapturing: boolean;
    progress: number;
  }>({
    isCapturing: false,
    progress: 0
  });

  const [captureQuality, setCaptureQuality] = useState<number | null>(null);

  const {
    captureState,
    captureData,
    startCapture,
    showPreview,
    acceptCapture,
    resetCapture
  } = useFingerprintCaptureState();

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
    try {
      startCapture();
      setCaptureProgress({
        isCapturing: true,
        progress: 10
      });

      toast.info(`Place ${fingerName} on scanner`, { duration: 4000 });

      setCaptureProgress(prev => ({ ...prev, progress: 30 }));
      
      const result = await mfs100Client.captureFingerprint({
        quality: targetQuality,
        timeout: 15,
        retries: 3
      });

      if (!result.httpStaus || result.data?.ErrorCode !== "0") {
        throw new Error(result.data?.ErrorDescription || result.err || "Capture failed");
      }

      setCaptureProgress(prev => ({ ...prev, progress: 70 }));
      
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
          showPreview({
            template: result.data.IsoTemplate || '',
            imageData: processedImage,
            quality: quality
          });

          toast.success(`${fingerName} captured successfully!`);
          setCaptureProgress(prev => ({ ...prev, progress: 100 }));
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
        progress: 0
      });
    } finally {
      setTimeout(() => {
        setCaptureProgress({
          isCapturing: false,
          progress: 0
        });
      }, 2000);
    }
  }, [targetQuality, fingerName, startCapture, showPreview, resetCapture, mfs100Client, processFingerprintBitmap]);

  const handleAcceptCapture = useCallback(() => {
    if (!captureData) return;

    // Save the processed image as the main value
    onChange(captureData.imageData);
    onImageChange?.(captureData.imageData);
    
    acceptCapture();
    onAccepted?.();
    
    toast.success(`${fingerName} accepted and saved!`);
  }, [captureData, onChange, onImageChange, acceptCapture, onAccepted, fingerName]);

  const handleRecapture = useCallback(() => {
    resetCapture();
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

  // Clean grid layout matching the screenshot
  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm w-full max-w-[180px] mx-auto">
      {/* Header */}
      <div className="text-center mb-2">
        <h3 className="font-medium text-sm text-gray-800">{fingerName}</h3>
        {captureQuality && (
          <Badge variant={captureQuality >= 70 ? "default" : "secondary"} className="text-xs mt-1">
            {captureQuality}%
          </Badge>
        )}
      </div>

      {/* Fingerprint Display Area - Fixed dimensions to match screenshot */}
      <div className={`relative w-full h-32 border-2 rounded-lg flex items-center justify-center mb-3 transition-all duration-300 ${
        captureState === 'capturing' 
          ? 'border-blue-500 border-dashed animate-pulse bg-blue-50' 
          : captureState === 'accepted' && value
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 bg-gray-50'
      }`}>
        {captureState === 'capturing' ? (
          <div className="flex flex-col items-center space-y-2 text-blue-600">
            <Fingerprint className="h-5 w-5 animate-pulse" />
            <span className="text-xs font-medium">Scanning...</span>
            {captureProgress.progress > 0 && (
              <Progress value={captureProgress.progress} className="w-20 h-1" />
            )}
          </div>
        ) : value ? (
          <div className="relative w-full h-full">
            <img 
              src={value}
              alt={`${fingerName} fingerprint`}
              className="w-full h-full object-contain rounded"
              style={{ 
                filter: 'contrast(1.2) brightness(1.1)',
                imageRendering: 'crisp-edges'
              }}
            />
            {captureState === 'accepted' && (
              <div className="absolute -top-1 -right-1">
                <div className="bg-green-500 text-white rounded-full p-0.5">
                  <CheckCircle className="h-2.5 w-2.5" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-1 text-gray-400">
            <Fingerprint className="h-5 w-5" />
            <span className="text-xs">No Print</span>
          </div>
        )}
      </div>

      {/* Always-Available Capture Button */}
      <Button
        onClick={captureState === 'accepted' && value ? handleRecapture : handleCapture}
        disabled={captureState === 'capturing'}
        className={`w-full text-white transition-all duration-300 text-xs py-1.5 h-8 ${
          captureState === 'capturing' 
            ? 'bg-blue-500 hover:bg-blue-600 animate-pulse' 
            : captureState === 'accepted' && value
              ? 'bg-orange-500 hover:bg-orange-600'
              : isConnected 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-orange-500 hover:bg-orange-600'
        }`}
        size="sm"
      >
        <Fingerprint className="mr-1 h-3 w-3" />
        {captureState === 'capturing' 
          ? 'Capturing...' 
          : captureState === 'accepted' && value
            ? 'Recapture'
            : 'Capture'
        }
      </Button>

      {/* Connection Warning - Only show when disconnected and not capturing */}
      {!isConnected && captureState !== 'capturing' && (
        <div className="text-xs text-orange-600 text-center mt-1 flex items-center justify-center">
          <AlertCircle className="h-2.5 w-2.5 mr-1" />
          Device offline
        </div>
      )}
    </div>
  );
}
