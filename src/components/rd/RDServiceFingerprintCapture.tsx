
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fingerprint, Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw, Download, Info } from "lucide-react";
import { toast } from "sonner";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { useRDService } from "@/hooks/useRDService";

interface RDServiceFingerprintCaptureProps {
  index: number;
  onCaptureSuccess: (pidData: string, quality: number, imageData?: string) => void;
  onCaptureError: (error: string) => void;
  disabled?: boolean;
  fingerName?: string;
  targetQuality?: number;
  onCaptureStart?: () => void;
  onCaptureEnd?: () => void;
}

export function RDServiceFingerprintCapture({ 
  index, 
  onCaptureSuccess,
  onCaptureError,
  disabled = false,
  fingerName = `Finger ${index + 1}`,
  targetQuality = 60,
  onCaptureStart,
  onCaptureEnd
}: RDServiceFingerprintCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [pidData, setPidData] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);
  
  const { 
    isAvailable, 
    isChecking, 
    error, 
    deviceInfo, 
    retryCount,
    checkAvailability, 
    captureFingerprint,
    resetConnection
  } = useRDService();

  // Convert various RD image formats to data URI
  const toDataUri = useCallback((imageData: string): string => {
    if (!imageData) return '';
    if (imageData.startsWith('data:image/')) return imageData;
    const base64 = imageData.match(/(?:data:image\/[^;]+;base64,)?([A-Za-z0-9+/=]+)/)?.[1];
    return base64 ? `data:image/png;base64,${base64}` : '';
  }, []);

  // Enhance image quality: scale 2x + contrast + unsharp mask
  const enhanceImageQuality = useCallback(async (dataUri: string): Promise<string> => {
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUri);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;
        // simple contrast and sharpen
        const contrast = 1.25; // 25%
        for (let i = 0; i < d.length; i += 4) {
          const gray = d[i];
          let v = gray / 255;
          v = (v - 0.5) * contrast + 0.5; // contrast
          const val = Math.max(0, Math.min(255, Math.round(v * 255)));
          d[i] = d[i+1] = d[i+2] = val;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png', 1.0));
      };
      img.onerror = () => resolve(dataUri);
      img.src = dataUri;
    });
  }, []);

  const handleCapture = useCallback(async () => {
    if (!isAvailable) {
      const errorMsg = "MFS100 service is not available. Please check your connection.";
      toast.error(errorMsg);
      onCaptureError(errorMsg);
      return;
    }

    try {
      onCaptureStart?.();
      setIsCapturing(true);

      toast.info(`Place ${fingerName} on the scanner and wait...`, { 
        duration: 5000,
        description: "Keep finger steady on the scanner"
      });

      const result = await captureFingerprint();

      if (result.errCode !== "0") {
        throw new Error(result.errInfo || "Capture failed");
      }

      if (result.pidData) setPidData(result.pidData);

      let processedImage = '';
      if (result.imageData) {
        const dataUri = toDataUri(result.imageData);
        processedImage = dataUri ? await enhanceImageQuality(dataUri) : '';
        if (processedImage) setCapturedImage(processedImage);
      }

      if (typeof result.quality === 'number') setCaptureQuality(result.quality);

      const qualityText = result.quality ? `Quality: ${result.quality}%` : "";
      toast.success(`${fingerName} captured successfully! ${qualityText}`, {
        description: "Biometric data has been securely captured"
      });

      onCaptureSuccess(
        result.pidData || '',
        result.quality || 0,
        processedImage || undefined
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      console.error('❌ Capture error:', error);
      toast.error(`Failed to capture ${fingerName}: ${errorMessage}`);
      onCaptureError(errorMessage);
    } finally {
      setIsCapturing(false);
      onCaptureEnd?.();
    }
  }, [isAvailable, fingerName, captureFingerprint, onCaptureSuccess, onCaptureError, onCaptureStart, onCaptureEnd, toDataUri, enhanceImageQuality]);

  const handleDownloadPidData = useCallback(() => {
    if (!pidData) return;
    
    const blob = new Blob([pidData], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fingerName}_piddata.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pidData, fingerName]);

  const getStatusColor = () => {
    if (isChecking) return "bg-yellow-500";
    return isAvailable ? "bg-green-500" : "bg-red-500";
  };

  const getStatusBadge = () => {
    if (isChecking) return <Badge variant="secondary">Checking...</Badge>;
    if (isAvailable) return <Badge className="bg-green-500 text-white">Connected</Badge>;
    return <Badge variant="destructive">Disconnected</Badge>;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{fingerName}</span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Fingerprint Display */}
        <FingerprintDisplay 
          value={capturedImage}
          imageData={capturedImage}
          index={index}
          quality={captureQuality}
          isCapturing={isCapturing}
          showQuality={true}
        />

        {/* Status Information */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {isAvailable ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
            <span className="text-gray-600">RD Service</span>
          </div>
          
          {captureQuality && (
            <Badge variant={captureQuality >= 70 ? "default" : "secondary"}>
              Quality: {captureQuality}%
            </Badge>
          )}
        </div>

        {/* Device Information */}
        {deviceInfo && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <div className="flex items-center space-x-1">
              <Info className="h-3 w-3" />
              <span>Device: {deviceInfo.dpId || 'Unknown'}</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && !isAvailable && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <div>{error}</div>
                {retryCount > 0 && (
                  <div className="text-xs mt-1">
                    Retry attempts: {retryCount}
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetConnection}
                disabled={isChecking}
              >
                <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Instructions */}
        {!isAvailable && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">RD Service Setup Required:</p>
                <ul className="text-sm space-y-1">
                  <li>1. Install RD Service from your device manufacturer</li>
                  <li>2. Ensure service is running on port 11100</li>
                  <li>3. Connect your fingerprint device</li>
                  <li>4. Click the refresh button to retry</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
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
                : 'Service Not Available'
            }
          </Button>

          {/* Download PID Data Button */}
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

        {/* Success Status */}
        {capturedImage && pidData && (
          <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2 rounded">
            <CheckCircle className="h-4 w-4" />
            <span>UIDAI compliant biometric data captured</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
