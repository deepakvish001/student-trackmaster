import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, RotateCcw, Zap, Eye, Image as ImageIcon } from "lucide-react";

interface PersistentFingerprintPreviewProps {
  isOpen: boolean;
  fingerName: string;
  fingerIndex: number;
  imageData: string;
  quality: number;
  onAccept: () => void;
  onRecapture: () => void;
  onClose: () => void;
}

export function PersistentFingerprintPreview({
  isOpen,
  fingerName,
  fingerIndex,
  imageData,
  quality,
  onAccept,
  onRecapture,
  onClose
}: PersistentFingerprintPreviewProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  const getQualityColor = useCallback((quality: number) => {
    if (quality >= 80) return 'bg-emerald-500';
    if (quality >= 70) return 'bg-blue-500';
    if (quality >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  }, []);

  const getQualityLabel = useCallback((quality: number) => {
    if (quality >= 80) return 'Excellent';
    if (quality >= 70) return 'Good';
    if (quality >= 60) return 'Fair';
    return 'Poor';
  }, []);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-blue-50/30 border-2 border-blue-200/50 shadow-2xl">
        <DialogHeader className="space-y-4 pb-6">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
              <Eye className="h-6 w-6 text-white" />
            </div>
            <span>Enhanced Preview - {fingerName}</span>
          </DialogTitle>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Badge 
                variant="default" 
                className={`${getQualityColor(quality)} text-white px-4 py-2 text-sm font-bold shadow-lg`}
              >
                Quality: {quality}% - {getQualityLabel(quality)}
              </Badge>
              
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 px-3 py-1 font-semibold">
                <Zap className="h-3 w-3 mr-1" />
                4x Enhanced
              </Badge>
            </div>
            
            <Badge variant="secondary" className="bg-gray-100 text-gray-700 px-3 py-1">
              Finger {fingerIndex + 1}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enhanced Image Display */}
          <Card className="border-2 border-blue-200/50 bg-gradient-to-br from-white to-blue-50/20 shadow-lg overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                    <ImageIcon className="h-5 w-5 text-blue-600" />
                    <span>Ultra-High Quality Preview</span>
                  </h3>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {isZoomed ? 'Normal' : 'Zoom'}
                  </Button>
                </div>

                <div className={`flex justify-center transition-all duration-500 ${
                  isZoomed ? 'scale-125' : 'scale-100'
                }`}>
                  <div className="relative bg-white p-6 rounded-xl shadow-inner border-2 border-gray-200/50">
                    {imageData ? (
                      <img
                        src={imageData}
                        alt={`${fingerName} fingerprint`}
                        className="w-80 h-80 object-contain rounded-lg shadow-lg border border-gray-200"
                        style={{
                          imageRendering: 'crisp-edges',
                          filter: 'contrast(1.2) brightness(1.1) saturate(1.1)'
                        }}
                      />
                    ) : (
                      <div className="w-80 h-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center border border-gray-300">
                        <span className="text-gray-500 font-medium">No image data</span>
                      </div>
                    )}
                    
                    {/* Quality indicator overlay */}
                    <div className="absolute top-2 right-2">
                      <Badge 
                        className={`${getQualityColor(quality)} text-white px-2 py-1 text-xs font-bold shadow-md`}
                      >
                        {quality}%
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="font-bold text-blue-800">Resolution</div>
                    <div className="text-blue-600">1024x1024</div>
                    <div className="text-xs text-blue-500">4x Enhanced</div>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="font-bold text-emerald-800">Processing</div>
                    <div className="text-emerald-600">Advanced</div>
                    <div className="text-xs text-emerald-500">Noise Reduced</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="font-bold text-purple-800">Format</div>
                    <div className="text-purple-600">PNG</div>
                    <div className="text-xs text-purple-500">Lossless</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <Button
              onClick={onAccept}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 px-6 shadow-lg transition-all duration-300 transform hover:scale-105"
              size="lg"
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              Accept & Continue
            </Button>
            
            <Button
              onClick={onRecapture}
              variant="outline"
              className="flex-1 border-2 border-orange-300 text-orange-700 hover:bg-orange-50 font-bold py-3 px-6 shadow-lg transition-all duration-300 transform hover:scale-105"
              size="lg"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Recapture
            </Button>
          </div>

          {/* Quality Information */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200/50">
            <div className="text-sm text-blue-800">
              <div className="font-semibold mb-2">Quality Assessment:</div>
              <div className="space-y-1">
                <div>• Clarity: {quality >= 70 ? 'Excellent' : quality >= 60 ? 'Good' : 'Needs Improvement'}</div>
                <div>• Ridge Pattern: {quality >= 75 ? 'Clear' : quality >= 65 ? 'Adequate' : 'Unclear'}</div>
                <div>• Minutiae Points: {quality >= 80 ? 'Rich' : quality >= 70 ? 'Sufficient' : 'Limited'}</div>
              </div>
              {quality < 70 && (
                <div className="mt-3 p-3 bg-amber-100 border border-amber-300 rounded-lg">
                  <div className="text-amber-800 font-medium text-xs">
                    💡 Tip: For better quality, ensure finger is clean, dry, and placed firmly on the scanner.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}