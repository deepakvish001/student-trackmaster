
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, RotateCcw, AlertTriangle, Star, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FingerprintCapturePreviewProps {
  fingerIndex: number;
  imageData: string;
  quality: number | null;
  onAccept: () => void;
  onRecapture: () => void;
  fingerName: string;
  isPreviewMode?: boolean;
}

export function FingerprintCapturePreview({
  fingerIndex,
  imageData,
  quality,
  onAccept,
  onRecapture,
  fingerName,
  isPreviewMode = true
}: FingerprintCapturePreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getQualityAssessment = (quality: number | null) => {
    if (!quality) return { 
      text: "Quality unknown", 
      color: "text-gray-600", 
      bgColor: "bg-gray-100",
      recommendation: "Recapture recommended" 
    };
    
    if (quality >= 70) return { 
      text: `Excellent quality: ${quality}%`, 
      color: "text-green-700", 
      bgColor: "bg-green-50",
      recommendation: "Ready to accept" 
    };
    
    if (quality >= 60) return { 
      text: `Good quality: ${quality}%`, 
      color: "text-blue-700", 
      bgColor: "bg-blue-50",
      recommendation: "Safe to accept" 
    };
    
    if (quality >= 50) return { 
      text: `Fair quality: ${quality}%`, 
      color: "text-yellow-700", 
      bgColor: "bg-yellow-50",
      recommendation: "Consider recapturing" 
    };
    
    return { 
      text: `Poor quality: ${quality}%`, 
      color: "text-red-700", 
      bgColor: "bg-red-50",
      recommendation: "Recapture recommended" 
    };
  };

  const assessment = getQualityAssessment(quality);
  const shouldRecommendAccept = quality && quality >= 60;

  return (
    <Card className="border-2 border-blue-500 shadow-lg animate-fade-in">
      <CardHeader className="text-center pb-4">
        <CardTitle className="flex items-center justify-center space-x-2 text-lg">
          <Star className="h-5 w-5 text-blue-500" />
          <span>Preview: {fingerName}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Large Preview Image */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-64 h-80 border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
              {imageData && !imageError ? (
                <img 
                  src={imageData}
                  alt={`${fingerName} fingerprint preview`}
                  className="w-full h-full object-contain"
                  style={{ 
                    filter: 'contrast(1.3) brightness(1.1)',
                    imageRendering: 'pixelated'
                  }}
                  onLoad={() => {
                    setImageLoaded(true);
                    setImageError(false);
                  }}
                  onError={() => {
                    setImageError(true);
                    setImageLoaded(false);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">No image data</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Quality indicator overlay */}
            {quality && imageLoaded && (
              <div className="absolute top-2 right-2">
                <Badge className={`${assessment.bgColor} ${assessment.color} border-0`}>
                  {quality}%
                </Badge>
              </div>
            )}
            
            {/* Success indicator */}
            {shouldRecommendAccept && imageLoaded && (
              <div className="absolute -top-2 -right-2">
                <div className="bg-green-500 text-white rounded-full p-1">
                  <CheckCircle className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quality Assessment */}
        <div className="text-center space-y-3">
          <div className={`p-4 rounded-lg ${assessment.bgColor}`}>
            <div className={`font-semibold ${assessment.color} mb-2`}>
              Quality: {assessment.text}
            </div>
            <div className={`text-sm ${assessment.color}`}>
              {assessment.recommendation}
            </div>
          </div>
        </div>

        {/* Image Status */}
        {imageLoaded && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              ✓ Image captured - Fingerprint ridges and patterns are clearly visible
            </AlertDescription>
          </Alert>
        )}

        {imageError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to display fingerprint image. Please recapture.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3 pt-4">
          <Button
            onClick={onAccept}
            size="lg"
            className={`w-full ${
              shouldRecommendAccept 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            disabled={!imageLoaded}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Accept & Continue
          </Button>
          
          <Button
            onClick={onRecapture}
            variant="outline"
            size="lg"
            className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Recapture
          </Button>
        </div>

        {/* Guidance */}
        <div className="text-xs text-center text-gray-600 bg-gray-50 p-3 rounded-lg">
          <p className="font-medium mb-2">Review Guidelines:</p>
          <div className="space-y-1 text-left">
            <p>• Check if fingerprint ridges are clearly visible</p>
            <p>• Ensure the image quality meets requirements</p>
            <p>• Quality ≥60% is generally acceptable</p>
            <p>• Quality ≥70% is excellent for matching</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
