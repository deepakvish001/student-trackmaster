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
import { FullscreenFingerprintPreview } from "./FullscreenFingerprintPreview";

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

  const [fullscreenPreview, setFullscreenPreview] = useState({
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

      // Auto-reset after successful save for new capture
      setTimeout(() => {
        resetAll();
        setPreviewState({
          isVisible: false,
          fingerIndex: -1,
          fingerName: '',
          imageData: '',
          quality: 0
        });
        toast.info("System ready for new fingerprint capture", {
          description: "All data cleared - ready for next student"
        });
      }, 2000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Save failed';
      toast.error("Failed to save fingerprints", {
        description: errorMessage
      });
    } finally {
      setSavingToSupabase(false);
    }
  }, [allCaptured, getAllCapturedData, onAllCaptured, completedCount, resetAll]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'captured': return 'border-emerald-500 bg-emerald-500/10';
      case 'capturing': return 'border-electric-blue bg-electric-blue/10 animate-pulse';
      case 'retrying': return 'border-sunset-orange bg-sunset-orange/10 animate-pulse';
      case 'failed': return 'border-pink-rose bg-pink-rose/10';
      default: return 'border-border bg-muted/20 hover:border-electric-blue hover:shadow-md';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'captured': return <CheckCircle2 className="h-6 w-6 text-emerald-green" />;
      case 'capturing': return <Activity className="h-6 w-6 text-electric-blue animate-pulse" />;
      case 'retrying': return <RotateCcw className="h-6 w-6 text-sunset-orange animate-spin" />;
      case 'failed': return <AlertCircle className="h-6 w-6 text-pink-rose" />;
      default: return <Fingerprint className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getProgressPercentage = () => (completedCount / 5) * 100;

  return (
    <div className="space-y-8 p-8 bg-muted/10 rounded-3xl border border-border/50 shadow-xl backdrop-blur-sm">
      {/* Debug Information */}
      <div className="text-sm text-muted-foreground bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <strong>Debug Info:</strong>
        <br />• MFS100 SDK Available: {typeof window !== 'undefined' && window.GetMFS100Info ? '✅ Yes' : '❌ No'}
        <br />• Capture Function: {typeof window !== 'undefined' && window.CaptureFinger ? '✅ Available' : '❌ Missing'}
        <br />• Fingerprints Length: {fingerprints.length}
        <br />• Completed Count: {completedCount}
        <br />• Is Capturing: {isCapturing ? 'Yes' : 'No'}
      </div>
      {/* Enhanced Header */}
      <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur-md">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center justify-between text-2xl">
            <span className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Hand className="h-8 w-8 text-white" />
              </div>
              <span className="text-foreground font-bold text-3xl">
                Multi-Fingerprint Capture System
              </span>
            </span>
            <div className="flex space-x-3">
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
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => {
                  toast.info("Resetting MFS100 device state...");
                  // Force device reset through service
                  resetAll();
                }}
                disabled={disabled}
                className="hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all duration-300 font-semibold px-6 py-3 text-base"
              >
                <Zap className="h-5 w-5 mr-2" />
                Reset Device
              </Button>
            </div>
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
              <div className="flex items-center space-x-3 p-3 bg-electric-blue/10 rounded-lg border border-electric-blue/20">
                <TrendingUp className="h-5 w-5 text-electric-blue" />
                <div>
                  <div className="text-sm font-medium text-foreground">Average Quality</div>
                  <div className="text-lg font-bold text-foreground">{averageQuality}%</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-emerald-green/10 rounded-lg border border-emerald-green/20">
                <Zap className="h-5 w-5 text-emerald-green" />
                <div>
                  <div className="text-sm font-medium text-foreground">AI Enhancement</div>
                  <div className="text-lg font-bold text-foreground">Ultra HD + AI</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-vibrant-purple/10 rounded-lg border border-vibrant-purple/20">
                <Clock className="h-5 w-5 text-vibrant-purple" />
                <div>
                  <div className="text-sm font-medium text-foreground">Status</div>
                  <div className="text-lg font-bold text-foreground">
                    {isCapturing ? 'Capturing...' : allCaptured ? 'Complete' : 'In Progress'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fingerprint Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 justify-items-center">
        {fingerprints.map((fingerprint, index) => (
          <Card 
            key={index}
            className={`relative transition-all duration-500 transform hover:scale-105 ${getStatusColor(fingerprint.status)} border-2`}
          >
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-base font-bold text-foreground">
                Finger {index + 1}
              </CardTitle>
              <div className="text-sm text-muted-foreground font-medium">
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
              <div className={`mx-auto w-48 h-56 border-2 rounded-lg flex items-center justify-center transition-all duration-500 ${
                fingerprint.status === 'capturing' || fingerprint.status === 'retrying'
                  ? 'border-electric-blue border-dashed animate-pulse bg-electric-blue/10' 
                  : fingerprint.status === 'captured'
                    ? 'border-emerald-green bg-emerald-green/10'
                    : fingerprint.status === 'failed'
                      ? 'border-pink-rose bg-pink-rose/10'
                      : 'border-border bg-muted/20'
              }`}>
                {fingerprint.imageData ? (
                  <img 
                    src={fingerprint.imageData} 
                    alt={`${fingerNames[index]} preview`}
                    className="w-full h-full object-contain rounded shadow-sm"
                    style={{
                      filter: 'contrast(1.3) brightness(1.15) saturate(1.15)',
                      imageRendering: 'crisp-edges',
                      maxWidth: '100%',
                      maxHeight: '100%'
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center space-y-1">
                    {getStatusIcon(fingerprint.status)}
                    <span className="text-xs font-medium text-muted-foreground">
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
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full py-2 text-xs font-bold bg-electric-blue/10 border-electric-blue/30 text-electric-blue hover:bg-electric-blue/20"
                      onClick={() => setFullscreenPreview({
                        isVisible: true,
                        fingerIndex: index,
                        fingerName: fingerNames[index],
                        imageData: fingerprint.imageData,
                        quality: fingerprint.quality
                      })}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Full Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full py-2 text-xs font-bold bg-sunset-orange/10 border-sunset-orange/30 text-sunset-orange hover:bg-sunset-orange/20 transition-all duration-200"
                      onClick={() => handleRetry(index)}
                      disabled={disabled || isCapturing}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Recapture
                    </Button>
                  </div>
                ) : fingerprint.status === 'failed' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full py-2 text-xs font-bold bg-sunset-orange/10 border-sunset-orange/30 text-sunset-orange hover:bg-sunset-orange/20"
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
        <Card className="border-3 border-emerald-green bg-emerald-green/10 shadow-2xl">
          <CardContent className="pt-8 pb-6">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full shadow-xl">
                  <CheckCircle2 className="h-16 w-16 text-white" />
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-foreground">
                  All Fingerprints Captured!
                </h3>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium mt-2">
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

      {/* Fullscreen Preview Dialog */}
      <FullscreenFingerprintPreview
        isOpen={fullscreenPreview.isVisible}
        fingerName={fullscreenPreview.fingerName}
        imageData={fullscreenPreview.imageData}
        quality={fullscreenPreview.quality}
        onClose={() => setFullscreenPreview(prev => ({ ...prev, isVisible: false }))}
        onRecapture={() => {
          const index = fullscreenPreview.fingerIndex;
          setFullscreenPreview(prev => ({ ...prev, isVisible: false }));
          if (index >= 0) {
            setTimeout(() => handleRetry(index), 500);
          }
        }}
      />

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