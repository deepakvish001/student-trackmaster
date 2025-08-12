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
  Hand,
  TrendingUp
} from "lucide-react";

interface FingerprintState {
  index: number;
  status: 'pending' | 'capturing' | 'captured' | 'failed' | 'retrying';
  imageData: string;
  template: string;
  quality: number;
}

interface CleanFingerprintGridProps {
  onFingerprintCaptured?: (index: number, template: string, imageData: string, quality: number) => void;
  onAllCaptured?: (fingerprintData: any[]) => void;
  disabled?: boolean;
  targetQuality?: number;
}

export function CleanFingerprintGrid({ 
  onFingerprintCaptured,
  onAllCaptured, 
  disabled = false,
  targetQuality = 70
}: CleanFingerprintGridProps) {
  
  const [fingerprints, setFingerprints] = useState<FingerprintState[]>([
    { index: 0, status: 'pending', imageData: '', template: '', quality: 0 },
    { index: 1, status: 'pending', imageData: '', template: '', quality: 0 },
    { index: 2, status: 'pending', imageData: '', template: '', quality: 0 },
    { index: 3, status: 'pending', imageData: '', template: '', quality: 0 },
    { index: 4, status: 'pending', imageData: '', template: '', quality: 0 }
  ]);

  const [isCapturing, setIsCapturing] = useState(false);

  const fingerNames = [
    "Right Thumb",
    "Right Index", 
    "Right Middle",
    "Left Index",
    "Left Thumb"
  ];

  const completedCount = fingerprints.filter(fp => fp.status === 'captured').length;
  const allCaptured = completedCount === 5;
  const averageQuality = fingerprints
    .filter(fp => fp.status === 'captured')
    .reduce((sum, fp) => sum + fp.quality, 0) / Math.max(completedCount, 1);

  // Add ref to component for external reset
  React.useEffect(() => {
    const element = document.querySelector('[data-fingerprint-grid]');
    if (element) {
      (element as any).reset = () => {
        console.log('🔄 Fingerprint grid reset triggered externally');
        resetAll();
      };
    }
  }, []);

  const handleCapture = useCallback(async (index: number) => {
    if (isCapturing) {
      toast.warning("Another capture is in progress");
      return;
    }

    try {
      setIsCapturing(true);
      setFingerprints(prev => prev.map(fp => 
        fp.index === index ? { ...fp, status: 'capturing' } : fp
      ));

      toast.info(`Place ${fingerNames[index]} on scanner`, { 
        duration: 3000,
        description: "Hold steady for best quality" 
      });

      // Check if MFS100 SDK is available
      if (!window.CaptureFinger) {
        throw new Error('MFS100 SDK not available. Please ensure the device is connected.');
      }

      const result = window.CaptureFinger(targetQuality, 20);
      
      if (result.httpStaus && result.data?.ErrorCode === "0") {
        const quality = result.data.Quality || 0;
        let imageData = "";
        
        // Process bitmap data if available
        if (result.data.BitmapData) {
          // Create a simple image from bitmap data
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            const binaryData = atob(result.data.BitmapData);
            const imgData = ctx.createImageData(256, 256);
            const data = imgData.data;
            
            for (let i = 0; i < Math.min(binaryData.length, 256 * 256); i++) {
              const pixelValue = 255 - binaryData.charCodeAt(i);
              const pixelIndex = i * 4;
              data[pixelIndex] = pixelValue;
              data[pixelIndex + 1] = pixelValue;
              data[pixelIndex + 2] = pixelValue;
              data[pixelIndex + 3] = 255;
            }
            
            ctx.putImageData(imgData, 0, 0);
            imageData = canvas.toDataURL('image/png');
          }
        }

        setFingerprints(prev => prev.map(fp => 
          fp.index === index ? { 
            ...fp, 
            status: 'captured', 
            imageData, 
            template: result.data.IsoTemplate || '', 
            quality 
          } : fp
        ));

        toast.success(`${fingerNames[index]} captured!`, {
          description: `Quality: ${quality}%`
        });

        // Notify parent component
        if (onFingerprintCaptured) {
          onFingerprintCaptured(index, result.data.IsoTemplate || '', imageData, quality);
        }

        // Check if all fingerprints are captured
        const newCompletedCount = fingerprints.filter(fp => fp.status === 'captured').length + 1;
        if (newCompletedCount === 5 && onAllCaptured) {
          setTimeout(() => {
            const allData = fingerprints.map(fp => ({
              index: fp.index,
              template: fp.template,
              imageData: fp.imageData,
              quality: fp.quality,
              timestamp: new Date()
            }));
            onAllCaptured(allData);
          }, 500);
        }

      } else {
        throw new Error(result.data?.ErrorDescription || 'Capture failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      
      setFingerprints(prev => prev.map(fp => 
        fp.index === index ? { ...fp, status: 'failed' } : fp
      ));

      toast.error(`${fingerNames[index]} capture failed`, {
        description: errorMessage
      });
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, targetQuality, fingerNames, onFingerprintCaptured, onAllCaptured, fingerprints]);

  const handleRetry = useCallback(async (index: number) => {
    await handleCapture(index);
  }, [handleCapture]);

  const resetAll = useCallback(() => {
    setFingerprints([
      { index: 0, status: 'pending', imageData: '', template: '', quality: 0 },
      { index: 1, status: 'pending', imageData: '', template: '', quality: 0 },
      { index: 2, status: 'pending', imageData: '', template: '', quality: 0 },
      { index: 3, status: 'pending', imageData: '', template: '', quality: 0 },
      { index: 4, status: 'pending', imageData: '', template: '', quality: 0 }
    ]);
    setIsCapturing(false);
  }, []);

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
    <div className="space-y-8" data-fingerprint-grid>
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
                onClick={() => toast.info("Device reset not implemented")}
                disabled={disabled}
                className="hover:bg-amber-600 border-amber-500 text-amber-400 hover:text-white transition-all duration-300"
              >
                <Zap className="h-4 w-4 mr-1" />
                Reset Device
              </Button>
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
                  <div className="text-white font-bold">{Math.round(averageQuality)}%</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 p-2 bg-gray-800 rounded-lg">
                <Zap className="h-4 w-4 text-green-400" />
                <div>
                  <div className="text-gray-300">Enhancement</div>
                  <div className="text-white font-bold">Standard</div>
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

      {/* Success Message - Show when all captured */}
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
                <p className="text-sm text-gray-300">
                  Average Quality: {Math.round(averageQuality)}% • Standard Processing • Ready to Submit Form
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}