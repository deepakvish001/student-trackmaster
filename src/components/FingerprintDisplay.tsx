
import { useState, useEffect, useMemo } from "react";
import { AlertCircle, Check, Fingerprint, Image } from "lucide-react";

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

  // Enhanced fingerprint image processing with better detection
  const fingerprintImageUrl = useMemo(() => {
    if (!value || isCapturing) return null;
    
    console.log(`Processing fingerprint display data for finger ${index + 1}:`, {
      dataLength: value.length,
      dataPreview: value.substring(0, 100),
      startsWithDataUri: value.startsWith('data:'),
      containsImageSignature: value.includes('iVBOR') || value.includes('/9j/') || value.includes('UklGR')
    });
    
    // If it's already a complete data URI (captured image), use it directly
    if (value.startsWith('data:image/')) {
      console.log('✅ Found complete image data URI - displaying real fingerprint image');
      return value;
    }
    
    // Check for base64 image patterns more thoroughly
    if (value.length > 500) { // Reduced threshold for better detection
      // Look for common base64 image signatures at any position in the string
      const imageSignatures = [
        { sig: 'iVBOR', mime: 'image/png' },    // PNG
        { sig: '/9j/', mime: 'image/jpeg' },   // JPEG
        { sig: 'UklGR', mime: 'image/webp' },  // WebP (RIFF)
        { sig: 'R0lGOD', mime: 'image/gif' },  // GIF
        { sig: 'Qk02', mime: 'image/bmp' },   // BMP
      ];
      
      for (const { sig, mime } of imageSignatures) {
        const sigIndex = value.indexOf(sig);
        if (sigIndex !== -1) {
          console.log(`✅ Found ${mime} signature at position ${sigIndex} - converting to data URI`);
          // Extract base64 data from the signature position
          const base64Data = sigIndex === 0 ? value : value.substring(sigIndex);
          return `data:${mime};base64,${base64Data}`;
        }
      }
      
      // Try as raw base64 with PNG default if it's long enough and looks like base64
      if (value.length > 1000 && /^[A-Za-z0-9+/=]+$/.test(value)) {
        console.log('✅ Treating as raw base64 PNG data');
        return `data:image/png;base64,${value}`;
      }
    }
    
    // If it's a short string, it's likely ISO template data
    console.log('📄 Data appears to be template data, not image');
    return null;
  }, [value, index, isCapturing]);

  // Determine data type for better user feedback
  const dataType = useMemo(() => {
    if (!value) return 'none';
    if (fingerprintImageUrl) return 'image';
    return 'template';
  }, [value, fingerprintImageUrl]);

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
    console.log(`✅ Real fingerprint image ${index + 1} loaded successfully`);
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
        ) : value ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {dataType === 'image' ? (
              isLoading ? (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <img 
                  src={fingerprintImageUrl!}
                  alt={`Real Fingerprint ${index + 1}`}
                  className={`max-w-36 max-h-36 object-contain transition-all duration-300 ${
                    imageError ? 'opacity-50' : 'animate-scale-in'
                  } rounded border`}
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                  style={{ 
                    filter: 'contrast(1.2) brightness(1.1) saturate(1.1)',
                    imageRendering: 'crisp-edges'
                  }}
                />
              )
            ) : (
              // Show template saved indicator for non-image data (ISO templates)
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
        {value && (
          <div className="text-xs mt-1 flex items-center justify-center space-x-1">
            {dataType === 'image' ? (
              <div className="text-green-600 flex items-center space-x-1 font-medium">
                <Image className="h-3 w-3" />
                <span>Real Image ✓</span>
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
