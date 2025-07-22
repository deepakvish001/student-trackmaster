
import { useState, useEffect } from "react";
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

  // Get fingerprint image URL for display
  const getFingerprintImageUrl = (fingerprintData: string) => {
    if (!fingerprintData) return null;
    
    // If it's already a complete data URI (base64 image), use it directly
    if (fingerprintData.startsWith('data:image/')) {
      return fingerprintData;
    }
    
    // If it's a base64 string without data URI prefix, add it
    if (fingerprintData.length > 100 && !fingerprintData.includes('data:')) {
      // Detect if it's likely an image (starts with common image headers in base64)
      if (fingerprintData.startsWith('iVBOR') || fingerprintData.startsWith('/9j/') || fingerprintData.startsWith('UklGR')) {
        return `data:image/png;base64,${fingerprintData}`;
      }
    }
    
    // Return null for non-image data (like ISO templates)
    return null;
  };

  const imageUrl = getFingerprintImageUrl(value);

  useEffect(() => {
    if (value && !isCapturing) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [value, isCapturing]);

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className={`relative w-40 h-40 border-2 rounded-lg flex items-center justify-center bg-white transition-all duration-300 ${
        isCapturing 
          ? 'border-primary border-dashed animate-pulse shadow-lg' 
          : value && imageUrl
            ? 'border-green-500 shadow-md' 
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
        ) : value && imageUrl ? (
          <div className="relative w-full h-full">
            {isLoading ? (
              <div className="flex items-center justify-center w-full h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <img 
                src={imageUrl}
                alt={`Fingerprint ${index + 1}`}
                className={`w-36 h-36 object-contain m-auto transition-all duration-300 ${
                  imageError ? 'opacity-50' : 'animate-scale-in'
                } rounded`}
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
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
        {value && !imageUrl && (
          <div className="text-xs text-blue-600 mt-1">
            Template Saved ✓
          </div>
        )}
      </div>
    </div>
  );
}
