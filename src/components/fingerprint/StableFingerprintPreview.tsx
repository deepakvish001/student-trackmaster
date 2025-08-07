import { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, RotateCcw, AlertTriangle, Star, Lock, Shield } from "lucide-react";
import { FingerprintDisplay } from "../FingerprintDisplay";

interface StableFingerprintPreviewProps {
  fingerIndex: number;
  imageData: string;
  quality: number | null;
  onAccept: () => void;
  onRecapture: () => void;
  fingerName: string;
  locked?: boolean;
}

export function StableFingerprintPreview({
  fingerIndex,
  imageData,
  quality,
  onAccept,
  onRecapture,
  fingerName,
  locked = true
}: StableFingerprintPreviewProps) {
  
  // Prevent accidental dismissal with escape key override
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && locked) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔒 Escape key blocked - preview is locked');
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (locked) {
        e.preventDefault();
        e.returnValue = 'Fingerprint preview is active. Are you sure you want to leave?';
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [locked]);

  const getQualityRecommendation = useCallback((quality: number | null) => {
    if (!quality) return { 
      text: "Quality unknown - Please review image manually", 
      color: "text-gray-600", 
      recommend: "recapture" 
    };
    if (quality >= 80) return { 
      text: "Excellent quality - Highly recommended to accept", 
      color: "text-green-600", 
      recommend: "accept" 
    };
    if (quality >= 70) return { 
      text: "Good quality - Safe to accept", 
      color: "text-blue-600", 
      recommend: "accept" 
    };
    if (quality >= 60) return { 
      text: "Fair quality - Consider recapturing for optimal results", 
      color: "text-yellow-600", 
      recommend: "consider" 
    };
    return { 
      text: "Poor quality - Strongly recommend recapturing", 
      color: "text-red-600", 
      recommend: "recapture" 
    };
  }, []);

  const recommendation = getQualityRecommendation(quality);

  const handleAccept = useCallback(() => {
    console.log(`✅ User accepted ${fingerName} with quality ${quality}%`);
    onAccept();
  }, [onAccept, fingerName, quality]);

  const handleRecapture = useCallback(() => {
    console.log(`🔄 User chose to recapture ${fingerName}`);
    onRecapture();
  }, [onRecapture, fingerName]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 border-2 border-primary bg-white shadow-2xl animate-fade-in">
        <CardHeader className="text-center bg-gradient-to-r from-blue-50 to-green-50">
          <CardTitle className="flex items-center justify-center space-x-2">
            <Star className="h-5 w-5 text-primary" />
            <span>Preview: {fingerName}</span>
            {locked && <Lock className="h-4 w-4 text-blue-500" />}
          </CardTitle>
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Stable Preview - Won't disappear automatically</span>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          {/* Enhanced Preview Display */}
          <div className="flex justify-center">
            <div className="relative p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
              <FingerprintDisplay 
                value={imageData}
                index={fingerIndex}
                quality={quality}
                showQuality={true}
              />
              {quality && quality >= 70 && (
                <div className="absolute -top-2 -right-2">
                  <div className="bg-green-500 text-white rounded-full p-2 shadow-lg">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                </div>
              )}
              {quality && quality < 60 && (
                <div className="absolute -top-2 -right-2">
                  <div className="bg-orange-500 text-white rounded-full p-2 shadow-lg">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Quality Information */}
          <div className="text-center space-y-4">
            {quality !== null && (
              <div className="flex items-center justify-center space-x-3">
                <Badge 
                  variant={quality >= 70 ? "default" : quality >= 60 ? "secondary" : "destructive"}
                  className="text-base px-4 py-2"
                >
                  Quality: {quality}%
                </Badge>
                {quality >= 80 && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs text-yellow-600 font-medium">Premium</span>
                  </div>
                )}
                {quality >= 70 && quality < 80 && (
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-600 font-medium">Good</span>
                  </div>
                )}
              </div>
            )}
            
            <div className={`text-sm font-medium ${recommendation.color} flex items-center justify-center space-x-2 p-3 rounded-lg bg-gray-50/50`}>
              {recommendation.recommend === "recapture" && <AlertTriangle className="h-4 w-4" />}
              {recommendation.recommend === "accept" && <CheckCircle className="h-4 w-4" />}
              {recommendation.recommend === "consider" && <AlertTriangle className="h-4 w-4" />}
              <span>{recommendation.text}</span>
            </div>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleRecapture}
              variant="outline"
              size="lg"
              className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400 transition-all duration-200"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Recapture
            </Button>
            
            <Button
              onClick={handleAccept}
              size="lg"
              className={`flex-1 transition-all duration-200 ${
                recommendation.recommend === "accept" 
                  ? "bg-green-600 hover:bg-green-700 shadow-lg" 
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Accept & Continue
            </Button>
          </div>

          {/* Enhanced Instructions */}
          <div className="text-xs text-center text-gray-700 bg-blue-50/70 p-4 rounded-lg border border-blue-200">
            <p className="font-semibold mb-2 text-blue-800">🔍 Review Your Fingerprint Capture</p>
            <div className="space-y-1 text-left">
              <p>• ✓ Check if fingerprint ridges are clear and detailed</p>
              <p>• ✓ Verify the quality percentage meets your standards</p>
              <p>• ✓ This preview will stay open until you make a choice</p>
              <p>• ✓ Choose "Accept" to save or "Recapture" to try again</p>
            </div>
            <div className="mt-3 text-center">
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                <Lock className="h-3 w-3 mr-1" />
                Stable Preview - No Auto-Dismissal
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}