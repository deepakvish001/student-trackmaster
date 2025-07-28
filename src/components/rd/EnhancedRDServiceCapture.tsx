
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fingerprint, Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw, Download, Info, Settings } from "lucide-react";
import { toast } from "sonner";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { useRDService } from "@/hooks/useRDService";

interface EnhancedRDServiceCaptureProps {
  index: number;
  onCaptureSuccess: (pidData: string, quality: number, imageData?: string) => void;
  onCaptureError: (error: string) => void;
  disabled?: boolean;
  fingerName?: string;
  targetQuality?: number;
}

export function EnhancedRDServiceCapture({ 
  index, 
  onCaptureSuccess,
  onCaptureError,
  disabled = false,
  fingerName = `Finger ${index + 1}`,
  targetQuality = 60
}: EnhancedRDServiceCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [pidData, setPidData] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string>("");
  
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

  // Enhanced image processing from RD Service bitmap data
  const processRDServiceImage = useCallback((imageData: string): string => {
    try {
      if (!imageData || imageData.trim().length === 0) {
        console.warn('No image data provided from RD Service');
        return "";
      }

      console.log(`Processing RD Service image data for ${fingerName}:`, {
        dataLength: imageData.length,
        dataPreview: imageData.substring(0, 100)
      });

      // RD Service typically returns base64 encoded image data
      // Check if it's already a valid data URI
      if (imageData.startsWith('data:image/')) {
        console.log('✅ Image data is already in data URI format');
        return imageData;
      }

      // If it's raw base64, convert to data URI
      let processedImage = '';
      if (imageData.match(/^[A-Za-z0-9+/=]+$/)) {
        processedImage = `data:image/png;base64,${imageData}`;
        console.log('✅ Converted base64 to data URI format');
      } else {
        // Try to extract base64 data if it's embedded in XML or other format
        const base64Match = imageData.match(/(?:data:image\/[^;]+;base64,)?([A-Za-z0-9+/=]+)/);
        if (base64Match && base64Match[1]) {
          processedImage = `data:image/png;base64,${base64Match[1]}`;
          console.log('✅ Extracted and converted base64 from embedded data');
        }
      }

      if (processedImage) {
        console.log(`✅ RD Service image processed successfully for ${fingerName}`);
        return processedImage;
      } else {
        console.error('❌ Unable to process RD Service image data');
        return "";
      }

    } catch (error) {
      console.error('❌ RD Service image processing error:', error);
      return "";
    }
  }, [fingerName]);

  const handleCapture = useCallback(async () => {
    if (!isAvailable) {
      const errorMsg = "RD Service is not available. Please check your connection and try again.";
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

      console.log(`🔄 Starting fingerprint capture for ${fingerName}...`);

      const result = await captureFingerprint(15000); // 15 second timeout
      
      console.log(`📋 Capture result for ${fingerName}:`, {
        errCode: result.errCode,
        errInfo: result.errInfo,
        hasImageData: !!result.imageData,
        hasPidData: !!result.pidData,
        quality: result.quality
      });

      // Check if capture was successful
      if (result.errCode !== "0") {
        throw new Error(result.errInfo || "Fingerprint capture failed");
      }

      // Store the PID data (encrypted biometric data)
      if (result.pidData) {
        setPidData(result.pidData);
      } else {
        throw new Error("No PID data received from RD Service");
      }

      // Process and store the image data
      let processedImageData = "";
      if (result.imageData) {
        processedImageData = processRDServiceImage(result.imageData);
        if (processedImageData) {
          setCapturedImage(processedImageData);
        } else {
          console.warn('⚠️ Image processing failed but PID data is available');
        }
      } else {
        console.warn('⚠️ No image data received from RD Service');
      }

      // Store quality
      if (result.quality !== undefined) {
        setCaptureQuality(result.quality);
      }

      const qualityText = result.quality ? `Quality: ${result.quality}%` : "";
      const qualityIcon = (result.quality && result.quality >= 60) ? "✅" : "⚠️";
      
      toast.success(`${qualityIcon} ${fingerName} captured successfully! ${qualityText}`, {
        description: "Biometric data has been securely captured and processed"
      });

      console.log(`✅ ${fingerName} capture completed:`, {
        quality: result.quality,
        hasProcessedImage: !!processedImageData,
        hasPidData: !!result.pidData,
        pidDataLength: result.pidData?.length || 0,
        imageDataLength: processedImageData.length
      });

      // Call the success callback
      onCaptureSuccess(
        result.pidData || '',
        result.quality || 0,
        processedImageData
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      console.error(`❌ Capture error for ${fingerName}:`, error);
      setLastError(errorMessage);
      toast.error(`Failed to capture ${fingerName}: ${errorMessage}`, {
        duration: 8000,
        description: "Please ensure the RD Service is running and scanner is connected"
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

  const handleTestConnection = useCallback(async () => {
    toast.info("Testing RD Service connection...");
    await checkAvailability();
  }, [checkAvailability]);

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
    <Card className="w-full max-w-md mx-auto border-2 hover:border-primary/50 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Fingerprint className="h-5 w-5" />
            <span>{fingerName}</span>
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Enhanced Fingerprint Display */}
        <div className="relative">
          <FingerprintDisplay 
            value={capturedImage}
            imageData={capturedImage}
            index={index}
            quality={captureQuality}
            isCapturing={isCapturing}
            showQuality={true}
          />
          
          {/* Capture Status Overlay */}
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
            <Badge variant={captureQuality >= 70 ? "default" : captureQuality >= 60 ? "secondary" : "destructive"}>
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
            {deviceInfo.rdsVer && (
              <div className="mt-1">Version: {deviceInfo.rdsVer}</div>
            )}
          </div>
        )}

        {/* Error Display */}
        {(error || lastError) && !isAvailable && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div className="space-y-1">
                <div>{error || lastError}</div>
                {retryCount > 0 && (
                  <div className="text-xs">
                    Retry attempts: {retryCount}
                  </div>
                )}
              </div>
              <div className="flex space-x-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleTestConnection}
                  disabled={isChecking}
                  title="Test connection"
                >
                  <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetConnection}
                  disabled={isChecking}
                  title="Reset connection"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
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
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Install RD Service from device manufacturer</li>
                  <li>Connect your fingerprint scanner via USB</li>
                  <li>Start the RD Service (usually runs on port 11100)</li>
                  <li>Click the refresh button to test connection</li>
                </ol>
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ RD Service must be running on the same machine as your browser
                </p>
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
                : 'RD Service Not Available'
            }
          </Button>

          {/* Additional Actions */}
          <div className="flex space-x-2">
            {pidData && (
              <Button
                onClick={handleDownloadPidData}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Download PID
              </Button>
            )}
            
            <Button
              onClick={handleTestConnection}
              variant="outline"
              className="flex-1"
              size="sm"
              disabled={isChecking}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
          </div>
        </div>

        {/* Success Status */}
        {capturedImage && pidData && (
          <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2 rounded">
            <CheckCircle className="h-4 w-4" />
            <span>UIDAI compliant biometric data captured successfully</span>
          </div>
        )}

        {/* Debug Information (in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
            <div>PID Data: {pidData ? `${pidData.length} chars` : 'None'}</div>
            <div>Image Data: {capturedImage ? `${capturedImage.length} chars` : 'None'}</div>
            <div>Last Error: {lastError || 'None'}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
