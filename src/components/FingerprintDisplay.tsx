import { useState, useEffect } from "react";
import { AlertCircle, Check, Fingerprint } from "lucide-react";

interface FingerprintDisplayProps {
  value: string;
  index: number;
  quality?: number;
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

  // Convert fingerprint template to displayable image
  const getFingerprintImageUrl = (fingerprintData: string) => {
    if (!fingerprintData) return null;
    
    // If it's already a base64 image, use it directly
    if (fingerprintData.startsWith('data:image/')) {
      return fingerprintData;
    }
    
    // If it's a base64 string without data URI prefix, add it
    if (fingerprintData.length > 100 && !fingerprintData.startsWith('data:')) {
      return `data:image/png;base64,${fingerprintData}`;
    }
    
    // Fallback to placeholder image
    return "/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png";
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
          ? 'border-primary border-dashed animate-pulse' 
          : value 
            ? 'border-green-500' 
            : 'border-gray-300 hover:border-primary'
      }`}>
        {isCapturing ? (
          <div className="flex flex-col items-center space-y-2 text-primary">
            <Fingerprint className="h-8 w-8 animate-pulse" />
            <span className="text-sm font-medium">Capturing...</span>
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
                className={`w-32 h-32 object-contain m-auto transition-all duration-300 ${
                  imageError ? 'opacity-50' : 'animate-scale-in'
                }`}
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
          <div className={`text-xs mt-1 ${
            quality >= 60 ? 'text-green-500' : 
            quality >= 40 ? 'text-yellow-500' : 'text-red-500'
          }`}>
            Quality: {quality}
          </div>
        )}
      </div>
    </div>
  );
}