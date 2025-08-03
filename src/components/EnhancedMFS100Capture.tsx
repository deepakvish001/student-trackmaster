
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

  // Process MFS100 bitmap data to actual fingerprint PNG image
  const processFingerprintBitmap = useCallback((bitmapData: string, width?: number | string, height?: number | string): string => {
    try {
      if (!bitmapData || bitmapData.length === 0) {
        console.warn('No bitmap data provided for processing');
        return "";
      }

      // Parse dimensions with validation
      let validWidth = 300;
      let validHeight = 300;

      if (typeof width === 'number' && width > 0) {
        validWidth = Math.floor(width);
      } else if (typeof width === 'string') {
        const parsed = parseFloat(width);
        if (!isNaN(parsed) && parsed > 0) {
          validWidth = Math.floor(parsed);
        }
      }

      if (typeof height === 'number' && height > 0) {
        validHeight = Math.floor(height);
      } else if (typeof height === 'string') {
        const parsed = parseFloat(height);
        if (!isNaN(parsed) && parsed > 0) {
          validHeight = Math.floor(parsed);
        }
      }

      // Convert base64 bitmap data to binary
      const binaryData = atob(bitmapData);
      const totalBytes = binaryData.length;
      
      console.log(`🔍 Processing fingerprint bitmap for ${fingerName}:`, {
        originalDataLength: totalBytes,
        proposedDimensions: `${validWidth}x${validHeight}`,
        expectedPixels: validWidth * validHeight
      });

      // Auto-calculate dimensions if they seem wrong
      if (validWidth * validHeight > totalBytes * 2 || validWidth <= 0 || validHeight <= 0) {
        // Try to calculate square dimensions from data length
        const possibleSize = Math.floor(Math.sqrt(totalBytes));
        
        if (possibleSize >= 200 && possibleSize <= 500) {
          validWidth = validHeight = possibleSize;
          console.log(`📐 Using calculated square dimensions: ${possibleSize}x${possibleSize}`);
        } else {
          // Use common MFS100 sizes as fallback
          const commonSizes = [[300, 300], [256, 256], [320, 240], [400, 300]];
          
          for (const [w, h] of commonSizes) {
            if (w * h <= totalBytes && totalBytes >= (w * h * 0.5)) {
              validWidth = w;
              validHeight = h;
              console.log(`📐 Using fallback dimensions: ${w}x${h}`);
              break;
            }
          }
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = validWidth;
      canvas.height = validHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      const imageData = ctx.createImageData(validWidth, validHeight);
      const data = imageData.data;
      
      // Process pixels to show actual fingerprint ridges
      const maxPixels = Math.min(totalBytes, validWidth * validHeight);
      
      for (let i = 0; i < maxPixels; i++) {
        // Get raw pixel value from MFS100 device (8-bit grayscale)
        let pixelValue = binaryData.charCodeAt(i);
        
        // MFS100 devices typically return inverted grayscale values
        // Invert to show ridges as dark lines on light background
        pixelValue = 255 - pixelValue;
        
        // Apply contrast enhancement for better ridge visibility
        let normalized = pixelValue / 255;
        
        // Apply gamma correction for better ridge definition
        normalized = Math.pow(normalized, 0.8);
        
        // Enhance contrast
        if (normalized > 0.5) {
          normalized = Math.min(1, normalized * 1.4);
        } else {
          normalized = Math.max(0, normalized * 0.6);
        }
        
        pixelValue = Math.floor(normalized * 255);
        
        const pixelIndex = i * 4;
        if (pixelIndex + 3 < data.length) {
          data[pixelIndex] = pixelValue;     // Red
          data[pixelIndex + 1] = pixelValue; // Green
          data[pixelIndex + 2] = pixelValue; // Blue
          data[pixelIndex + 3] = 255;        // Alpha (fully opaque)
        }
      }
      
      // Fill remaining pixels with white background
      for (let i = maxPixels * 4; i < data.length; i += 4) {
        data[i] = 255;     // White
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to high-quality PNG
      const result = canvas.toDataURL('image/png', 1.0);
      
      console.log(`✅ Fingerprint PNG generated for ${fingerName}:`, {
        resultLength: result.length,
        finalDimensions: `${validWidth}x${validHeight}`,
        format: 'PNG'
      });
      
      return result;
      
    } catch (error) {
      console.error(`❌ Fingerprint bitmap processing error for ${fingerName}:`, error);
      return "";
    }
  }, [fingerName]);

  const handleCapture = useCallback(async () => {
    try {
      setIsCapturing(true);
      setCaptureQuality(null);
      setCapturedImage("");

      toast.info(`Place ${fingerName} on scanner`, { duration: 4000 });
      
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
      
      let processedImage = "";

      // Process the raw bitmap data to generate high-quality PNG
      if (result.data.BitmapData) {
        console.log(`📊 Raw capture data for ${fingerName}:`, {
          bitmapLength: result.data.BitmapData.length,
          rawWidth: result.data.InWidth,
          rawHeight: result.data.InHeight,
          quality: quality
        });

        processedImage = processFingerprintBitmap(
          result.data.BitmapData,
          result.data.InWidth,
          result.data.InHeight
        );
        
        if (processedImage) {
          setCapturedImage(processedImage);
          
          // Save the PNG image and template
          onChange(result.data.IsoTemplate || processedImage);
          onImageChange?.(processedImage);
          onAccepted?.();
          
          toast.success(
            `${fingerName} captured! Quality: ${quality}%`, 
            {
              description: "High-quality PNG image saved",
              duration: 4000
            }
          );
        } else {
          throw new Error("Failed to process fingerprint image - could not generate PNG");
        }
      } else {
        throw new Error("No fingerprint bitmap data received from device");
      }

    } catch (error) {
      console.error(`❌ Capture error for ${fingerName}:`, error);
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
              alt={`${fingerName} fingerprint`}
              className="w-full h-full object-contain rounded"
              style={{ 
                filter: 'contrast(1.1) brightness(1.05)',
                imageRendering: 'crisp-edges'
              }}
              onLoad={() => console.log(`✅ Fingerprint PNG displayed for ${fingerName}`)}
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
        <div className={`text-center text-xs font-medium mb-2 ${
          captureQuality >= 70 ? 'text-green-600' : 
          captureQuality >= 50 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          Quality: {captureQuality}%
          <div className="text-xs text-gray-500 mt-1">
            {captureQuality >= 70 ? 'Excellent' : 
             captureQuality >= 50 ? 'Good' : 'Consider Recapture'}
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
