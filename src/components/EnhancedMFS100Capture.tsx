import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
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
  targetQuality = 60,
  fingerName
}: EnhancedMFS100CaptureProps) {
  const {
    isConnected,
    mfs100Client
  } = useModernDeviceConnection();

  const [isCapturing, setIsCapturing] = useState(false);
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);
  const [capturedImage, setCapturedImage] = useState<string>("");

  // Enhanced bitmap processing for crystal-clear fingerprint images
  const processRealFingerprintBitmap = useCallback((bitmapData: string, width: number = 300, height: number = 300): string => {
    try {
      console.log(`🔍 Processing HIGH-QUALITY MFS100 bitmap for ${fingerName}:`, {
        bitmapLength: bitmapData.length,
        dimensions: `${width}x${height}`,
        firstBytes: bitmapData.substring(0, 20)
      });

      // Convert base64 to binary array
      const binaryStr = atob(bitmapData);
      const binaryArray = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        binaryArray[i] = binaryStr.charCodeAt(i);
      }

      console.log(`📊 Raw fingerprint data: ${binaryArray.length} bytes`);

      // Auto-detect or use provided dimensions
      let actualWidth = width;
      let actualHeight = height;

      // Calculate expected dimensions based on data size
      const totalPixels = binaryArray.length;
      const sqrtSize = Math.floor(Math.sqrt(totalPixels));
      
      if (sqrtSize * sqrtSize === totalPixels) {
        actualWidth = actualHeight = sqrtSize;
        console.log(`📐 Calculated square dimensions: ${sqrtSize}x${sqrtSize}`);
      } else {
        // Try standard MFS100 resolutions
        const standardSizes = [
          [336, 336], [300, 300], [256, 256], [400, 300], [320, 240], [640, 480]
        ];
        
        for (const [w, h] of standardSizes) {
          if (w * h <= totalPixels * 1.1 && w * h >= totalPixels * 0.9) {
            actualWidth = w;
            actualHeight = h;
            console.log(`📐 Using standard MFS100 dimensions: ${w}x${h}`);
            break;
          }
        }
      }

      // Create high-resolution canvas
      const canvas = document.createElement('canvas');
      canvas.width = actualWidth;
      canvas.height = actualHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Create image data
      const imageData = ctx.createImageData(actualWidth, actualHeight);
      const pixels = imageData.data;
      
      // Process each pixel for maximum clarity
      const maxPixels = Math.min(totalPixels, actualWidth * actualHeight);
      
      for (let i = 0; i < maxPixels; i++) {
        // Get raw pixel value from MFS100 device
        let rawValue = binaryArray[i];
        
        // MFS100 bitmap processing for clear ridge/valley definition
        // Low values = ridges (fingerprint lines), High values = valleys (background)
        
        let processedValue;
        
        if (rawValue < 60) {
          // Very dark ridges - make them sharp black for clear definition
          processedValue = 0;
        } else if (rawValue < 120) {
          // Ridge edges - keep dark but slightly lighter
          processedValue = Math.max(0, rawValue - 60);
        } else if (rawValue < 180) {
          // Transition areas - enhance contrast
          processedValue = Math.min(255, rawValue + 40);
        } else {
          // Valley areas - make them bright white for maximum contrast
          processedValue = 255;
        }
        
        // Apply additional contrast enhancement for crisp fingerprint details
        if (processedValue < 128) {
          processedValue = Math.max(0, processedValue - 20); // Darken ridges more
        } else {
          processedValue = Math.min(255, processedValue + 20); // Brighten valleys more
        }
        
        const pixelIndex = i * 4;
        if (pixelIndex + 3 < pixels.length) {
          pixels[pixelIndex] = processedValue;     // Red
          pixels[pixelIndex + 1] = processedValue; // Green  
          pixels[pixelIndex + 2] = processedValue; // Blue
          pixels[pixelIndex + 3] = 255;            // Alpha (fully opaque)
        }
      }
      
      // Fill remaining pixels with white background
      for (let i = maxPixels * 4; i < pixels.length; i += 4) {
        pixels[i] = 255;     // White background
        pixels[i + 1] = 255;
        pixels[i + 2] = 255;
        pixels[i + 3] = 255;
      }
      
      // Put processed image data on canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Apply additional sharpening filter for crystal-clear ridges
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = actualWidth;
      finalCanvas.height = actualHeight;
      const finalCtx = finalCanvas.getContext('2d');
      
      if (finalCtx) {
        // Draw the processed image
        finalCtx.drawImage(canvas, 0, 0);
        
        // Apply sharpening filter for enhanced ridge definition
        finalCtx.filter = 'contrast(1.3) brightness(1.1)';
        finalCtx.drawImage(canvas, 0, 0);
        
        // Convert to high-quality PNG
        const highQualityPng = finalCanvas.toDataURL('image/png', 1.0);
        
        console.log(`✅ CRYSTAL-CLEAR fingerprint PNG generated for ${fingerName}:`, {
          resultLength: highQualityPng.length,
          finalDimensions: `${actualWidth}x${actualHeight}`,
          quality: 'Enhanced for maximum ridge clarity'
        });
        
        return highQualityPng;
      }
      
      // Fallback to original processing
      const result = canvas.toDataURL('image/png', 1.0);
      console.log(`✅ Standard fingerprint PNG generated for ${fingerName}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Fingerprint processing error for ${fingerName}:`, error);
      return "";
    }
  }, [fingerName]);

  const handleCapture = useCallback(async () => {
    try {
      setIsCapturing(true);
      setCaptureQuality(null);
      setCapturedImage("");

      toast.info(`Place ${fingerName} on scanner`, { duration: 3000 });
      
      // Capture fingerprint with MFS100 device
      const result = await mfs100Client.captureFingerprint({
        quality: targetQuality,
        timeout: 15,
        retries: 2
      });

      console.log(`📊 Raw capture data for ${fingerName}:`, result);

      if (!result.httpStaus || result.data?.ErrorCode !== "0") {
        throw new Error(result.data?.ErrorDescription || result.err || "Capture failed");
      }
      
      const quality = parseInt(String(result.data.Quality || "0"));
      setCaptureQuality(quality);
      
      // Process the real MFS100 bitmap data for crystal-clear output
      if (result.data.BitmapData && result.data.BitmapData.length > 0) {
        console.log(`🔍 Processing HIGH-QUALITY fingerprint bitmap for ${fingerName}:`, {
          bitmapLength: result.data.BitmapData.length,
          width: result.data.InWidth || "300",
          height: result.data.InHeight || "300",
          quality: quality
        });

        const crystalClearImage = processRealFingerprintBitmap(
          result.data.BitmapData,
          parseInt(String(result.data.InWidth || "300")),
          parseInt(String(result.data.InHeight || "300"))
        );
        
        if (crystalClearImage && crystalClearImage.startsWith('data:image/')) {
          setCapturedImage(crystalClearImage);
          
          // Store both template and enhanced image
          onChange(result.data.IsoTemplate || crystalClearImage);
          onImageChange?.(crystalClearImage);
          onAccepted?.();
          
          toast.success(
            `${fingerName} captured with enhanced clarity! Quality: ${quality}%`, 
            { duration: 3000 }
          );
        } else {
          throw new Error("Failed to process crystal-clear fingerprint bitmap");
        }
      } else {
        throw new Error("No bitmap data received from MFS100 device");
      }

    } catch (error) {
      console.error(`❌ MFS100 capture error for ${fingerName}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      toast.error(`${fingerName}: ${errorMessage}`, { duration: 4000 });
    } finally {
      setIsCapturing(false);
    }
  }, [targetQuality, fingerName, mfs100Client, processRealFingerprintBitmap, onChange, onImageChange, onAccepted]);

  const handleRecapture = useCallback(() => {
    setCapturedImage("");
    setCaptureQuality(null);
    onChange("");
    onImageChange?.("");
    toast.info(`Ready to recapture ${fingerName}`);
  }, [fingerName, onChange, onImageChange]);

  const displayImage = capturedImage || value;
  const hasImage = displayImage && displayImage.startsWith('data:image/');

  const getQualityColor = () => {
    if (captureQuality === null) return "text-gray-600";
    if (captureQuality >= 70) return "text-green-600";
    if (captureQuality >= 60) return "text-blue-600";
    if (captureQuality >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm w-full max-w-[200px] mx-auto">
      {/* Header */}
      <div className="text-center mb-2">
        <h3 className="font-medium text-sm text-gray-800">{fingerName}</h3>
        {captureQuality !== null && (
          <Badge variant={captureQuality >= 60 ? "default" : "secondary"} className="text-xs mt-1">
            Quality: {captureQuality}%
          </Badge>
        )}
      </div>

      {/* Enhanced Fingerprint Display */}
      <div className={`relative w-full h-36 border-2 rounded-lg flex items-center justify-center mb-3 transition-all duration-300 ${
        isCapturing 
          ? 'border-blue-500 border-dashed animate-pulse bg-blue-50' 
          : hasImage
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 bg-gray-50'
      }`}>
        {isCapturing ? (
          <div className="flex flex-col items-center space-y-2 text-blue-600">
            <Fingerprint className="h-6 w-6 animate-pulse" />
            <span className="text-xs font-medium">Scanning...</span>
          </div>
        ) : hasImage ? (
          <div className="relative w-full h-full">
            <img 
              src={displayImage}
              alt={`${fingerName} high-quality fingerprint`}
              className="w-full h-full object-contain rounded"
              style={{ 
                filter: 'contrast(1.2) brightness(1.05)',
                imageRendering: 'crisp-edges'
              }}
              onLoad={() => console.log(`✅ Crystal-clear fingerprint displayed for ${fingerName}`)}
            />
            <div className="absolute -top-1 -right-1">
              <div className="bg-green-500 text-white rounded-full p-0.5">
                <CheckCircle className="h-3 w-3" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-1 text-gray-400">
            <Fingerprint className="h-6 w-6" />
            <span className="text-xs">No Print</span>
          </div>
        )}
      </div>

      {/* Quality Display */}
      {captureQuality !== null && (
        <div className={`text-center text-xs font-medium mb-2 ${getQualityColor()}`}>
          Quality: {captureQuality}%
          <div className="text-xs text-gray-500 mt-1">
            {captureQuality >= 70 ? 'Excellent' : captureQuality >= 60 ? 'Good' : captureQuality >= 50 ? 'Fair' : 'Poor'}
          </div>
        </div>
      )}

      {/* Action Button */}
      <Button
        onClick={hasImage ? handleRecapture : handleCapture}
        disabled={isCapturing || !isConnected}
        className={`w-full text-white text-xs py-1.5 h-8 ${
          isCapturing 
            ? 'bg-blue-500 animate-pulse' 
            : hasImage
              ? 'bg-orange-500 hover:bg-orange-600'
              : isConnected 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-gray-500'
        }`}
        size="sm"
      >
        <Fingerprint className="mr-1 h-3 w-3" />
        {isCapturing 
          ? 'Capturing...' 
          : hasImage
            ? 'Recapture'
            : 'Capture HD'
        }
      </Button>

      {/* Connection Status */}
      {!isConnected && (
        <div className="text-xs text-orange-600 text-center mt-1 flex items-center justify-center">
          <AlertCircle className="h-2.5 w-2.5 mr-1" />
          Device offline
        </div>
      )}
    </div>
  );
}
