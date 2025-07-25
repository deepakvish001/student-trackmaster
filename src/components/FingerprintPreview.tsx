
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, RotateCcw, AlertTriangle, Star } from "lucide-react";
import { FingerprintDisplay } from "./FingerprintDisplay";

interface FingerprintPreviewProps {
  fingerIndex: number;
  imageData: string;
  quality: number | null;
  onAccept: () => void;
  onRecapture: () => void;
  fingerName: string;
}

export function FingerprintPreview({
  fingerIndex,
  imageData,
  quality,
  onAccept,
  onRecapture,
  fingerName
}: FingerprintPreviewProps) {
  const getQualityRecommendation = (quality: number | null) => {
    if (!quality) return { text: "Quality unknown", color: "text-gray-600", recommend: "recapture" };
    if (quality >= 80) return { text: "Excellent quality - Recommended to accept", color: "text-green-600", recommend: "accept" };
    if (quality >= 70) return { text: "Good quality - Safe to accept", color: "text-blue-600", recommend: "accept" };
    if (quality >= 60) return { text: "Fair quality - Consider recapturing for better results", color: "text-yellow-600", recommend: "consider" };
    return { text: "Poor quality - Recapture recommended", color: "text-red-600", recommend: "recapture" };
  };

  const recommendation = getQualityRecommendation(quality);

  return (
    <Card className="border-2 border-primary bg-blue-50/50 animate-fade-in">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center space-x-2">
          <Star className="h-5 w-5 text-primary" />
          <span>Preview: {fingerName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Large Preview Display */}
        <div className="flex justify-center">
          <div className="relative">
            <FingerprintDisplay 
              value={imageData}
              index={fingerIndex}
              quality={quality}
              showQuality={true}
            />
            {quality && quality >= 70 && (
              <div className="absolute -top-2 -right-2">
                <div className="bg-green-500 text-white rounded-full p-1">
                  <CheckCircle className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quality Information */}
        <div className="text-center space-y-3">
          {quality && (
            <div className="flex items-center justify-center space-x-2">
              <Badge variant={quality >= 70 ? "default" : quality >= 60 ? "secondary" : "destructive"}>
                Quality: {quality}%
              </Badge>
              {quality >= 80 && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
            </div>
          )}
          
          <div className={`text-sm font-medium ${recommendation.color} flex items-center justify-center space-x-2`}>
            {recommendation.recommend === "recapture" && <AlertTriangle className="h-4 w-4" />}
            {recommendation.recommend === "accept" && <CheckCircle className="h-4 w-4" />}
            <span>{recommendation.text}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={onRecapture}
            variant="outline"
            size="lg"
            className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Recapture
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
            <CheckCircle className="h-4 w-4 mr-2" />
            Accept & Continue
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-center text-gray-600 bg-white/70 p-3 rounded-lg">
          <p className="font-medium mb-1">Review your fingerprint capture:</p>
          <p>• Check if the ridges are clear and visible</p>
          <p>• Ensure the quality meets your requirements</p>
          <p>• Choose "Accept" to save or "Recapture" to try again</p>
        </div>
      </CardContent>
    </Card>
  );
}
