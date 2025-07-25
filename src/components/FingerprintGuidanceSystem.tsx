
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Hand, ArrowRight, RotateCcw, Eye } from "lucide-react";
import { EnhancedMFS100Capture } from "./EnhancedMFS100Capture";

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

  const fingerNames = [
    "Right Thumb",
    "Right Index",
    "Right Middle", 
    "Left Index",
    "Left Thumb"
  ];

  const handleFingerprintCaptured = (index: number, value: string) => {
    console.log(`Fingerprint ${index + 1} captured:`, value ? 'data received' : 'no data');
    onFingerprintChange(index, value);
  };

  const handleImageCaptured = (index: number, imageData: string) => {
    console.log(`Fingerprint image ${index + 1} captured:`, imageData ? 'image received' : 'no image');
    onImageChange?.(index, imageData);
  };

  const handleFingerAccepted = (index: number) => {
    console.log(`Finger ${index + 1} accepted, advancing to next...`);
    
    // Mark finger as accepted
    const newAccepted = [...acceptedFingers];
    newAccepted[index] = true;
    setAcceptedFingers(newAccepted);
    
    // Find next unaccepted finger
    const nextUnacceptedIndex = newAccepted.findIndex((accepted, i) => !accepted);
    
    if (nextUnacceptedIndex !== -1) {
      console.log(`Moving to finger ${nextUnacceptedIndex + 1}`);
      setCurrentFinger(nextUnacceptedIndex);
    } else {
      console.log('All fingerprints captured and accepted!');
      // All fingers are accepted, stay on current or move to first for review
      // setCurrentFinger(0);
    }
  };

  const getProgressPercentage = () => {
    return (acceptedFingers.filter(Boolean).length / 5) * 100;
  };

  const resetCapture = () => {
    console.log('Resetting capture system...');
    setCurrentFinger(0);
    setAcceptedFingers([false, false, false, false, false]);
    
    // Clear all fingerprints
    for (let i = 0; i < 5; i++) {
      onFingerprintChange(i, "");
      onImageChange?.(i, "");
    }
  };

  const getFingerStatus = (index: number) => {
    if (acceptedFingers[index]) return 'accepted';
    if (currentFinger === index) return 'current';
    if (fingerprints[index]) return 'captured';
    return 'pending';
  };

  const handleFingerClick = (index: number) => {
    // Allow switching to any finger except already accepted ones for recapture
    if (!acceptedFingers[index]) {
      console.log(`Manually switching to finger ${index + 1}`);
      setCurrentFinger(index);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Hand className="h-5 w-5" />
              <span>Fingerprint Capture Progress</span>
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetCapture}
              disabled={acceptedFingers.every(accepted => !accepted)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Progress value={getProgressPercentage()} className="flex-1" />
            <Badge variant={getProgressPercentage() === 100 ? "default" : "secondary"}>
              {acceptedFingers.filter(Boolean).length}/5 Accepted
            </Badge>
          </div>
          
          {/* Finger Status Grid */}
          <div className="grid grid-cols-5 gap-2">
            {fingerNames.map((name, index) => {
              const status = getFingerStatus(index);
              return (
                <div 
                  key={index}
                  className={`text-center p-2 rounded-lg border-2 transition-all cursor-pointer ${
                    status === 'current'
                      ? 'border-primary bg-primary/10' 
                      : status === 'accepted'
                        ? 'border-green-500 bg-green-50'
                        : status === 'captured'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleFingerClick(index)}
                >
                  <div className="flex justify-center mb-1">
                    {status === 'accepted' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : status === 'captured' ? (
                      <Eye className="h-5 w-5 text-blue-500" />
                    ) : status === 'current' ? (
                      <Circle className="h-5 w-5 text-primary animate-pulse" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="text-xs font-medium">{name}</div>
                  {status === 'captured' && !acceptedFingers[index] && (
                    <div className="text-xs text-blue-600 mt-1">Review</div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Finger Capture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {acceptedFingers[currentFinger] ? 'Completed: ' : 'Capture: '}
              {fingerNames[currentFinger]}
            </span>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Step {currentFinger + 1} of 5</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <EnhancedMFS100Capture
              key={`finger-${currentFinger}-${acceptedFingers[currentFinger] ? 'accepted' : 'active'}`}
              index={currentFinger}
              value={fingerprints[currentFinger]}
              onChange={(value) => handleFingerprintCaptured(currentFinger, value)}
              onImageChange={(imageData) => handleImageCaptured(currentFinger, imageData)}
              onAccepted={() => handleFingerAccepted(currentFinger)}
              targetQuality={targetQuality}
              fingerName={fingerNames[currentFinger]}
            />
          </div>
          
          {/* Enhanced Instructions */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Enhanced Capture Process:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Ensure the MFS100 device is connected and service is running</li>
              <li>2. Click "Capture" to activate scanner and place your <strong>{fingerNames[currentFinger]}</strong></li>
              <li>3. <strong>Preview & Review:</strong> Check the captured fingerprint quality</li>
              <li>4. Choose "Accept & Continue" if satisfied, or "Recapture" to try again</li>
              <li>5. System automatically advances to next finger after acceptance</li>
            </ol>
            
            {!acceptedFingers[currentFinger] && fingerprints[currentFinger] && (
              <div className="mt-3 p-2 bg-blue-100 rounded text-sm font-medium text-blue-900">
                💡 Fingerprint captured! Please review and accept to continue to the next finger.
              </div>
            )}
            
            {acceptedFingers[currentFinger] && (
              <div className="mt-3 p-2 bg-green-100 rounded text-sm font-medium text-green-900">
                ✅ {fingerNames[currentFinger]} accepted! Click on other fingers to switch or continue.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completion Status */}
      {getProgressPercentage() === 100 && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold text-green-800">
                All Fingerprints Captured & Accepted Successfully!
              </h3>
              <p className="text-green-700">
                All 5 fingerprints have been captured, reviewed, and accepted. You can now save the student registration.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

Now let me also update the EnhancedMFS100Capture component to properly reset its state when switching between fingers:

<lov-write file_path="src/components/EnhancedMFS100Capture.tsx">
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FingerprintDisplay } from "./FingerprintDisplay";
import { FingerprintPreview } from "./FingerprintPreview";
import { useFingerprintCaptureState } from "@/hooks/useFingerprintCaptureState";
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
  onAccepted?: () => void;
  targetQuality?: number;
  fingerName: string;
}

export function EnhancedMFS100Capture({ 
  index, 
  value, 
  onChange, 
  onImageChange,
  onAccepted,
  targetQuality = 70,
  fingerName
}: EnhancedMFS100CaptureProps) {
  const [deviceStatus, setDeviceStatus] = useState<MFS100DeviceStatus>({
    isConnected: false,
    deviceInfo: null,
    lastChecked: new Date(),
    connectionQuality: 'disconnected'
  });
  
  const [captureProgress, setCaptureProgress] = useState<{
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
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string>("");

  const {
    captureState,
    captureData,
    startCapture,
    showPreview,
    acceptCapture,
    resetCapture
  } = useFingerprintCaptureState();

  // Reset capture state when finger index changes or when component mounts
  useEffect(() => {
    console.log(`EnhancedMFS100Capture mounted/updated for finger ${index + 1} (${fingerName})`);
    resetCapture();
  }, [index, fingerName, resetCapture]);

  // Real-time device monitoring
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const monitorDevice = async () => {
      try {
        const status = await checkDeviceConnectionHealth();
        setDeviceStatus(status);
      } catch (error) {
        console.error('Device monitoring error:', error);
        setDeviceStatus(prev => ({
          ...prev,
          isConnected: false,
          connectionQuality: 'disconnected',
          error: 'Monitoring failed'
        }));
      }
    };

    monitorDevice();
    interval = setInterval(monitorDevice, 5000);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Initialize MFS100 SDK
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      setInitError("");
      
      try {
        console.log('Initializing MFS100 SDK...');
        const initialized = await initializeMFS100();
        
        if (initialized) {
          console.log('MFS100 SDK initialized successfully');
          await checkDeviceConnectionHealth();
          toast.success("MFS100 SDK initialized successfully");
        } else {
          const error = "Failed to initialize MFS100 SDK. Please check if the device is connected and drivers are installed.";
          setInitError(error);
          console.error(error);
          toast.error(error);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
        setInitError(errorMessage);
        console.error('Initialization error:', error);
        toast.error(`Initialization failed: ${errorMessage}`);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  const handleProgressUpdate = useCallback((status: string, attempt?: number) => {
    setCaptureProgress(prev => ({
      ...prev,
      currentStep: status,
      attempt: attempt || prev.attempt,
      progress: attempt ? (attempt / prev.maxAttempts) * 100 : prev.progress
    }));
  }, []);

  const handleCapture = async () => {
    if (!deviceStatus.isConnected) {
      toast.error(`Device not connected: ${deviceStatus.error || 'Please check MFS100 connection'}`);
      return;
    }

    try {
      console.log(`Starting capture for ${fingerName} (index ${index})`);
      startCapture();
      setCaptureProgress({
        isCapturing: true,
        currentStep: 'Preparing device...',
        progress: 10,
        attempt: 0,
        maxAttempts: 3
      });

      toast.info(`Place ${fingerName} on the MFS100 scanner when red light activates`, {
        duration: 4000,
      });

      const result: CaptureResult = await captureWithAutoQuality(
        targetQuality,
        3,
        handleProgressUpdate
      );

      if (result.success) {
        console.log(`${fingerName} captured successfully:`, {
          hasTemplate: !!result.template,
          hasImage: !!result.imageData,
          quality: result.quality
        });

        // Show preview instead of immediately saving
        showPreview({
          template: result.template || '',
          imageData: result.imageData || '',
          quality: result.quality || null
        });

        toast.success(`${fingerName} captured! Please review and accept or recapture.`);

        setCaptureProgress(prev => ({
          ...prev,
          currentStep: 'Capture completed! Please review.',
          progress: 100
        }));

      } else {
        throw new Error(result.error || 'Capture failed');
      }

    } catch (error) {
      console.error(`Capture error for ${fingerName}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      toast.error(errorMessage, { duration: 5000 });
      
      resetCapture();
      setCaptureProgress(prev => ({
        ...prev,
        currentStep: 'Capture failed',
        progress: 0
      }));
    } finally {
      setTimeout(() => {
        setCaptureProgress(prev => ({
          ...prev,
          isCapturing: false,
          currentStep: '',
          progress: 0,
          attempt: 0
        }));
      }, 2000);
    }
  };

  const handleAcceptCapture = () => {
    if (!captureData) {
      console.warn('No capture data to accept');
      return;
    }

    console.log(`Accepting ${fingerName} capture:`, {
      templateLength: captureData.template.length,
      hasImage: !!captureData.imageData,
      quality: captureData.quality
    });

    // Save the captured data
    onChange(captureData.template);
    onImageChange?.(captureData.imageData);
    
    acceptCapture();
    onAccepted?.();
    
    toast.success(`${fingerName} accepted and saved!`);
  };

  const handleRecapture = () => {
    console.log(`Recapturing ${fingerName}...`);
    resetCapture();
    toast.info(`Ready to recapture ${fingerName}`);
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

  // Show preview if in previewing state
  if (captureState === 'previewing' && captureData) {
    return (
      <FingerprintPreview
        fingerIndex={index}
        imageData={captureData.imageData}
        quality={captureData.quality}
        onAccept={handleAcceptCapture}
        onRecapture={handleRecapture}
        fingerName={fingerName}
      />
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 animate-fade-in">
      {/* Fingerprint Display */}
      <div className="relative">
        <FingerprintDisplay 
          value={captureState === 'accepted' ? (captureData?.imageData || value) : ''}
          index={index}
          quality={captureState === 'accepted' ? captureData?.quality || null : null}
          isCapturing={captureState === 'capturing'}
          showQuality={true}
        />
        
        {/* Capturing overlay */}
        {captureState === 'capturing' && (
          <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
            <div className="bg-white p-3 rounded-lg shadow-lg text-center">
              <div className="flex items-center space-x-2 mb-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm font-medium">Capturing...</span>
              </div>
              {captureProgress.progress > 0 && (
                <Progress value={captureProgress.progress} className="w-32 h-2" />
              )}
            </div>
          </div>
        )}

        {/* Accepted indicator */}
        {captureState === 'accepted' && (
          <div className="absolute -top-2 -right-2">
            <div className="bg-green-500 text-white rounded-full p-1 animate-bounce">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>

      {/* Device Status */}
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
          
          {captureState === 'accepted' && captureData?.quality && (
            <Badge variant={getQualityBadgeVariant(captureData.quality)}>
              Quality: {captureData.quality}%
            </Badge>
          )}
        </div>

        {deviceStatus.deviceInfo && (
          <div className="text-xs text-center text-gray-600">
            <div>{deviceStatus.deviceInfo.Make} {deviceStatus.deviceInfo.Model}</div>
            {deviceStatus.deviceInfo.SerialNo && (
              <div>S/N: {deviceStatus.deviceInfo.SerialNo}</div>
            )}
          </div>
        )}
      </div>

      {/* Initialization Error */}
      {initError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {initError}
          </AlertDescription>
        </Alert>
      )}

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
      {captureProgress.isCapturing && captureProgress.currentStep && (
        <div className="w-full text-center space-y-2">
          <div className="text-sm text-gray-600">{captureProgress.currentStep}</div>
          {captureProgress.attempt > 0 && (
            <div className="text-xs text-gray-500">
              Attempt {captureProgress.attempt} of {captureProgress.maxAttempts}
            </div>
          )}
        </div>
      )}

      {/* Capture Button */}
      <Button
        type="button"
        onClick={handleCapture}
        disabled={captureState === 'capturing' || captureState === 'accepted' || !deviceStatus.isConnected || isInitializing}
        className={`w-full transition-all duration-300 rounded-md ${
          captureState === 'capturing' 
            ? 'bg-blue-500 hover:bg-blue-600 animate-pulse cursor-wait' 
            : captureState === 'accepted'
              ? 'bg-green-500 hover:bg-green-600'
            : deviceStatus.isConnected 
              ? 'bg-primary hover:bg-primary/90' 
              : 'bg-gray-400 cursor-not-allowed'
        }`}
        size="lg"
      >
        <Fingerprint className="mr-2 h-5 w-5" />
        {captureState === 'capturing' 
          ? `Capturing ${fingerName}...` 
          : captureState === 'accepted'
            ? `${fingerName} Accepted ✓`
          : deviceStatus.isConnected 
            ? `Capture ${fingerName}` 
            : 'Connect Device First'
        }
      </Button>

      {/* Device Connection Error */}
      {!deviceStatus.isConnected && !isInitializing && deviceStatus.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {deviceStatus.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Success Status */}
      {captureState === 'accepted' && (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Fingerprint captured and saved</span>
        </div>
      )}
    </div>
  );
}
```
