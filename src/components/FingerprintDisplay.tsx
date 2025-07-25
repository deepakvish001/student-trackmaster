
import { useState, useEffect, useMemo } from "react";
import { AlertCircle, Check, Fingerprint } from "lucide-react";

interface FingerprintDisplayProps {
  value: string;
  index: number;
  quality?: number | null;
  isCapturing?: boolean;
  showQuality?: boolean;
}

export function FingerprintDisplay({ 
  value, 
  index, 
  quality, 
  isCapturing = false,
  showQuality = true 
}: FingerprintDisplayProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Memoize the fingerprint image processing to prevent repeated calculations
  const fingerprintImageUrl = useMemo(() => {
    if (!value || isCapturing) return null;
    
    console.log(`Processing fingerprint display data for finger ${index + 1} (length: ${value.length})`);
    
    // If it's already a complete data URI (captured image), use it directly
    if (value.startsWith('data:image/')) {
      console.log('Found complete image data URI');
      return value;
    }
    
    // If it's a base64 image string without data URI prefix, add it
    if (value.length > 100 && !value.includes('data:')) {
      // Check for common base64 image headers
      if (value.startsWith('iVBOR') || // PNG
          value.startsWith('/9j/') ||  // JPEG
          value.startsWith('UklGR') || // WebP
          value.startsWith('R0lGOD')) { // GIF
        console.log('Converting base64 image to data URI');
        // Detect format and add appropriate data URI prefix
        let mimeType = 'image/png'; // default
        if (value.startsWith('/9j/')) mimeType = 'image/jpeg';
        else if (value.startsWith('UklGR')) mimeType = 'image/webp';
        else if (value.startsWith('R0lGOD')) mimeType = 'image/gif';
        
        return `data:${mimeType};base64,${value}`;
      }
    }
    
    // If it's a short string that looks like an ISO template, don't process as image
    if (value.length < 1000) {
      console.log('Data appears to be ISO template, not image data');
      return null;
    }
    
    console.log('Data does not appear to be image data, likely ISO template');
    return null;
  }, [value, index, isCapturing]);

  useEffect(() => {
    if (value && !isCapturing && fingerprintImageUrl) {
      setIsLoading(true);
      setImageError(false);
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    }
    if (!value) {
      setImageError(false);
    }
  }, [value, isCapturing, fingerprintImageUrl]);

  const handleImageLoad = () => {
    console.log(`Fingerprint image ${index + 1} loaded successfully`);
    setImageError(false);
    setIsLoading(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error(`Error loading fingerprint image ${index + 1}:`, e);
    setImageError(true);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className={`relative w-40 h-40 border-2 rounded-lg flex items-center justify-center bg-white transition-all duration-300 ${
        isCapturing 
          ? 'border-primary border-dashed animate-pulse shadow-lg' 
          : value
            ? fingerprintImageUrl 
              ? 'border-green-500 shadow-md'
              : 'border-blue-500 shadow-md'
            : 'border-gray-300 hover:border-primary'
      }`}>
        {isCapturing ? (
          <div className="flex flex-col items-center space-y-2 text-primary">
            <Fingerprint className="h-8 w-8 animate-pulse" />
            <span className="text-sm font-medium">Scanning...</span>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        ) : value ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {fingerprintImageUrl ? (
              isLoading ? (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <img 
                  src={fingerprintImageUrl}
                  alt={`Fingerprint ${index + 1}`}
                  className={`max-w-36 max-h-36 object-contain transition-all duration-300 ${
                    imageError ? 'opacity-50' : 'animate-scale-in'
                  } rounded border`}
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                  style={{ 
                    filter: 'contrast(1.1) brightness(1.05)',
                    imageRendering: 'crisp-edges'
                  }}
                />
              )
            ) : (
              // Show template saved indicator for non-image data (ISO templates)
              <div className="flex flex-col items-center space-y-2 text-blue-600">
                <Check className="h-8 w-8" />
                <span className="text-sm font-medium">Template Saved</span>
              </div>
            )}
            
            {showQuality && quality !== undefined && quality !== null && (
              <div className={`absolute bottom-1 right-1 rounded-full p-1 ${
                quality >= 60 ? 'bg-green-500' : 
                quality >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}>
                {quality >= 60 ? (
                  <Check className="h-3 w-3 text-white" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-white" />
                )}
              </div>
            )}

            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded">
                <div className="text-center text-gray-500">
                  <AlertCircle className="h-6 w-6 mx-auto mb-1" />
                  <span className="text-xs">Image Load Error</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 text-gray-400">
            <Fingerprint className="h-8 w-8" />
            <span className="text-sm">No Print</span>
          </div>
        )}
      </div>
      
      <div className="text-center">
        <div className="font-medium text-sm">Finger {index + 1}</div>
        {showQuality && quality !== undefined && quality !== null && (
          <div className={`text-xs mt-1 font-medium ${
            quality >= 60 ? 'text-green-600' : 
            quality >= 40 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            Quality: {quality}%
          </div>
        )}
        {value && !fingerprintImageUrl && !imageError && (
          <div className="text-xs text-blue-600 mt-1">
            Template Saved ✓
          </div>
        )}
      </div>
    </div>
  );
}
