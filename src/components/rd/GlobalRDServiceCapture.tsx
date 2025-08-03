
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fingerprint, CheckCircle, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { useGlobalRDService } from "@/contexts/GlobalRDServiceContext";

interface GlobalRDServiceCaptureProps {
  index: number;
  onCaptureSuccess: (pidData: string, quality: number, imageData?: string) => void;
  onCaptureError: (error: string) => void;
  disabled?: boolean;
  fingerName?: string;
  targetQuality?: number;
}

export function GlobalRDServiceCapture({ 
  index, 
  onCaptureSuccess,
  onCaptureError,
  disabled = false,
  fingerName = `Finger ${index + 1}`,
  targetQuality = 60
}: GlobalRDServiceCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [pidData, setPidData] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string>("");
  
  const { isAvailable, captureFingerprint } = useGlobalRDService();

  const processRDServiceImage = useCallback((imageData: string): string => {
    try {
      if (!imageData || imageData.trim().length === 0) {
        return "";
      }

      if (imageData.startsWith('data:image/')) {
        return imageData;
      }

      if (imageData.match(/^[A-Za-z0-9+/=]+$/)) {
        return `data:image/png;base64,${imageData}`;
      } else {
        const base64Match = imageData.match(/(?:data:image\/[^;]+;base64,)?([A-Za-z0-9+/=]+)/);
        if (base64Match && base64Match[1]) {
          return `data:image/png;base64,${base64Match[1]}`;
        }
      }

      return "";
    } catch (error) {
      console.error('Image processing error:', error);
      return "";
    }
  }, []);

  const handleCapture = useCallback(async () => {
    if (!isAvailable) {
      const errorMsg = "RD Service is not available. Please test connection first.";
      toast.error(errorMsg);
      onCaptureError(errorMsg);
      setLastError(errorMsg);
      return;
    }

    try {
      setIsCapturing(true);
      setLastError("");
      
      toast.info(`Place ${fingerName} on the scanner and keep it steady...`, { 
        duration: 10000,
        description: "The scanner will capture automatically when ready"
      });

      const result = await captureFingerprint(15000);
      
      if (result.errCode !== "0") {
        throw new Error(result.errInfo || "Fingerprint capture failed");
      }

      if (result.pidData) {
        setPidData(result.pidData);
      } else {
        throw new Error("No PID data received from RD Service");
      }

      let processedImageData = "";
      if (result.imageData) {
        processedImageData = processRDServiceImage(result.imageData);
        if (processedImageData) {
          setCapturedImage(processedImageData);
        }
      }

      if (result.quality !== undefined) {
        setCaptureQuality(result.quality);
      }

      const qualityText = result.quality ? `Quality: ${result.quality}%` : "";
      const qualityIcon = (result.quality && result.quality >= 60) ? "✅" : "⚠️";
      
      toast.success(`${qualityIcon} ${fingerName} captured successfully! ${qualityText}`, {
        description: "Biometric data has been securely captured and processed"
      });

      onCaptureSuccess(
        result.pidData || '',
        result.quality || 0,
        processedImageData
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      setLastError(errorMessage);
      toast.error(`Failed to capture ${fingerName}: ${errorMessage}`, {
        duration: 8000,
        description: "Please ensure the scanner is connected and try again"
      });
      onCaptureError(errorMessage);
    } finally {
      setIsCapturing(false);
    }
  }, [isAvailable, fingerName, captureFingerprint, onCaptureSuccess, onCaptureError, processRDServiceImage]);

  const handleDownloadPidData = useCallback(() => {
    if (!pidData) return;
    
    const blob = new Blob([pidData], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fingerName.replace(/\s+/g, '_')}_piddata.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("PID data downloaded successfully");
  }, [pidData, fingerName]);

  return (
    <Card className="w-full max-w-md mx-auto border-2 hover:border-primary/50 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Fingerprint className="h-5 w-5" />
            <span>{fingerName}</span>
          </span>
          
          {captureQuality && (
            <Badge variant={captureQuality >= 70 ? "default" : captureQuality >= 60 ? "secondary" : "destructive"}>
              Quality: {captureQuality}%
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="relative">
          <FingerprintDisplay 
            value={capturedImage}
            imageData={capturedImage}
            index={index}
            quality={captureQuality}
            isCapturing={isCapturing}
            showQuality={true}
          />
          
          {isCapturing && (
            <div className="absolute inset-0 bg-black/10 rounded-lg flex items-center justify-center">
              <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg text-center">
                <div className="flex items-center space-x-2 mb-1">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm font-medium">Capturing...</span>
                </div>
                <p className="text-xs text-gray-600">Keep finger on scanner</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleCapture}
            disabled={isCapturing || !isAvailable || disabled}
            className={`w-full transition-all duration-300 ${
              isCapturing 
                ? 'bg-blue-500 hover:bg-blue-600 animate-pulse' 
                : isAvailable 
                  ? 'bg-primary hover:bg-primary/90' 
                  : 'bg-gray-400 cursor-not-allowed'
            }`}
            size="lg"
          >
            <Fingerprint className="mr-2 h-5 w-5" />
            {isCapturing 
              ? `Capturing ${fingerName}...` 
              : isAvailable
                ? `Capture ${fingerName}` 
                : 'Service Not Ready - Test Connection First'
            }
          </Button>

          {pidData && (
            <Button
              onClick={handleDownloadPidData}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PID Data
            </Button>
          )}
        </div>

        {capturedImage && pidData && (
          <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2 rounded">
            <CheckCircle className="h-4 w-4" />
            <span>UIDAI compliant biometric data captured successfully</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
