
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

  // Correct MFS100 bitmap processing for authentic fingerprint images
  const processAuthenticFingerprintBitmap = useCallback((bitmapData: string, width: number = 300, height: number = 300): string => {
    try {
      console.log(`🔍 Processing AUTHENTIC MFS100 bitmap for ${fingerName}:`, {
        bitmapLength: bitmapData.length,
        dimensions: `${width}x${height}`,
        firstBytes: bitmapData.substring(0, 50)
      });

      // Convert base64 to raw binary data
      const binaryStr = atob(bitmapData);
      const binaryArray = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        binaryArray[i] = binaryStr.charCodeAt(i);
      }

      console.log(`📊 Raw MFS100 fingerprint data: ${binaryArray.length} bytes`);

      // Determine actual dimensions from MFS100 device
      let actualWidth = width;
      let actualHeight = height;

      // MFS100 standard resolutions - check against data size
      const mfs100Resolutions = [
        [336, 336], // Most common MFS100 resolution
        [400, 300], // Alternative MFS100 resolution  
        [320, 240], // Fallback resolution
        [256, 256], // Square resolution
        [300, 300]  // Default resolution
      ];
      
      // Find matching resolution based on data size
      for (const [w, h] of mfs100Resolutions) {
        const expectedSize = w * h;
        if (Math.abs(binaryArray.length - expectedSize) < expectedSize * 0.1) {
          actualWidth = w;
          actualHeight = h;
          console.log(`📐 Matched MFS100 resolution: ${w}x${h} for ${binaryArray.length} bytes`);
          break;
        }
      }

      // Create high-resolution canvas for fingerprint processing
      const canvas = document.createElement('canvas');
      canvas.width = actualWidth;
      canvas.height = actualHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context for fingerprint processing');
      }

      // Create ImageData for pixel manipulation
      const imageData = ctx.createImageData(actualWidth, actualHeight);
      const pixels = imageData.data;
      
      // Process each pixel for authentic fingerprint rendering
      const totalPixels = actualWidth * actualHeight;
      const availablePixels = Math.min(binaryArray.length, totalPixels);
      
      console.log(`🔍 Processing ${availablePixels} pixels for authentic fingerprint`);
      
      for (let i = 0; i < availablePixels; i++) {
        // Get raw pixel value from MFS100 device
        let rawPixel = binaryArray[i];
        
        // MFS100 bitmap interpretation:
        // Lower values typically represent ridges (fingerprint lines)
        // Higher values typically represent valleys (spaces between ridges)
        
        let processedPixel;
        
        // Enhanced processing for authentic fingerprint appearance
        if (rawPixel < 80) {
          // Very dark ridges - these are the fingerprint lines
          processedPixel = Math.max(0, rawPixel - 30); // Make darker for clear ridges
        } else if (rawPixel < 150) {
          // Ridge edges and transitions
          processedPixel = rawPixel; // Keep natural gradient
        } else if (rawPixel < 200) {
          // Valley areas - spaces between ridges
          processedPixel = Math.min(255, rawPixel + 30); // Brighten valleys
        } else {
          // Background/valley areas
          processedPixel = Math.min(255, rawPixel + 50); // Bright background
        }
        
        // Apply contrast enhancement for sharper ridges
        if (processedPixel < 128) {
          processedPixel = Math.max(0, Math.floor(processedPixel * 0.7)); // Darken ridges more
        } else {
          processedPixel = Math.min(255, Math.floor(processedPixel * 1.2)); // Brighten valleys more
        }
        
        // Set RGBA values for this pixel
        const pixelIndex = i * 4;
        if (pixelIndex + 3 < pixels.length) {
          pixels[pixelIndex] = processedPixel;     // Red
          pixels[pixelIndex + 1] = processedPixel; // Green  
          pixels[pixelIndex + 2] = processedPixel; // Blue
          pixels[pixelIndex + 3] = 255;            // Alpha (fully opaque)
        }
      }
      
      // Fill any remaining pixels with white background
      for (let i = availablePixels * 4; i < pixels.length; i += 4) {
        pixels[i] = 255;     // White
        pixels[i + 1] = 255;
        pixels[i + 2] = 255;
        pixels[i + 3] = 255;
      }
      
      // Apply processed image data to canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Apply additional enhancement filters for authentic appearance
      const enhancedCanvas = document.createElement('canvas');
      enhancedCanvas.width = actualWidth;
      enhancedCanvas.height = actualHeight;
      const enhancedCtx = enhancedCanvas.getContext('2d');
      
      if (enhancedCtx) {
        // Apply sharpening and contrast enhancement
        enhancedCtx.filter = 'contrast(1.4) brightness(1.05) saturate(0)';
        enhancedCtx.drawImage(canvas, 0, 0);
        
        // Convert to high-quality PNG
        const authenticPng = enhancedCanvas.toDataURL('image/png', 1.0);
        
        console.log(`✅ AUTHENTIC fingerprint PNG generated for ${fingerName}:`, {
          resultLength: authenticPng.length,
          finalDimensions: `${actualWidth}x${actualHeight}`,
          processing: 'Authentic MFS100 bitmap processing'
        });
        
        return authenticPng;
      }
      
      // Fallback to basic processing
      const result = canvas.toDataURL('image/png', 1.0);
      console.log(`✅ Basic fingerprint PNG generated for ${fingerName}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Authentic fingerprint processing error for ${fingerName}:`, error);
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

      console.log(`📊 Raw MFS100 capture data for ${fingerName}:`, result);

      if (!result.httpStaus || result.data?.ErrorCode !== "0") {
        throw new Error(result.data?.ErrorDescription || result.err || "Capture failed");
      }
      
      const quality = parseInt(String(result.data.Quality || "0"));
      setCaptureQuality(quality);
      
      // Process the authentic MFS100 bitmap data
      if (result.data.BitmapData && result.data.BitmapData.length > 0) {
        console.log(`🔍 Processing AUTHENTIC fingerprint bitmap for ${fingerName}:`, {
          bitmapLength: result.data.BitmapData.length,
          width: String(result.data.InWidth || "300"),
          height: String(result.data.InHeight || "300"),
          quality: quality
        });

        const authenticImage = processAuthenticFingerprintBitmap(
          result.data.BitmapData,
          parseInt(String(result.data.InWidth || "300")),
          parseInt(String(result.data.InHeight || "300"))
        );
        
        if (authenticImage && authenticImage.startsWith('data:image/')) {
          setCapturedImage(authenticImage);
          
          // Store both template and authentic image
          onChange(result.data.IsoTemplate || authenticImage);
          onImageChange?.(authenticImage);
          onAccepted?.();
          
          toast.success(
            `${fingerName} captured authentically! Quality: ${quality}%`, 
            { duration: 3000 }
          );
        } else {
          throw new Error("Failed to process authentic fingerprint bitmap");
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
  }, [targetQuality, fingerName, mfs100Client, processAuthenticFingerprintBitmap, onChange, onImageChange, onAccepted]);

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

      {/* Authentic Fingerprint Display */}
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
              alt={`${fingerName} authentic fingerprint`}
              className="w-full h-full object-contain rounded"
              style={{ 
                filter: 'contrast(1.1) brightness(1.02)',
                imageRendering: 'crisp-edges'
              }}
              onLoad={() => console.log(`✅ Authentic fingerprint displayed for ${fingerName}`)}
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
