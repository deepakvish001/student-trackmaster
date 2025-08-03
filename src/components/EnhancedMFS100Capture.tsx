
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { FingerprintCapturePreview } from "./FingerprintCapturePreview";
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
  targetQuality = 60,
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

  // Enhanced bitmap processing to generate proper PNG images
  const processFingerprintBitmap = useCallback((bitmapData: string, width?: number | string, height?: number | string): string => {
    try {
      if (!bitmapData || bitmapData.length === 0) {
        console.warn('No bitmap data provided for processing');
        return "";
      }

      // Parse dimensions with robust validation
      let validWidth = 256;
      let validHeight = 256;

      // Parse width
      if (typeof width === 'number' && width > 0 && Number.isFinite(width)) {
        validWidth = Math.floor(width);
      } else if (typeof width === 'string') {
        const parsed = parseFloat(width);
        if (!isNaN(parsed) && parsed > 0 && Number.isFinite(parsed)) {
          validWidth = Math.floor(parsed);
        }
      }

      // Parse height
      if (typeof height === 'number' && height > 0 && Number.isFinite(height)) {
        validHeight = Math.floor(height);
      } else if (typeof height === 'string') {
        const parsed = parseFloat(height);
        if (!isNaN(parsed) && parsed > 0 && Number.isFinite(parsed)) {
          validHeight = Math.floor(parsed);
        }
      }

      // Convert base64 bitmap data
      const binaryData = atob(bitmapData);
      const totalBytes = binaryData.length;
      
      console.log(`🔍 Processing fingerprint bitmap for ${fingerName}:`, {
        originalDataLength: binaryData.length,
        proposedDimensions: `${validWidth}x${validHeight}`,
        expectedPixels: validWidth * validHeight
      });

      // Smart dimension calculation from data if invalid
      if (validWidth <= 0 || validHeight <= 0 || validWidth * validHeight > totalBytes * 2) {
        const possibleSize = Math.floor(Math.sqrt(totalBytes));
        
        if (possibleSize >= 200 && possibleSize <= 500) {
          validWidth = validHeight = possibleSize;
          console.log(`📐 Using calculated square dimensions: ${possibleSize}x${possibleSize}`);
        } else {
          // Try common MFS100 device sizes
          const commonSizes = [
            [256, 256], [300, 300], [320, 240], [400, 300], [256, 360]
          ];
          
          for (const [w, h] of commonSizes) {
            if (w * h <= totalBytes && totalBytes >= (w * h * 0.8)) {
              validWidth = w;
              validHeight = h;
              console.log(`📐 Using fallback dimensions for ${fingerName}: ${w}x${h} (bitmap length: ${totalBytes})`);
              break;
            }
          }
        }
      }

      // Final validation
      if (validWidth <= 0 || validHeight <= 0 || !Number.isInteger(validWidth) || !Number.isInteger(validHeight)) {
        console.error('❌ Invalid final dimensions:', { validWidth, validHeight });
        return "";
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
      
      // Process pixels to show actual fingerprint patterns
      const maxPixels = Math.min(totalBytes, validWidth * validHeight);
      
      for (let i = 0; i < maxPixels; i++) {
        // Get raw pixel value from MFS100 device
        let pixelValue = binaryData.charCodeAt(i);
        
        // MFS100 devices typically return inverted grayscale values
        // Invert to show ridges as dark lines on light background
        pixelValue = 255 - pixelValue;
        
        // Enhanced contrast and sharpening for better fingerprint visibility
        // Apply gamma correction for better ridge definition
        let normalized = pixelValue / 255;
        normalized = Math.pow(normalized, 0.7); // Gamma correction
        pixelValue = Math.floor(normalized * 255);
        
        // Additional contrast enhancement
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.5 - 30));
        
        const pixelIndex = i * 4;
        if (pixelIndex + 3 < data.length) {
          data[pixelIndex] = pixelValue;     // Red
          data[pixelIndex + 1] = pixelValue; // Green
          data[pixelIndex + 2] = pixelValue; // Blue
          data[pixelIndex + 3] = 255;        // Alpha (fully opaque)
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to high-quality PNG with maximum quality
      const result = canvas.toDataURL('image/png', 1.0);
      
      console.log(`✅ Fingerprint PNG image generated for ${fingerName}:`, {
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

  // Function to download the processed image
  const downloadFingerprintImage = useCallback((imageData: string, filename?: string) => {
    if (!imageData) return;
    
    const link = document.createElement('a');
    link.href = imageData;
    link.download = filename || `${fingerName.replace(/\s+/g, '_')}_fingerprint.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${fingerName} image downloaded as PNG`);
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

      // Process the raw bitmap data to generate PNG image
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
          showPreview({
            template: result.data.IsoTemplate || '',
            imageData: processedImage,
            quality: quality
          });

          toast.success(
            `${fingerName} captured successfully! Quality: ${quality}%`, 
            {
              description: "Click to download PNG image",
              action: {
                label: "Download PNG",
                onClick: () => downloadFingerprintImage(processedImage)
              }
            }
          );
          setCaptureProgress(prev => ({ ...prev, progress: 100 }));
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
  }, [targetQuality, fingerName, startCapture, showPreview, resetCapture, mfs100Client, processFingerprintBitmap, downloadFingerprintImage]);

  const handleAcceptCapture = useCallback(() => {
    if (!captureData) return;

    // Save both the template and the processed PNG image
    onChange(captureData.template || captureData.imageData);
    onImageChange?.(captureData.imageData);
    
    acceptCapture();
    onAccepted?.();
    
    toast.success(`${fingerName} PNG image accepted and saved!`, {
      description: "High-quality fingerprint image stored",
      action: {
        label: "Download",
        onClick: () => downloadFingerprintImage(captureData.imageData)
      }
    });
  }, [captureData, onChange, onImageChange, acceptCapture, onAccepted, fingerName, downloadFingerprintImage]);

  const handleRecapture = useCallback(() => {
    resetCapture();
    setCaptureQuality(null);
    toast.info(`Ready to recapture ${fingerName}`);
  }, [resetCapture, fingerName]);

  // Show preview if in previewing state
  if (captureState === 'previewing' && captureData) {
    return (
      <FingerprintCapturePreview
        fingerIndex={index}
        imageData={captureData.imageData}
        quality={captureData.quality}
        onAccept={handleAcceptCapture}
        onRecapture={handleRecapture}
        fingerName={fingerName}
      />
    );
  }

  // Regular capture interface
  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm w-full max-w-[180px] mx-auto">
      {/* Header */}
      <div className="text-center mb-2">
        <h3 className="font-medium text-sm text-gray-800">{fingerName}</h3>
        {captureQuality && (
          <Badge variant={captureQuality >= 60 ? "default" : "secondary"} className="text-xs mt-1">
            Quality: {captureQuality}%
          </Badge>
        )}
      </div>

      {/* Fingerprint Display Area */}
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
              alt={`${fingerName} fingerprint PNG`}
              className="w-full h-full object-contain rounded"
              style={{ 
                filter: 'contrast(1.2) brightness(1.05)',
                imageRendering: 'crisp-edges'
              }}
              onLoad={() => console.log(`✅ Fingerprint PNG loaded for ${fingerName}`)}
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

      {/* Capture Button */}
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
            : 'Capture PNG'
        }
      </Button>

      {/* Connection Warning */}
      {!isConnected && captureState !== 'capturing' && (
        <div className="text-xs text-orange-600 text-center mt-1 flex items-center justify-center">
          <AlertCircle className="h-2.5 w-2.5 mr-1" />
          Device offline
        </div>
      )}
    </div>
  );
}
