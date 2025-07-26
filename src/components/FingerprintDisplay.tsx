
import { useState, useEffect, useMemo } from "react";
import { AlertCircle, Check, Fingerprint, Image } from "lucide-react";

interface FingerprintDisplayProps {
  value: string;
  index: number;
  quality?: number | null;
  isCapturing?: boolean;
  showQuality?: boolean;
  imageData?: string; // Separate prop for image data
}

export function FingerprintDisplay({ 
  value, 
  index, 
  quality, 
  isCapturing = false,
  showQuality = true,
  imageData 
}: FingerprintDisplayProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Prioritize imageData prop, then check if value contains image data
  const fingerprintImageUrl = useMemo(() => {
    if (!value && !imageData) return null;
    if (isCapturing) return null;
    
    // First priority: dedicated imageData prop
    if (imageData) {
      console.log(`Using dedicated image data for finger ${index + 1}`);
      if (imageData.startsWith('data:image/')) {
        return imageData;
      }
      // Convert base64 to data URI if needed
      return `data:image/png;base64,${imageData}`;
    }
    
    // Second priority: check if value contains image data
    if (value) {
      if (value.startsWith('data:image/')) {
        console.log(`Found complete image data URI for finger ${index + 1}`);
        return value;
      }
      
      // Check for base64 image patterns
      if (value.length > 500) {
        const imageSignatures = [
          { sig: 'iVBOR', mime: 'image/png' },
          { sig: '/9j/', mime: 'image/jpeg' },
          { sig: 'UklGR', mime: 'image/webp' },
          { sig: 'R0lGOD', mime: 'image/gif' }
        ];
        
        for (const { sig, mime } of imageSignatures) {
          if (value.includes(sig)) {
            console.log(`Found ${mime} signature for finger ${index + 1}`);
            return `data:${mime};base64,${value}`;
          }
        }
      }
    }
    
    return null;
  }, [value, imageData, index, isCapturing]);

  // Determine data type
  const dataType = useMemo(() => {
    if (!value && !imageData) return 'none';
    if (fingerprintImageUrl) return 'image';
    return 'template';
  }, [value, imageData, fingerprintImageUrl]);

  useEffect(() => {
    if (fingerprintImageUrl && !isCapturing) {
      setIsLoading(true);
      setImageError(false);
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    }
    if (!value && !imageData) {
      setImageError(false);
    }
  }, [value, imageData, isCapturing, fingerprintImageUrl]);

  const handleImageLoad = () => {
    console.log(`✅ Fingerprint image ${index + 1} loaded successfully`);
    setImageError(false);
    setIsLoading(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error(`❌ Error loading fingerprint image ${index + 1}:`, e);
    setImageError(true);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className={`relative w-40 h-40 border-2 rounded-lg flex items-center justify-center bg-white transition-all duration-300 ${
        isCapturing 
          ? 'border-primary border-dashed animate-pulse shadow-lg' 
          : dataType === 'image'
            ? 'border-green-500 shadow-md'
            : dataType === 'template'
              ? 'border-blue-500 shadow-md'
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
        ) : (value || imageData) ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {dataType === 'image' ? (
              isLoading ? (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <img 
                  src={fingerprintImageUrl!}
                  alt={`Fingerprint ${index + 1}`}
                  className={`max-w-36 max-h-36 object-contain transition-all duration-300 ${
                    imageError ? 'opacity-50' : ''
                  } rounded border`}
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                  style={{ 
                    filter: 'contrast(1.2) brightness(1.1)',
                    imageRendering: 'crisp-edges'
                  }}
                />
              )
            ) : (
              <div className="flex flex-col items-center space-y-2 text-blue-600">
                <div className="relative">
                  <Fingerprint className="h-8 w-8" />
                  <Check className="h-4 w-4 absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-0.5" />
                </div>
                <span className="text-sm font-medium">Template Only</span>
                <div className="text-xs text-gray-500 text-center px-2">
                  No image captured
                  <br />
                  (Template data only)
                </div>
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

            {imageError && dataType === 'image' && (
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
        {(value || imageData) && (
          <div className="text-xs mt-1 flex items-center justify-center space-x-1">
            {dataType === 'image' ? (
              <div className="text-green-600 flex items-center space-x-1 font-medium">
                <Image className="h-3 w-3" />
                <span>Image ✓</span>
              </div>
            ) : (
              <div className="text-blue-600 flex items-center space-x-1">
                <Fingerprint className="h-3 w-3" />
                <span>Template ✓</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
