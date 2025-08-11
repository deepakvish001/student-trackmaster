import React, { useState, useCallback } from "react";
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
  Activity,
  Zap,
  Save,
  Loader2,
  Hand,
  TrendingUp,
  Eye
} from "lucide-react";
import { useMultiFingerprintCapture } from "@/hooks/useMultiFingerprintCapture";

interface CleanFingerprintGridProps {
  onAllCaptured: (fingerprintData: any[]) => void;
  disabled?: boolean;
  targetQuality?: number;
}

export function CleanFingerprintGrid({ 
  onAllCaptured, 
  disabled = false,
  targetQuality = 70
}: CleanFingerprintGridProps) {
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
        if (fingerprint) {
          toast.success(`${fingerNames[index]} captured!`, {
            description: `Quality: ${fingerprint.quality}%`
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Retry failed';
      toast.error(`Retry failed for ${fingerNames[index]}`, {
        description: errorMessage
      });
    }
  }, [retryCapture, fingerNames]);

  // Handle Save All action (manual save)
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

  // Handle Reset Device
  const handleResetDevice = useCallback(() => {
    toast.info("Resetting MFS100 device state...");
    // Force device reset through service
    resetAll();
  }, [resetAll]);

  // Handle Cancel
  const handleCancel = useCallback(() => {
    if (isCapturing) {
      cancelCapture();
      toast.info("Capture cancelled");
    }
  }, [isCapturing, cancelCapture]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'captured': return <CheckCircle2 className="h-6 w-6 text-orange-400" />;
      case 'capturing': return <Activity className="h-6 w-6 text-orange-400 animate-pulse" />;
      case 'retrying': return <RotateCcw className="h-6 w-6 text-yellow-400 animate-spin" />;
      case 'failed': return <AlertCircle className="h-6 w-6 text-red-400" />;
      default: return <Fingerprint className="h-6 w-6 text-gray-400" />;
    }
  };

  const getProgressPercentage = () => (completedCount / 5) * 100;

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Controls */}
      <Card className="border border-gray-600 bg-black text-white">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-xl">
            <span className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Hand className="h-6 w-6 text-white" />
              </div>
              <span className="text-white font-bold">
                Fingerprint Capture System
              </span>
            </span>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={resetAll}
                disabled={disabled || completedCount === 0}
                className="hover:bg-red-600 border-red-500 text-red-400 hover:text-white transition-all duration-300"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset All
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleResetDevice}
                disabled={disabled}
                className="hover:bg-amber-600 border-amber-500 text-amber-400 hover:text-white transition-all duration-300"
              >
                <Zap className="h-4 w-4 mr-1" />
                Reset Device
              </Button>
              {isCapturing && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCancel}
                  className="hover:bg-red-600 border-red-500 text-red-400 hover:text-white transition-all duration-300"
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Progress 
                value={getProgressPercentage()} 
                className="flex-1 h-3 bg-gray-700"
              />
              <Badge 
                variant={allCaptured ? "default" : "secondary"}
                className="ml-4 px-3 py-1 text-sm font-bold bg-orange-500 text-white"
              >
                {completedCount}/5 Completed
              </Badge>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center space-x-2 p-2 bg-gray-800 rounded-lg">
                <TrendingUp className="h-4 w-4 text-orange-400" />
                <div>
                  <div className="text-gray-300">Avg Quality</div>
                  <div className="text-white font-bold">{averageQuality}%</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 p-2 bg-gray-800 rounded-lg">
                <Zap className="h-4 w-4 text-green-400" />
                <div>
                  <div className="text-gray-300">Enhancement</div>
                  <div className="text-white font-bold">2x Scale</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 p-2 bg-gray-800 rounded-lg">
                <Activity className="h-4 w-4 text-blue-400" />
                <div>
                  <div className="text-gray-300">Status</div>
                  <div className="text-white font-bold">
                    {isCapturing ? 'Capturing...' : allCaptured ? 'Complete' : 'In Progress'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fingerprint Grid */}
      <div className="grid grid-cols-5 gap-6">
        {fingerprints.map((fingerprint, index) => (
          <div key={index} className="text-center space-y-3">
            {/* Fingerprint Preview Box */}
            <div className={`w-full h-40 border-2 rounded-lg bg-black flex items-center justify-center overflow-hidden ${
              fingerprint.status === 'capturing' || fingerprint.status === 'retrying'
                ? 'border-orange-400 border-dashed animate-pulse' 
                : fingerprint.status === 'captured'
                  ? 'border-green-500'
                  : fingerprint.status === 'failed'
                    ? 'border-red-500'
                    : 'border-gray-600'
            }`}>
              {fingerprint.imageData ? (
                <img 
                  src={fingerprint.imageData} 
                  alt={`${fingerNames[index]} preview`}
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'contrast(1.3) brightness(1.15)',
                    imageRendering: 'crisp-edges'
                  }}
                />
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  {getStatusIcon(fingerprint.status)}
                  <span className="text-xs text-gray-400">
                    {fingerprint.status === 'capturing' ? 'Capturing...' :
                     fingerprint.status === 'retrying' ? 'Retrying...' :
                     fingerprint.status === 'failed' ? 'Failed' :
                     fingerprint.status === 'captured' ? 'Captured' : 'Ready'}
                  </span>
                  {fingerprint.quality > 0 && (
                    <Badge 
                      variant={fingerprint.quality >= 70 ? "default" : "secondary"} 
                      className="text-xs bg-orange-500"
                    >
                      {fingerprint.quality}%
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Finger Label */}
            <div className="text-white font-medium text-sm">
              {fingerNames[index]}
            </div>

            {/* Capture Button */}
            <div>
              {fingerprint.status === 'captured' ? (
                <Button
                  size="sm"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs py-1"
                  onClick={() => handleRetry(index)}
                  disabled={disabled || isCapturing}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Recapture
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs py-1"
                  onClick={() => handleCapture(index)}
                  disabled={disabled || isCapturing || fingerprint.status === 'capturing' || fingerprint.status === 'retrying'}
                >
                  <Fingerprint className="h-3 w-3 mr-1" />
                  {fingerprint.status === 'capturing' ? 'Capturing...' :
                   fingerprint.status === 'retrying' ? 'Retrying...' : 'Capture'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Save All Button - Only show when all captured */}
      {allCaptured && (
        <Card className="border-2 border-green-500 bg-green-500/10 text-white">
          <CardContent className="pt-6 pb-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-green-500 rounded-full">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  All Fingerprints Captured Successfully!
                </h3>
                <p className="text-sm text-gray-300 mb-4">
                  Average Quality: {averageQuality}% • Enhanced 2x Scale • Ready to Save
                </p>
                <Button
                  size="lg"
                  onClick={handleSaveAll}
                  disabled={savingToSupabase}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3"
                >
                  {savingToSupabase ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Save All Fingerprints
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}