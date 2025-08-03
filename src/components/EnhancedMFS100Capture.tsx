
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

  // Process raw MFS100 bitmap to show actual fingerprint ridges
  const processFingerprintBitmap = useCallback((bitmapData: string, width?: number | string, height?: number | string): string => {
    try {
      if (!bitmapData || bitmapData.length === 0) {
        console.warn('No bitmap data provided for processing');
        return "";
      }

      // Parse dimensions with defaults for MFS100
      let actualWidth = 300;
      let actualHeight = 300;

      if (typeof width === 'number' && width > 0) {
        actualWidth = Math.floor(width);
      } else if (typeof width === 'string') {
        const parsed = parseFloat(width);
        if (!isNaN(parsed) && parsed > 0) {
          actualWidth = Math.floor(parsed);
        }
      }

      if (typeof height === 'number' && height > 0) {
        actualHeight = Math.floor(height);
      } else if (typeof height === 'string') {
        const parsed = parseFloat(height);
        if (!isNaN(parsed) && parsed > 0) {
          actualHeight = Math.floor(parsed);
        }
      }

      // Convert base64 bitmap data to binary
      const binaryData = atob(bitmapData);
      const totalPixels = binaryData.length;
      
      console.log(`🔍 Processing real fingerprint bitmap for ${fingerName}:`, {
        bitmapDataLength: totalPixels,
        proposedDimensions: `${actualWidth}x${actualHeight}`
      });

      // Auto-detect correct dimensions from data length
      const possibleSize = Math.floor(Math.sqrt(totalPixels));
      if (possibleSize * possibleSize === totalPixels) {
        actualWidth = actualHeight = possibleSize;
        console.log(`📐 Auto-detected square dimensions: ${possibleSize}x${possibleSize}`);
      } else {
        // Try common MFS100 dimensions
        const commonSizes = [[256, 256], [300, 300], [320, 240], [400, 300]];
        
        for (const [w, h] of commonSizes) {
          if (w * h <= totalPixels * 1.1 && w * h >= totalPixels * 0.9) {
            actualWidth = w;
            actualHeight = h;
            console.log(`📐 Using standard MFS100 dimensions: ${w}x${h}`);
            break;
          }
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = actualWidth;
      canvas.height = actualHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      const imageData = ctx.createImageData(actualWidth, actualHeight);
      const data = imageData.data;
      
      // Process pixels to show REAL fingerprint ridges (minimal processing)
      const maxPixels = Math.min(totalPixels, actualWidth * actualHeight);
      
      for (let i = 0; i < maxPixels; i++) {
        // Get raw 8-bit grayscale value from MFS100
        const rawPixelValue = binaryData.charCodeAt(i);
        
        // MFS100 typically provides inverted data - ridges are dark (low values)
        // Simply invert to show ridges as dark lines on light background
        const finalPixelValue = 255 - rawPixelValue;
        
        const pixelIndex = i * 4;
        if (pixelIndex + 3 < data.length) {
          data[pixelIndex] = finalPixelValue;     // Red
          data[pixelIndex + 1] = finalPixelValue; // Green  
          data[pixelIndex + 2] = finalPixelValue; // Blue
          data[pixelIndex + 3] = 255;             // Alpha
        }
      }
      
      // Fill any remaining pixels with white
      for (let i = maxPixels * 4; i < data.length; i += 4) {
        data[i] = 255;     // White background
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Generate high-quality PNG
      const pngResult = canvas.toDataURL('image/png', 1.0);
      
      console.log(`✅ Real fingerprint PNG generated for ${fingerName}:`, {
        resultLength: pngResult.length,
        dimensions: `${actualWidth}x${actualHeight}`,
        format: 'PNG - Real Fingerprint Data'
      });
      
      return pngResult;
      
    } catch (error) {
      console.error(`❌ Real fingerprint processing error for ${fingerName}:`, error);
      return "";
    }
  }, [fingerName]);

  const handleCapture = useCallback(async () => {
    try {
      setIsCapturing(true);
      setCaptureQuality(null);
      setCapturedImage("");

      toast.info(`Place ${fingerName} on MFS100 scanner`, { duration: 4000 });
      
      const result = await mfs100Client.captureFingerprint({
        quality: targetQuality,
        timeout: 15,
        retries: 3
      });

      if (!result.httpStaus || result.data?.ErrorCode !== "0") {
        throw new Error(result.data?.ErrorDescription || result.err || "Capture failed");
      }
      
      const quality = result.data.Quality || 0;
      setCaptureQuality(quality);
      
      let realFingerprintImage = "";

      // Process the raw MFS100 bitmap to get real fingerprint
      if (result.data.BitmapData) {
        console.log(`📊 Raw MFS100 data for ${fingerName}:`, {
          bitmapLength: result.data.BitmapData.length,
          width: result.data.InWidth,
          height: result.data.InHeight,
          quality: quality
        });

        realFingerprintImage = processFingerprintBitmap(
          result.data.BitmapData,
          result.data.InWidth,
          result.data.InHeight
        );
        
        if (realFingerprintImage) {
          setCapturedImage(realFingerprintImage);
          
          // Store both template and image
          onChange(result.data.IsoTemplate || realFingerprintImage);
          onImageChange?.(realFingerprintImage);
          onAccepted?.();
          
          toast.success(
            `${fingerName} captured! Quality: ${quality}%`, 
            {
              description: "Real fingerprint image saved",
              duration: 4000
            }
          );
        } else {
          throw new Error("Failed to process real fingerprint data");
        }
      } else {
        throw new Error("No fingerprint data received from MFS100");
      }

    } catch (error) {
      console.error(`❌ MFS100 capture error for ${fingerName}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsCapturing(false);
    }
  }, [targetQuality, fingerName, mfs100Client, processFingerprintBitmap, onChange, onImageChange, onAccepted]);

  const handleRecapture = useCallback(() => {
    setCapturedImage("");
    setCaptureQuality(null);
    onChange("");
    onImageChange?.("");
    toast.info(`Ready to recapture ${fingerName}`);
  }, [fingerName, onChange, onImageChange]);

  const displayImage = capturedImage || value;
  const hasImage = displayImage && displayImage.startsWith('data:image/');

  const getQualityStatus = () => {
    if (captureQuality === null) return null;
    if (captureQuality >= 70) return "Excellent";
    if (captureQuality >= 60) return "Good";
    if (captureQuality >= 50) return "Fair";
    return "Poor - Recapture recommended";
  };

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

      {/* Fingerprint Display Area */}
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
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        ) : hasImage ? (
          <div className="relative w-full h-full">
            <img 
              src={displayImage}
              alt={`${fingerName} real fingerprint`}
              className="w-full h-full object-contain rounded"
              style={{ 
                imageRendering: 'pixelated'
              }}
              onLoad={() => console.log(`✅ Real fingerprint displayed for ${fingerName}`)}
            />
            {hasImage && (
              <div className="absolute -top-1 -right-1">
                <div className="bg-green-500 text-white rounded-full p-0.5">
                  <CheckCircle className="h-3 w-3" />
                </div>
              </div>
            )}
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
            {getQualityStatus()}
          </div>
        </div>
      )}

      {/* Action Button */}
      <Button
        onClick={hasImage ? handleRecapture : handleCapture}
        disabled={isCapturing}
        className={`w-full text-white transition-all duration-300 text-xs py-1.5 h-8 ${
          isCapturing 
            ? 'bg-blue-500 hover:bg-blue-600 animate-pulse' 
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
            : 'Capture PNG'
        }
      </Button>

      {/* Connection Status */}
      {!isConnected && !isCapturing && (
        <div className="text-xs text-orange-600 text-center mt-1 flex items-center justify-center">
          <AlertCircle className="h-2.5 w-2.5 mr-1" />
          Device offline
        </div>
      )}
    </div>
  );
}
