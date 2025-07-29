import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Hand, RotateCcw, Eye, Wifi, WifiOff, Fingerprint } from "lucide-react";
import { EnhancedFingerprintPreview } from "./EnhancedFingerprintPreview";
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
  const [deviceConnected, setDeviceConnected] = useState(false);
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

  const handleFingerprintCaptured = useCallback((index: number, value: string, quality?: number, imageData?: string) => {
    console.log(`Fingerprint ${index + 1} captured with enhanced processing:`, {
      hasValue: !!value,
      quality,
      hasImage: !!imageData,
      imageLength: imageData?.length || 0
    });
    
    // Store the captured data
    onFingerprintChange(index, value);
    
    if (imageData) {
      setCapturedImages(prev => {
        const updated = [...prev];
        updated[index] = imageData;
        return updated;
      });
      onImageChange?.(index, imageData);
    }
    
    if (quality !== undefined) {
      setCapturedQualities(prev => {
        const updated = [...prev];
        updated[index] = quality;
        return updated;
      });
    }

    // Show enhanced preview for review
    if (imageData && quality !== undefined) {
      showPreview(index, imageData, quality);
    }
  }, [onFingerprintChange, onImageChange, showPreview]);

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

  const handleReconnect = () => {
    setDeviceConnected(!deviceConnected);
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
                Enhanced Fingerprint Enrollment
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

      {/* Enhanced Fingerprint Grid Layout - Optimized 2-Row Design */}
      <div className="space-y-8">
        {/* Row 1: First 3 fingers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
          {fingerNames.slice(0, 3).map((name, index) => {
            const status = getFingerStatus(index);
            const isDisconnected = !deviceConnected;
            const quality = capturedQualities[index];
            
            return (
              <Card 
                key={index}
                className={`relative transition-all duration-500 cursor-pointer hover:scale-105 transform w-full max-w-xs ${
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
                    variant={isDisconnected ? "destructive" : status === 'accepted' ? "default" : "secondary"}
                    className="px-4 py-2 text-sm font-bold shadow-lg"
                  >
                    {isDisconnected ? (
                      <>
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse" />
                        Disconnected
                      </>
                    ) : status === 'accepted' ? (
                      <>
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                        Captured ✓
                      </>
                    ) : status === 'captured' ? (
                      <>
                        <div className="w-3 h-3 bg-amber-500 rounded-full mr-2" />
                        Review
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-gray-400 rounded-full mr-2" />
                        Ready
                      </>
                    )}
                  </Badge>
                </div>

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Finger {index + 1}
                  </CardTitle>
                  <div className="text-sm text-gray-700 font-semibold">
                    {name}
                  </div>
                  {quality && (
                    <div className="text-xs text-center mt-2">
                      <Badge variant={quality >= 70 ? "default" : "secondary"}>
                        Quality: {quality}%
                      </Badge>
                    </div>
                  )}
                </CardHeader>
                
                <CardContent className="text-center space-y-6 pb-6">
                  <div className="flex items-center justify-center space-x-2">
                    {isDisconnected ? (
                      <WifiOff className="h-5 w-5 text-red-500" />
                    ) : (
                      <Wifi className="h-5 w-5 text-green-500" />
                    )}
                    <span className={`text-sm font-semibold ${
                      isDisconnected ? 'text-red-700' : 'text-green-700'
                    }`}>
                      {isDisconnected ? 'Disconnected' : 'Connected'}
                    </span>
                  </div>

                  <div className={`mx-auto w-32 h-40 border-3 rounded-xl flex items-center justify-center transition-all duration-500 ${
                    status === 'current'
                      ? 'border-blue-500 border-dashed animate-pulse bg-gradient-to-br from-blue-100 to-indigo-100 shadow-inner' 
                      : status === 'accepted'
                        ? 'border-green-500 bg-gradient-to-br from-green-100 to-emerald-100 shadow-inner'
                        : status === 'captured'
                          ? 'border-amber-500 bg-gradient-to-br from-amber-100 to-yellow-100 shadow-inner'
                          : 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 shadow-inner'
                  }`}>
                    <div className="flex flex-col items-center space-y-3">
                      {status === 'accepted' ? (
                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                      ) : status === 'captured' ? (
                        <Eye className="h-12 w-12 text-amber-600" />
                      ) : status === 'current' ? (
                        <Circle className="h-12 w-12 text-blue-500 animate-pulse" />
                      ) : (
                        <>
                          <Fingerprint className="h-12 w-12 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">No Print</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      size="lg"
                      variant={status === 'current' ? "default" : "outline"}
                      disabled={status === 'accepted'}
                      className="w-full py-3 text-sm font-bold transition-all duration-300 shadow-lg"
                      onClick={() => {
                        if (status === 'captured') {
                          showPreview(index, capturedImages[index], capturedQualities[index]);
                        }
                      }}
                    >
                      <Fingerprint className="mr-2 h-5 w-5" />
                      {status === 'accepted' ? 'Captured ✓' : status === 'captured' ? 'Review' : 'Capture'}
                    </Button>
                    
                    {isDisconnected && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleReconnect}
                        className="w-full py-2 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300 font-semibold"
                      >
                        Reconnect Device
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Row 2: Last 2 fingers - Centered */}
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
            {fingerNames.slice(3, 5).map((name, idx) => {
              const index = idx + 3;
              const status = getFingerStatus(index);
              const isDisconnected = !deviceConnected;
              const quality = capturedQualities[index];
              
              return (
                <Card 
                  key={index}
                  className={`relative transition-all duration-500 cursor-pointer hover:scale-105 transform w-full max-w-xs ${
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
                      variant={isDisconnected ? "destructive" : status === 'accepted' ? "default" : "secondary"}
                      className="px-4 py-2 text-sm font-bold shadow-lg"
                    >
                      {isDisconnected ? (
                        <>
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse" />
                          Disconnected
                        </>
                      ) : status === 'accepted' ? (
                        <>
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                          Captured ✓
                        </>
                      ) : status === 'captured' ? (
                        <>
                          <div className="w-3 h-3 bg-amber-500 rounded-full mr-2" />
                          Review
                        </>
                      ) : (
                        <>
                          <div className="w-3 h-3 bg-gray-400 rounded-full mr-2" />
                          Ready
                        </>
                      )}
                    </Badge>
                  </div>

                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-lg font-bold text-gray-900">
                      Finger {index + 1}
                    </CardTitle>
                    <div className="text-sm text-gray-700 font-semibold">
                      {name}
                    </div>
                    {quality && (
                      <div className="text-xs text-center mt-2">
                        <Badge variant={quality >= 70 ? "default" : "secondary"}>
                          Quality: {quality}%
                        </Badge>
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="text-center space-y-6 pb-6">
                    <div className="flex items-center justify-center space-x-2">
                      {isDisconnected ? (
                        <WifiOff className="h-5 w-5 text-red-500" />
                      ) : (
                        <Wifi className="h-5 w-5 text-green-500" />
                      )}
                      <span className={`text-sm font-semibold ${
                        isDisconnected ? 'text-red-700' : 'text-green-700'
                      }`}>
                        {isDisconnected ? 'Disconnected' : 'Connected'}
                      </span>
                    </div>

                    <div className={`mx-auto w-32 h-40 border-3 rounded-xl flex items-center justify-center transition-all duration-500 ${
                      status === 'current'
                        ? 'border-blue-500 border-dashed animate-pulse bg-gradient-to-br from-blue-100 to-indigo-100 shadow-inner' 
                        : status === 'accepted'
                          ? 'border-green-500 bg-gradient-to-br from-green-100 to-emerald-100 shadow-inner'
                          : status === 'captured'
                            ? 'border-amber-500 bg-gradient-to-br from-amber-100 to-yellow-100 shadow-inner'
                            : 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 shadow-inner'
                    }`}>
                      <div className="flex flex-col items-center space-y-3">
                        {status === 'accepted' ? (
                          <CheckCircle2 className="h-12 w-12 text-green-600" />
                        ) : status === 'captured' ? (
                          <Eye className="h-12 w-12 text-amber-600" />
                        ) : status === 'current' ? (
                          <Circle className="h-12 w-12 text-blue-500 animate-pulse" />
                        ) : (
                          <>
                            <Fingerprint className="h-12 w-12 text-gray-400" />
                            <span className="text-xs font-medium text-gray-500">No Print</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button
                        size="lg"
                        variant={status === 'current' ? "default" : "outline"}
                        disabled={status === 'accepted'}
                        className="w-full py-3 text-sm font-bold transition-all duration-300 shadow-lg"
                        onClick={() => {
                          if (status === 'captured') {
                            showPreview(index, capturedImages[index], capturedQualities[index]);
                          }
                        }}
                      >
                        <Fingerprint className="mr-2 h-5 w-5" />
                        {status === 'accepted' ? 'Captured ✓' : status === 'captured' ? 'Review' : 'Capture'}
                      </Button>
                      
                      {isDisconnected && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleReconnect}
                          className="w-full py-2 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300 font-semibold"
                        >
                          Reconnect Device
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
          <CardContent className="pt-10 pb-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-xl">
                  <CheckCircle2 className="h-20 w-20 text-white" />
                </div>
              </div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-green-800 to-emerald-900 bg-clip-text text-transparent">
                Enhanced Enrollment Complete!
              </h3>
              <p className="text-green-800 text-xl max-w-2xl mx-auto font-semibold">
                All 5 fingerprints have been captured with enhanced quality processing and verified. 
                The student registration is now ready to be saved.
              </p>
              <div className="flex justify-center space-x-6 mt-8">
                <Badge variant="default" className="px-6 py-3 text-base font-bold bg-gradient-to-r from-green-500 to-emerald-600">
                  ✓ All Fingers Enhanced & Enrolled
                </Badge>
                <Badge variant="secondary" className="px-6 py-3 text-base font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
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
