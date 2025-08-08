import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Fingerprint, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Eye, 
  Hand, 
  Zap,
  Clock,
  Activity,
  TrendingUp,
  Save,
  Loader2
} from "lucide-react";
import { useMultiFingerprintCapture } from "@/hooks/useMultiFingerprintCapture";
import { PersistentFingerprintPreview } from "./PersistentFingerprintPreview";

interface MultiFingerCaptureInterfaceProps {
  onAllCaptured: (fingerprintData: any[]) => void;
  disabled?: boolean;
  targetQuality?: number;
}

export function MultiFingerCaptureInterface({ 
  onAllCaptured, 
  disabled = false,
  targetQuality = 70
}: MultiFingerCaptureInterfaceProps) {
  const {
    fingerprints,
    completedCount,
    averageQuality,
    allCaptured,
    isCapturing,
    captureFingerprint,
    retryCapture,
    resetAll,
    cancelCapture,
    getAllCapturedData
  } = useMultiFingerprintCapture();

  const [previewState, setPreviewState] = useState({
    isVisible: false,
    fingerIndex: -1,
    fingerName: '',
    imageData: '',
    quality: 0
  });

  const [savingToSupabase, setSavingToSupabase] = useState(false);

  const fingerNames = [
    "Right Thumb",
    "Right Index", 
    "Right Middle",
    "Left Index",
    "Left Thumb"
  ];

  const handleCapture = useCallback(async (index: number) => {
    if (isCapturing) {
      toast.warning("Another capture is in progress");
      return;
    }

    try {
      toast.info(`Place ${fingerNames[index]} on scanner`, { 
        duration: 3000,
        description: "Hold steady for best quality" 
      });
      
      const success = await captureFingerprint(index, targetQuality, 20);
      
      if (success) {
        const fingerprint = fingerprints.find(fp => fp.index === index);
        if (fingerprint && fingerprint.imageData) {
          // Show persistent preview
          setPreviewState({
            isVisible: true,
            fingerIndex: index,
            fingerName: fingerNames[index],
            imageData: fingerprint.imageData,
            quality: fingerprint.quality
          });
          
          toast.success(`${fingerNames[index]} captured!`, {
            description: `Quality: ${fingerprint.quality}% (Enhanced 4x)`
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      toast.error(`${fingerNames[index]} capture failed`, {
        description: errorMessage
      });
    }
  }, [isCapturing, captureFingerprint, targetQuality, fingerNames, fingerprints]);

  const handleRetry = useCallback(async (index: number) => {
    try {
      toast.info(`Retrying ${fingerNames[index]}...`);
      const success = await retryCapture(index);
      
      if (success) {
        const fingerprint = fingerprints.find(fp => fp.index === index);
        if (fingerprint && fingerprint.imageData) {
          setPreviewState({
            isVisible: true,
            fingerIndex: index,
            fingerName: fingerNames[index],
            imageData: fingerprint.imageData,
            quality: fingerprint.quality
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Retry failed';
      toast.error(`Retry failed for ${fingerNames[index]}`, {
        description: errorMessage
      });
    }
  }, [retryCapture, fingerNames, fingerprints]);

  const handlePreviewAccept = useCallback(() => {
    setPreviewState(prev => ({ ...prev, isVisible: false }));
    toast.success("Fingerprint accepted!");
  }, []);

  const handlePreviewRecapture = useCallback(() => {
    const index = previewState.fingerIndex;
    setPreviewState(prev => ({ ...prev, isVisible: false }));
    
    if (index >= 0) {
      // Trigger recapture after a short delay
      setTimeout(() => {
        handleRetry(index);
      }, 500);
    }
  }, [previewState.fingerIndex, handleRetry]);

  const handleSaveAll = useCallback(async () => {
    if (!allCaptured) {
      toast.error("Please capture all 5 fingerprints first");
      return;
    }

    setSavingToSupabase(true);
    try {
      const capturedData = getAllCapturedData();
      
      toast.success("Starting secure upload...", {
        description: "Encrypting and saving fingerprint data"
      });
      
      // Convert to format expected by parent component
      const fingerprintData = capturedData.fingerprints.map(fp => ({
        index: fp.index,
        imageData: fp.imageData,
        template: fp.template,
        quality: fp.quality,
        timestamp: fp.timestamp
      }));
      
      await onAllCaptured(fingerprintData);
      
      toast.success("All fingerprints saved successfully!", {
        description: `${completedCount} fingerprints uploaded to secure database`
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Save failed';
      toast.error("Failed to save fingerprints", {
        description: errorMessage
      });
    } finally {
      setSavingToSupabase(false);
    }
  }, [allCaptured, getAllCapturedData, onAllCaptured, completedCount]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'captured': return 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50';
      case 'capturing': return 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 animate-pulse';
      case 'retrying': return 'border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 animate-pulse';
      case 'failed': return 'border-red-500 bg-gradient-to-br from-red-50 to-rose-50';
      default: return 'border-gray-300 bg-gradient-to-br from-gray-50 to-slate-50 hover:border-blue-400 hover:shadow-md';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'captured': return <CheckCircle2 className="h-6 w-6 text-emerald-600" />;
      case 'capturing': return <Activity className="h-6 w-6 text-blue-600 animate-pulse" />;
      case 'retrying': return <RotateCcw className="h-6 w-6 text-amber-600 animate-spin" />;
      case 'failed': return <AlertCircle className="h-6 w-6 text-red-600" />;
      default: return <Fingerprint className="h-6 w-6 text-gray-500" />;
    }
  };

  const getProgressPercentage = () => (completedCount / 5) * 100;

  return (
    <div className="space-y-8 p-8 bg-gradient-to-br from-sky-50/70 via-blue-50/50 to-indigo-50/70 rounded-3xl border border-blue-100/50 shadow-xl backdrop-blur-sm">
      {/* Enhanced Header */}
      <Card className="border-0 shadow-2xl bg-gradient-to-r from-white/95 to-blue-50/80 backdrop-blur-md">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center justify-between text-2xl">
            <span className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Hand className="h-8 w-8 text-white" />
              </div>
              <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent font-bold text-3xl">
                Multi-Fingerprint Capture System
              </span>
            </span>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={resetAll}
              disabled={disabled || completedCount === 0}
              className="hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all duration-300 font-semibold px-6 py-3 text-base"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Reset All
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Progress Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Progress 
                  value={getProgressPercentage()} 
                  className="flex-1 h-4 bg-gray-100 shadow-inner min-w-[300px]"
                />
                <Badge 
                  variant={allCaptured ? "default" : "secondary"}
                  className="px-6 py-3 text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                >
                  {completedCount}/5 Completed
                </Badge>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-blue-800">Average Quality</div>
                  <div className="text-lg font-bold text-blue-900">{averageQuality}%</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                <Zap className="h-5 w-5 text-emerald-600" />
                <div>
                  <div className="text-sm font-medium text-emerald-800">Enhancement</div>
                  <div className="text-lg font-bold text-emerald-900">4x Ultra HD</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <Clock className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="text-sm font-medium text-purple-800">Status</div>
                  <div className="text-lg font-bold text-purple-900">
                    {isCapturing ? 'Capturing...' : allCaptured ? 'Complete' : 'In Progress'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fingerprint Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 justify-items-center">
        {fingerprints.map((fingerprint, index) => (
          <Card 
            key={index}
            className={`relative transition-all duration-500 transform hover:scale-105 ${getStatusColor(fingerprint.status)} border-2`}
          >
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-base font-bold text-gray-900">
                Finger {index + 1}
              </CardTitle>
              <div className="text-sm text-gray-700 font-medium">
                {fingerNames[index]}
              </div>
              {fingerprint.quality > 0 && (
                <Badge 
                  variant={fingerprint.quality >= 70 ? "default" : "secondary"} 
                  className="text-xs"
                >
                  Quality: {fingerprint.quality}%
                </Badge>
              )}
            </CardHeader>
            
            <CardContent className="text-center space-y-4 pb-4">
              {/* Fingerprint Display */}
              <div className={`mx-auto w-24 h-32 border-2 rounded-lg flex items-center justify-center transition-all duration-500 ${
                fingerprint.status === 'capturing' || fingerprint.status === 'retrying'
                  ? 'border-blue-500 border-dashed animate-pulse bg-gradient-to-br from-blue-100 to-indigo-100' 
                  : fingerprint.status === 'captured'
                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-100 to-green-100'
                    : fingerprint.status === 'failed'
                      ? 'border-red-500 bg-gradient-to-br from-red-100 to-rose-100'
                      : 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100'
              }`}>
                {fingerprint.imageData ? (
                  <img 
                    src={fingerprint.imageData} 
                    alt={`${fingerNames[index]} preview`}
                    className="w-20 h-28 object-contain rounded"
                  />
                ) : (
                  <div className="flex flex-col items-center space-y-1">
                    {getStatusIcon(fingerprint.status)}
                    <span className="text-xs font-medium">
                      {fingerprint.status === 'capturing' ? 'Capturing...' :
                       fingerprint.status === 'retrying' ? 'Retrying...' :
                       fingerprint.status === 'failed' ? 'Failed' :
                       fingerprint.status === 'captured' ? 'Captured' : 'Ready'}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {fingerprint.status === 'captured' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full py-2 text-xs font-bold bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                    onClick={() => setPreviewState({
                      isVisible: true,
                      fingerIndex: index,
                      fingerName: fingerNames[index],
                      imageData: fingerprint.imageData,
                      quality: fingerprint.quality
                    })}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Preview
                  </Button>
                ) : fingerprint.status === 'failed' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full py-2 text-xs font-bold bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => handleRetry(index)}
                    disabled={disabled || isCapturing}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Retry
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={fingerprint.status === 'capturing' || fingerprint.status === 'retrying' ? "default" : "outline"}
                    className="w-full py-2 text-xs font-bold transition-all duration-300"
                    onClick={() => handleCapture(index)}
                    disabled={disabled || isCapturing || fingerprint.status === 'capturing' || fingerprint.status === 'retrying'}
                  >
                    <Fingerprint className="mr-1 h-3 w-3" />
                    {fingerprint.status === 'capturing' ? 'Capturing...' :
                     fingerprint.status === 'retrying' ? 'Retrying...' : 'Capture'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save All Button */}
      {allCaptured && (
        <Card className="border-3 border-emerald-500 bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 shadow-2xl">
          <CardContent className="pt-8 pb-6">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full shadow-xl">
                  <CheckCircle2 className="h-16 w-16 text-white" />
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-800 to-green-900 bg-clip-text text-transparent">
                  All Fingerprints Captured!
                </h3>
                <p className="text-emerald-800 text-lg max-w-2xl mx-auto font-medium mt-2">
                  All 5 fingerprints have been captured with ultra-high quality enhancement. 
                  Ready to save to secure database.
                </p>
              </div>

              <Button
                onClick={handleSaveAll}
                disabled={savingToSupabase}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-4 px-8 text-lg shadow-xl transition-all duration-300 transform hover:scale-105"
                size="lg"
              >
                {savingToSupabase ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Saving to Supabase...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-6 w-6" />
                    Save All to Database
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Persistent Preview Modal */}
      <PersistentFingerprintPreview
        isOpen={previewState.isVisible}
        fingerName={previewState.fingerName}
        fingerIndex={previewState.fingerIndex}
        imageData={previewState.imageData}
        quality={previewState.quality}
        onAccept={handlePreviewAccept}
        onRecapture={handlePreviewRecapture}
        onClose={() => setPreviewState(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}