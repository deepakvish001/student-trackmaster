
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FingerprintDisplay } from "./FingerprintDisplay";
import { 
  monitorDeviceStatus, 
  checkDeviceConnectionHealth, 
  captureWithAutoQuality,
  MFS100DeviceStatus,
  CaptureResult
} from "@/utils/mfs100Enhanced";
import { initializeMFS100 } from "@/utils/mfs100Native";

interface EnhancedMFS100CaptureProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
  onImageChange?: (imageData: string) => void;
  targetQuality?: number;
}

export function EnhancedMFS100Capture({ 
  index, 
  value, 
  onChange, 
  onImageChange,
  targetQuality = 70
}: EnhancedMFS100CaptureProps) {
  const [deviceStatus, setDeviceStatus] = useState<MFS100DeviceStatus>({
    isConnected: false,
    deviceInfo: null,
    lastChecked: new Date(),
    connectionQuality: 'disconnected'
  });
  
  const [captureState, setCaptureState] = useState<{
    isCapturing: boolean;
    currentStep: string;
    progress: number;
    attempt: number;
    maxAttempts: number;
  }>({
    isCapturing: false,
    currentStep: '',
    progress: 0,
    attempt: 0,
    maxAttempts: 3
  });
  
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [lastQuality, setLastQuality] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Real-time device monitoring (every 2 seconds)
  useEffect(() => {
    const monitorDevice = async () => {
      const status = await checkDeviceConnectionHealth();
      setDeviceStatus(status);
    };

    // Initial check
    monitorDevice();
    
    // Set up interval for continuous monitoring
    const interval = setInterval(monitorDevice, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Initialize MFS100 SDK on component mount
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      const initialized = await initializeMFS100();
      if (initialized) {
        await checkDeviceConnectionHealth();
        toast.success("MFS100 SDK initialized successfully");
      } else {
        toast.error("Failed to initialize MFS100 SDK");
      }
      setIsInitializing(false);
    };

    initialize();
  }, []);

  const handleProgressUpdate = useCallback((status: string, attempt?: number) => {
    setCaptureState(prev => ({
      ...prev,
      currentStep: status,
      attempt: attempt || prev.attempt,
      progress: attempt ? (attempt / prev.maxAttempts) * 100 : prev.progress
    }));
  }, []);

  const handleRealTimeCapture = async () => {
    if (!deviceStatus.isConnected) {
      toast.error("MFS100 device not connected. Please check connection.");
      return;
    }

    try {
      setCaptureState({
        isCapturing: true,
        currentStep: 'Preparing device...',
        progress: 10,
        attempt: 0,
        maxAttempts: 3
      });

      toast.info(`Place finger ${index + 1} on the MFS100 scanner when red light activates`, {
        duration: 4000,
      });

      const result: CaptureResult = await captureWithAutoQuality(
        targetQuality,
        3,
        handleProgressUpdate
      );

      if (result.success) {
        // Save template
        if (result.template) {
          onChange(result.template);
        }

        // Save and display image
        if (result.imageData) {
          setCapturedImage(result.imageData);
          onImageChange?.(result.imageData);
        }

        setLastQuality(result.quality || null);

        toast.success(
          `Finger ${index + 1} captured successfully! Quality: ${result.quality}%`, 
          { duration: 4000 }
        );

        setCaptureState(prev => ({
          ...prev,
          currentStep: 'Capture completed!',
          progress: 100
        }));

      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Real-time capture error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      toast.error(errorMessage, { duration: 5000 });
      
      setCaptureState(prev => ({
        ...prev,
        currentStep: 'Capture failed',
        progress: 0
      }));
    } finally {
      setTimeout(() => {
        setCaptureState(prev => ({
          ...prev,
          isCapturing: false,
          currentStep: '',
          progress: 0,
          attempt: 0
        }));
      }, 2000);
    }
  };

  const getConnectionStatusColor = () => {
    switch (deviceStatus.connectionQuality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'poor': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const getQualityBadgeVariant = (quality: number | null) => {
    if (!quality) return 'secondary';
    if (quality >= 80) return 'default';
    if (quality >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="flex flex-col items-center space-y-4 animate-fade-in">
      {/* Enhanced Fingerprint Display */}
      <div className="relative">
        <FingerprintDisplay 
          value={capturedImage || value}
          index={index}
          quality={lastQuality}
          isCapturing={captureState.isCapturing}
          showQuality={true}
        />
        
        {/* Real-time capture overlay */}
        {captureState.isCapturing && (
          <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
            <div className="bg-white p-3 rounded-lg shadow-lg text-center">
              <div className="flex items-center space-x-2 mb-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm font-medium">Capturing...</span>
              </div>
              {captureState.progress > 0 && (
                <Progress value={captureState.progress} className="w-32 h-2" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Real-time Device Status with Enhanced UI */}
      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {deviceStatus.isConnected ? (
              <div className="flex items-center space-x-1">
                <Wifi className="h-4 w-4 text-green-500" />
                <div className={`w-2 h-2 rounded-full animate-pulse ${getConnectionStatusColor()}`}></div>
              </div>
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </div>
          
          <Badge variant={deviceStatus.isConnected ? "default" : "destructive"}>
            {deviceStatus.isConnected ? 'MFS100 Connected' : 'Disconnected'}
          </Badge>
          
          {lastQuality && (
            <Badge variant={getQualityBadgeVariant(lastQuality)}>
              Quality: {lastQuality}%
            </Badge>
          )}
        </div>

        {/* Device Info */}
        {deviceStatus.deviceInfo && (
          <div className="text-xs text-center text-gray-600">
            <div>{deviceStatus.deviceInfo.Make} {deviceStatus.deviceInfo.Model}</div>
            {deviceStatus.deviceInfo.SerialNo && (
              <div>S/N: {deviceStatus.deviceInfo.SerialNo}</div>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isInitializing && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Initializing MFS100 SDK and checking device connection...
          </AlertDescription>
        </Alert>
      )}

      {/* Capture Progress */}
      {captureState.isCapturing && captureState.currentStep && (
        <div className="w-full text-center space-y-2">
          <div className="text-sm text-gray-600">{captureState.currentStep}</div>
          {captureState.attempt > 0 && (
            <div className="text-xs text-gray-500">
              Attempt {captureState.attempt} of {captureState.maxAttempts}
            </div>
          )}
        </div>
      )}

      {/* Enhanced Capture Button */}
      <Button
        type="button"
        onClick={handleRealTimeCapture}
        disabled={captureState.isCapturing || !deviceStatus.isConnected || isInitializing}
        className={`w-full transition-all duration-300 rounded-md ${
          captureState.isCapturing 
            ? 'bg-blue-500 hover:bg-blue-600 animate-pulse cursor-wait' 
            : deviceStatus.isConnected 
              ? 'bg-primary hover:bg-primary/90' 
              : 'bg-gray-400 cursor-not-allowed'
        }`}
        size="lg"
      >
        <Fingerprint className="mr-2 h-5 w-5" />
        {captureState.isCapturing 
          ? `Capturing Finger ${index + 1}...` 
          : deviceStatus.isConnected 
            ? `Capture Finger ${index + 1} (Real-time)` 
            : 'Connect Device First'
        }
      </Button>

      {/* Status Messages */}
      {!deviceStatus.isConnected && !isInitializing && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            MFS100 device not detected. Please connect your device and refresh.
          </AlertDescription>
        </Alert>
      )}

      {value && capturedImage && (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Fingerprint captured and saved</span>
        </div>
      )}
    </div>
  );
}
