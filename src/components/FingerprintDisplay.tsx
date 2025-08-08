
import { useState, useEffect, useMemo } from "react";
import { AlertCircle, Check, Fingerprint, Image, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FingerprintDisplayProps {
  value: string;
  index: number;
  quality?: number | null;
  isCapturing?: boolean;
  showQuality?: boolean;
  imageData?: string;
  onCapture?: () => void;
  onRecapture?: () => void;
  isConnected?: boolean;
}

export function FingerprintDisplay({ 
  value, 
  index, 
  quality, 
  isCapturing = false,
  showQuality = true,
  imageData,
  onCapture,
  onRecapture,
  isConnected = true
}: FingerprintDisplayProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Simplified and fixed image detection logic
  const fingerprintImageUrl = useMemo(() => {
    if (isCapturing) return null;
    
    // First priority: dedicated imageData prop (processed fingerprint image)
    if (imageData && imageData.length > 1000) {
      console.log(`Using imageData for finger ${index + 1}, length: ${imageData.length}`);
      
      // Check if it's already a data URL
      if (imageData.startsWith('data:image/')) {
        return imageData;
      }
      
      // If it's a very long string, treat it as base64 image data
      if (imageData.length > 50000) {
        return `data:image/png;base64,${imageData}`;
      }
      
      return imageData;
    }
    
    // Second priority: check if value contains image data
    if (value && value.length > 50000) {
      console.log(`Using value as image for finger ${index + 1}, length: ${value.length}`);
      
      if (value.startsWith('data:image/')) {
        return value;
      }
      
      return `data:image/png;base64,${value}`;
    }
    
    return null;
  }, [value, imageData, isCapturing, index]);

  const dataType = useMemo(() => {
    if (fingerprintImageUrl) return 'image';
    if (value && value.length > 100) return 'template';
    return 'none';
  }, [value, fingerprintImageUrl]);

  const hasFingerprint = dataType === 'image' && fingerprintImageUrl;
  const hasTemplateOnly = dataType === 'template' && !fingerprintImageUrl;

  useEffect(() => {
    if (fingerprintImageUrl && !isCapturing) {
      setIsLoading(true);
      setImageError(false);
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
    }
    if (!value && !imageData) {
      setImageError(false);
    }
  }, [value, imageData, isCapturing, fingerprintImageUrl]);

  const handleImageLoad = () => {
    setImageError(false);
    setIsLoading(false);
    console.log(`✅ Fingerprint image loaded successfully for finger ${index + 1}`);
  };

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
    console.error(`❌ Failed to load fingerprint image for finger ${index + 1}`);
  };

  return (
    <div className="bg-white border rounded-lg p-4 w-full max-w-[320px] mx-auto shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-base">Finger {index + 1}</span>
          <div className="flex items-center space-x-1">
            <Wifi className={`h-3 w-3 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        {/* Status Badge */}
        {hasFingerprint && (
          <Badge className="bg-green-500 text-white text-xs px-2 py-1">
            Captured
          </Badge>
        )}
        {hasTemplateOnly && (
          <Badge variant="secondary" className="text-xs px-2 py-1">
            Template Only
          </Badge>
        )}
        {!hasFingerprint && !hasTemplateOnly && !isCapturing && (
          <Badge variant="outline" className="text-xs px-2 py-1">
            Ready
          </Badge>
        )}
        {isCapturing && (
          <Badge className="bg-blue-500 text-white text-xs px-2 py-1 animate-pulse">
            Capturing...
          </Badge>
        )}
      </div>

      {/* Fingerprint Display Area */}
      <div className={`relative w-full h-72 border-2 rounded-lg flex items-center justify-center bg-gray-50 transition-all duration-300 ${
        isCapturing 
          ? 'border-blue-500 border-dashed animate-pulse' 
          : hasFingerprint
            ? 'border-green-500'
            : hasTemplateOnly
              ? 'border-blue-400'
              : 'border-gray-300'
      }`}>
        {isCapturing ? (
          <div className="flex flex-col items-center space-y-2 text-blue-600">
            <Fingerprint className="h-8 w-8 animate-pulse" />
            <span className="text-sm font-medium">Scanning...</span>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        ) : hasFingerprint ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {isLoading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            ) : (
              <div className="relative w-full h-full">
                <img 
                  src={fingerprintImageUrl}
                  alt={`Fingerprint ${index + 1}`}
                  className="w-full h-full object-contain rounded border"
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                  style={{ 
                    filter: 'contrast(1.3) brightness(1.15) saturate(1.1)',
                    imageRendering: 'crisp-edges'
                  }}
                />
                {/* Quality indicator overlay */}
                {showQuality && quality !== undefined && quality !== null && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white rounded px-2 py-1 text-xs">
                    {quality}%
                  </div>
                )}
              </div>
            )}
            
            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
                <div className="text-center text-gray-500">
                  <AlertCircle className="h-6 w-6 mx-auto mb-1" />
                  <span className="text-xs">Image Load Error</span>
                  <div className="text-xs mt-1">Check console for details</div>
                </div>
              </div>
            )}
          </div>
        ) : hasTemplateOnly ? (
          <div className="flex flex-col items-center space-y-2 text-blue-600">
            <div className="relative">
              <Fingerprint className="h-8 w-8" />
              <Check className="h-4 w-4 absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-0.5" />
            </div>
            <span className="text-sm font-medium">Template Only</span>
            <div className="text-xs text-gray-500 text-center">
              No image data available
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 text-gray-400">
            <Fingerprint className="h-8 w-8" />
            <span className="text-sm">No Print</span>
          </div>
        )}
      </div>

      {/* Quality and Status Display */}
      {showQuality && quality !== undefined && quality !== null && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className={`w-3 h-3 rounded-full ${
                quality >= 60 ? 'bg-green-500' : 
                quality >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-xs text-gray-600">Quality:</span>
            </div>
            <span className={`text-sm font-medium ${
              quality >= 60 ? 'text-green-600' : 
              quality >= 40 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {quality}%
            </span>
          </div>
          
          {hasFingerprint && (
            <div className="flex items-center space-x-1 text-green-600">
              <Image className="h-3 w-3" />
              <span className="text-xs">Image ✓</span>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      {onCapture && (
        <div className="mt-4">
          {!hasFingerprint && !hasTemplateOnly ? (
            <Button
              onClick={onCapture}
              disabled={!isConnected || isCapturing}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              size="sm"
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              Capture
            </Button>
          ) : (
            <Button
              onClick={onRecapture}
              variant="outline"
              className="w-full"
              size="sm"
            >
              Recapture
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
