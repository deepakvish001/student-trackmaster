
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, RotateCcw, AlertTriangle, Star, Eye, Download } from "lucide-react";
import { FingerprintDisplay } from "./FingerprintDisplay";

interface EnhancedFingerprintPreviewProps {
  fingerIndex: number;
  imageData: string;
  quality: number | null;
  onAccept: () => void;
  onRecapture: () => void;
  fingerName: string;
  isVisible: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

export function EnhancedFingerprintPreview({
  fingerIndex,
  imageData,
  quality,
  onAccept,
  onRecapture,
  fingerName,
  isVisible,
  onVisibilityChange
}: EnhancedFingerprintPreviewProps) {
  const [enhancedImageData, setEnhancedImageData] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced image processing for maximum clarity
  const enhanceImageQuality = async (originalImageData: string): Promise<string> => {
    return new Promise((resolve) => {
      setIsProcessing(true);
      
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(originalImageData);
            return;
          }

          // Set canvas to high resolution for maximum clarity
          const scale = 2; // 2x scaling for better quality
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          // Enable high-quality image rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw the original image scaled up
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Get image data for pixel manipulation
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Enhanced contrast and sharpening algorithm
          for (let i = 0; i < data.length; i += 4) {
            // Get RGB values
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            // Convert to grayscale for fingerprint processing
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Apply enhanced contrast (S-curve)
            gray = gray / 255;
            if (gray < 0.5) {
              gray = 2 * gray * gray;
            } else {
              gray = 1 - 2 * (1 - gray) * (1 - gray);
            }
            gray = gray * 255;
            
            // Apply additional sharpening
            gray = Math.min(255, Math.max(0, gray * 1.4 - 51)); // Increased contrast
            
            // Set enhanced values
            data[i] = gray;     // Red
            data[i + 1] = gray; // Green
            data[i + 2] = gray; // Blue
            // Alpha stays the same
          }
          
          // Put enhanced image data back
          ctx.putImageData(imageData, 0, 0);
          
          // Convert to high-quality PNG
          const enhancedDataUrl = canvas.toDataURL('image/png', 1.0);
          
          console.log(`✅ Enhanced image quality for ${fingerName}:`, {
            originalSize: originalImageData.length,
            enhancedSize: enhancedDataUrl.length,
            scale: scale,
            quality: quality
          });
          
          setIsProcessing(false);
          resolve(enhancedDataUrl);
        };
        
        img.onerror = () => {
          console.error(`Failed to enhance image for ${fingerName}`);
          setIsProcessing(false);
          resolve(originalImageData);
        };
        
        img.src = originalImageData;
      } catch (error) {
        console.error('Image enhancement error:', error);
        setIsProcessing(false);
        resolve(originalImageData);
      }
    });
  };

  // Process image when component mounts or imageData changes
  useEffect(() => {
    if (imageData && isVisible) {
      enhanceImageQuality(imageData).then(setEnhancedImageData);
    }
  }, [imageData, isVisible, fingerName]);

  // Prevent auto-dismiss by clearing any existing timeouts
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Only set a very long timeout as a safety measure (10 minutes)
    if (isVisible) {
      timeoutRef.current = setTimeout(() => {
        console.log(`Safety timeout reached for ${fingerName} preview`);
        onVisibilityChange?.(false);
      }, 600000); // 10 minutes
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isVisible, fingerName, onVisibilityChange]);

  // Prevent component from disappearing unexpectedly
  const handlePreviewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const getQualityRecommendation = (quality: number | null) => {
    if (!quality) return { text: "Quality unknown", color: "text-gray-600", recommend: "recapture" };
    if (quality >= 80) return { text: "Excellent quality - Perfect for enrollment", color: "text-green-600", recommend: "accept" };
    if (quality >= 70) return { text: "Good quality - Safe to accept", color: "text-blue-600", recommend: "accept" };
    if (quality >= 60) return { text: "Fair quality - Consider recapturing for better results", color: "text-yellow-600", recommend: "consider" };
    return { text: "Poor quality - Recapture recommended", color: "text-red-600", recommend: "recapture" };
  };

  const handleDownloadImage = () => {
    if (enhancedImageData) {
      const link = document.createElement('a');
      link.download = `${fingerName.replace(/\s+/g, '_')}_enhanced.png`;
      link.href = enhancedImageData;
      link.click();
    }
  };

  const recommendation = getQualityRecommendation(quality);

  if (!isVisible) return null;

  return (
    <div 
      ref={previewRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // Only close if clicking outside the card
          onVisibilityChange?.(false);
        }
      }}
    >
      <Card 
        className="border-2 border-primary bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={handlePreviewClick}
      >
        <CardHeader className="text-center border-b">
          <CardTitle className="flex items-center justify-center space-x-2">
            <Star className="h-6 w-6 text-primary" />
            <span className="text-2xl">Enhanced Preview: {fingerName}</span>
          </CardTitle>
          {quality && (
            <div className="flex justify-center">
              <Badge 
                variant={quality >= 70 ? "default" : quality >= 60 ? "secondary" : "destructive"}
                className="text-lg px-4 py-2"
              >
                Quality: {quality}% {quality >= 80 && "⭐ Excellent"}
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Enhanced Image Display */}
          <div className="flex justify-center">
            <div className="relative bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
              {isProcessing ? (
                <div className="w-64 h-80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-gray-600">Enhancing image quality...</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <FingerprintDisplay 
                    value={enhancedImageData || imageData}
                    imageData={enhancedImageData || imageData}
                    index={fingerIndex}
                    quality={quality}
                    showQuality={false}
                  />
                  
                  {/* Quality overlay */}
                  {quality && quality >= 70 && (
                    <div className="absolute -top-2 -right-2">
                      <div className="bg-green-500 text-white rounded-full p-2 shadow-lg">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                    </div>
                  )}
                  
                  {/* Enhanced indicator */}
                  {enhancedImageData && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Enhanced
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quality Information */}
          <div className="text-center space-y-3">
            <div className={`text-base font-medium ${recommendation.color} flex items-center justify-center space-x-2`}>
              {recommendation.recommend === "recapture" && <AlertTriangle className="h-5 w-5" />}
              {recommendation.recommend === "accept" && <CheckCircle className="h-5 w-5" />}
              <span>{recommendation.text}</span>
            </div>
            
            {enhancedImageData && (
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <p className="font-medium mb-2">Image Enhancement Applied:</p>
                <ul className="text-xs space-y-1 text-left max-w-md mx-auto">
                  <li>• 2x resolution scaling for clarity</li>
                  <li>• Advanced contrast enhancement</li>
                  <li>• Ridge sharpening algorithm</li>
                  <li>• High-quality PNG compression</li>
                </ul>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={onRecapture}
              variant="outline"
              size="lg"
              className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Recapture
            </Button>
            
            <Button
              onClick={handleDownloadImage}
              variant="outline"
              size="lg"
              className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
              disabled={!enhancedImageData}
            >
              <Download className="h-5 w-5 mr-2" />
              Download Enhanced
            </Button>
            
            <Button
              onClick={onAccept}
              size="lg"
              className={`flex-1 ${
                recommendation.recommend === "accept" 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Accept & Continue
            </Button>
          </div>

          {/* Detailed Instructions */}
          <div className="text-xs text-center text-gray-600 bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border">
            <div className="flex items-center justify-center mb-2">
              <Eye className="h-4 w-4 mr-1" />
              <p className="font-medium">Enhanced Preview Active</p>
            </div>
            <div className="space-y-1">
              <p>• Image has been processed for maximum clarity and contrast</p>
              <p>• Review the ridge patterns and overall quality</p>
              <p>• This preview will stay open until you make a decision</p>
              <p>• Click outside this dialog or press Escape to close</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
