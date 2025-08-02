import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Hand, RotateCcw, Eye, Fingerprint } from "lucide-react";
import { EnhancedFingerprintPreview } from "./EnhancedFingerprintPreview";
import { ZeroPollingMFS100Capture } from "./rd/ZeroPollingMFS100Capture";
import { useStableFingerprintPreview } from "@/hooks/useStableFingerprintPreview";

interface FingerprintGuidanceSystemProps {
  fingerprints: string[];
  onFingerprintChange: (index: number, value: string) => void;
  onImageChange?: (index: number, imageData: string) => void;
  targetQuality?: number;
}

export function FingerprintGuidanceSystem({ 
  fingerprints, 
  onFingerprintChange, 
  onImageChange,
  targetQuality = 70
}: FingerprintGuidanceSystemProps) {
  const [currentFinger, setCurrentFinger] = useState(0);
  const [acceptedFingers, setAcceptedFingers] = useState<boolean[]>([false, false, false, false, false]);
  const [capturedQualities, setCapturedQualities] = useState<(number | null)[]>([null, null, null, null, null]);
  const [capturedImages, setCapturedImages] = useState<string[]>(['', '', '', '', '']);

  const {
    previewState,
    showPreview,
    hidePreview,
    acceptPreview,
    rejectPreview,
    handleVisibilityChange
  } = useStableFingerprintPreview();

  const fingerNames = [
    "Right Thumb",
    "Right Index", 
    "Right Middle",
    "Left Index",
    "Left Thumb"
  ];

  const handleFingerprintCaptured = useCallback((index: number, imageData: string, quality: number) => {
    console.log(`✅ Zero-polling capture completed for finger ${index + 1}:`, {
      hasImage: !!imageData,
      quality,
      imageLength: imageData?.length || 0
    });
    
    // Store the captured data
    onFingerprintChange(index, imageData);
    
    if (imageData) {
      setCapturedImages(prev => {
        const updated = [...prev];
        updated[index] = imageData;
        return updated;
      });
      onImageChange?.(index, imageData);
    }
    
    setCapturedQualities(prev => {
      const updated = [...prev];
      updated[index] = quality;
      return updated;
    });

    // Show preview for review
    if (imageData && quality !== undefined) {
      showPreview(index, imageData, quality);
    }
  }, [onFingerprintChange, onImageChange, showPreview]);

  const handleFingerprintError = useCallback((index: number, error: string) => {
    console.log(`❌ Zero-polling capture error for finger ${index + 1}:`, error);
  }, []);

  const handlePreviewAccept = useCallback(() => {
    const acceptedPreview = acceptPreview();
    if (acceptedPreview.fingerIndex !== null) {
      const index = acceptedPreview.fingerIndex;
      
      // Mark finger as accepted
      const newAccepted = [...acceptedFingers];
      newAccepted[index] = true;
      setAcceptedFingers(newAccepted);
      
      console.log(`✅ Finger ${index + 1} accepted and finalized`);
      
      // Move to next unaccepted finger
      const nextUnacceptedIndex = newAccepted.findIndex((accepted, i) => !accepted);
      if (nextUnacceptedIndex !== -1) {
        setCurrentFinger(nextUnacceptedIndex);
        console.log(`➡️ Moving to finger ${nextUnacceptedIndex + 1}`);
      } else {
        console.log('🎉 All fingerprints captured and accepted!');
      }
    }
  }, [acceptPreview, acceptedFingers]);

  const handlePreviewRecapture = useCallback(() => {
    const rejectedPreview = rejectPreview();
    if (rejectedPreview.fingerIndex !== null) {
      const index = rejectedPreview.fingerIndex;
      
      // Clear the captured data for recapture
      onFingerprintChange(index, "");
      setCapturedImages(prev => {
        const updated = [...prev];
        updated[index] = '';
        return updated;
      });
      setCapturedQualities(prev => {
        const updated = [...prev];
        updated[index] = null;
        return updated;
      });
      onImageChange?.(index, "");
      
      // Set as current finger for recapture
      setCurrentFinger(index);
      console.log(`🔄 Recapturing finger ${index + 1}`);
    }
  }, [rejectPreview, onFingerprintChange, onImageChange]);

  const getProgressPercentage = () => {
    return (acceptedFingers.filter(Boolean).length / 5) * 100;
  };

  const resetCapture = () => {
    console.log('🔄 Resetting entire capture system...');
    setCurrentFinger(0);
    setAcceptedFingers([false, false, false, false, false]);
    setCapturedQualities([null, null, null, null, null]);
    setCapturedImages(['', '', '', '', '']);
    hidePreview();
    
    for (let i = 0; i < 5; i++) {
      onFingerprintChange(i, "");
      onImageChange?.(i, "");
    }
  };

  const getFingerStatus = (index: number) => {
    if (acceptedFingers[index]) return 'accepted';
    if (currentFinger === index) return 'current';
    if (fingerprints[index] || capturedImages[index]) return 'captured';
    return 'pending';
  };

  const handleFingerClick = (index: number) => {
    if (!acceptedFingers[index]) {
      console.log(`👆 Manually switching to finger ${index + 1}`);
      setCurrentFinger(index);
    }
  };

  return (
    <div className="space-y-8 p-8 bg-gradient-to-br from-sky-50/70 via-blue-50/50 to-indigo-50/70 rounded-3xl border border-blue-100/50 shadow-xl backdrop-blur-sm">
      {/* Enhanced Progress Overview */}
      <Card className="border-0 shadow-2xl bg-gradient-to-r from-white/95 to-blue-50/80 backdrop-blur-md">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center justify-between text-2xl">
            <span className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Hand className="h-8 w-8 text-white" />
              </div>
              <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent font-bold text-3xl">
                Zero-Polling Fingerprint Enrollment
              </span>
            </span>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={resetCapture}
              disabled={acceptedFingers.every(accepted => !accepted)}
              className="hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all duration-300 font-semibold px-6 py-3 text-base"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Reset All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex items-center space-x-6">
            <Progress 
              value={getProgressPercentage()} 
              className="flex-1 h-4 bg-gray-100 shadow-inner"
            />
            <Badge 
              variant={getProgressPercentage() === 100 ? "default" : "secondary"}
              className="px-6 py-3 text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
            >
              {acceptedFingers.filter(Boolean).length}/5 Completed
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Zero-Polling Fingerprint Grid - All 5 fingers */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 justify-items-center">
          {fingerNames.map((name, index) => {
            const status = getFingerStatus(index);
            const quality = capturedQualities[index];
            
            return (
              <div key={index} className="w-full max-w-xs">
                <Card 
                  className={`relative transition-all duration-500 cursor-pointer hover:scale-105 transform ${
                    status === 'current'
                      ? 'border-3 border-blue-500 shadow-2xl bg-gradient-to-br from-blue-50 to-indigo-50 scale-105 ring-4 ring-blue-200/50' 
                      : status === 'accepted'
                        ? 'border-3 border-green-500 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50'
                        : status === 'captured'
                          ? 'border-3 border-amber-500 shadow-lg bg-gradient-to-br from-amber-50 to-yellow-50'
                          : 'border-2 border-gray-200 shadow-lg hover:border-blue-300 bg-white hover:shadow-xl'
                  }`}
                  onClick={() => handleFingerClick(index)}
                >
                  <div className="absolute -top-3 -right-3 z-10">
                    <Badge 
                      variant={status === 'accepted' ? "default" : "secondary"}
                      className="px-3 py-1 text-sm font-bold shadow-lg bg-blue-500 text-white"
                    >
                      Zero-Polling Ready
                    </Badge>
                  </div>

                  <CardHeader className="text-center pb-3">
                    <CardTitle className="text-base font-bold text-gray-900">
                      Finger {index + 1}
                    </CardTitle>
                    <div className="text-sm text-gray-700 font-medium">
                      {name}
                    </div>
                    {quality && (
                      <div className="text-xs text-center mt-1">
                        <Badge variant={quality >= 70 ? "default" : "secondary"} className="text-xs">
                          Quality: {quality}%
                        </Badge>
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="text-center space-y-4 pb-4">
                    <div className={`mx-auto w-24 h-32 border-2 rounded-lg flex items-center justify-center transition-all duration-500 ${
                      status === 'current'
                        ? 'border-blue-500 border-dashed animate-pulse bg-gradient-to-br from-blue-100 to-indigo-100 shadow-inner' 
                        : status === 'accepted'
                          ? 'border-green-500 bg-gradient-to-br from-green-100 to-emerald-100 shadow-inner'
                          : status === 'captured'
                            ? 'border-amber-500 bg-gradient-to-br from-amber-100 to-yellow-100 shadow-inner'
                            : 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 shadow-inner'
                    }`}>
                      <div className="flex flex-col items-center space-y-2">
                        {status === 'accepted' ? (
                          <CheckCircle2 className="h-8 w-8 text-green-600" />
                        ) : status === 'captured' ? (
                          <Eye className="h-8 w-8 text-amber-600" />
                        ) : status === 'current' ? (
                          <Circle className="h-8 w-8 text-blue-500 animate-pulse" />
                        ) : (
                          <>
                            <Fingerprint className="h-8 w-8 text-blue-500" />
                            <span className="text-xs font-medium text-blue-600">Ready</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {status === 'current' ? (
                        <ZeroPollingMFS100Capture
                          index={index}
                          onCaptureSuccess={(imageData, quality) => handleFingerprintCaptured(index, imageData, quality)}
                          onCaptureError={(error) => handleFingerprintError(index, error)}
                          fingerName={name}
                          targetQuality={targetQuality}
                        />
                      ) : (
                        <Button
                          size="sm"
                          variant={status === 'accepted' ? "default" : "outline"}
                          disabled={status === 'accepted'}
                          className="w-full py-2 text-xs font-bold transition-all duration-300 shadow-md"
                          onClick={() => {
                            if (status === 'captured') {
                              showPreview(index, capturedImages[index], capturedQualities[index]);
                            } else {
                              setCurrentFinger(index);
                            }
                          }}
                        >
                          <Fingerprint className="mr-1 h-3 w-3" />
                          {status === 'accepted' ? 'Captured ✓' : status === 'captured' ? 'Review' : 'Select'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enhanced Preview Modal */}
      {previewState.isVisible && (
        <EnhancedFingerprintPreview
          fingerIndex={previewState.fingerIndex!}
          imageData={previewState.imageData}
          quality={previewState.quality}
          onAccept={handlePreviewAccept}
          onRecapture={handlePreviewRecapture}
          fingerName={fingerNames[previewState.fingerIndex!]}
          isVisible={previewState.isVisible}
          onVisibilityChange={handleVisibilityChange}
        />
      )}

      {/* Enhanced Completion Status */}
      {getProgressPercentage() === 100 && (
        <Card className="border-3 border-green-500 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 shadow-2xl">
          <CardContent className="pt-8 pb-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-xl">
                  <CheckCircle2 className="h-16 w-16 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-green-800 to-emerald-900 bg-clip-text text-transparent">
                Zero-Polling Enrollment Complete!
              </h3>
              <p className="text-green-800 text-lg max-w-2xl mx-auto font-medium">
                All 5 fingerprints have been captured using the zero-polling approach with no background checks. 
                The student registration is now ready to be saved.
              </p>
              <div className="flex justify-center space-x-4 mt-6">
                <Badge variant="default" className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-600">
                  ✓ All Fingers Zero-Polling Enrolled
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  🚀 Ready to Save
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
