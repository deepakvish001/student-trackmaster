
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, CheckCircle, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { usePersistentMFS100 } from "@/hooks/usePersistentMFS100";

interface SuperFastFingerprintCaptureProps {
  fingerprints: string[];
  images: string[];
  onFingerprintChange: (index: number, value: string) => void;
  onImageChange: (index: number, imageData: string) => void;
  targetQuality?: number;
}

export function SuperFastFingerprintCapture({ 
  fingerprints, 
  images,
  onFingerprintChange, 
  onImageChange,
  targetQuality = 60
}: SuperFastFingerprintCaptureProps) {
  const [capturingIndex, setCapturingIndex] = useState<number | null>(null);
  const [captureQualities, setCaptureQualities] = useState<(number | null)[]>([null, null, null, null, null]);
  
  const {
    isConnected,
    isInitialized,
    error,
    isCapturing,
    initializeDevice,
    captureFingerprint,
    resetConnection
  } = usePersistentMFS100();

  const fingerNames = [
    "Right Thumb",
    "Right Index", 
    "Right Middle",
    "Left Index",
    "Left Thumb"
  ];

  // Initialize device on component mount
  const handleInitialize = useCallback(async () => {
    if (!isInitialized) {
      console.log('🚀 Initializing MFS100 device for super-fast capture...');
      toast.info("Connecting to MFS100 device...", { duration: 2000 });
      
      const success = await initializeDevice();
      if (success) {
        toast.success("Device ready! Start capturing fingerprints.");
      } else {
        toast.error("Device not available. Check connection.");
      }
    }
  }, [isInitialized, initializeDevice]);

  // Super fast capture handler
  const handleCapture = useCallback(async (fingerIndex: number) => {
    if (!isConnected || !isInitialized) {
      toast.error("Device not ready. Please initialize first.");
      return;
    }

    if (capturingIndex !== null) {
      toast.warning("Another finger capture is in progress. Please wait.");
      return;
    }

    try {
      setCapturingIndex(fingerIndex);
      
      const fingerName = fingerNames[fingerIndex];
      toast.info(`Place ${fingerName} on scanner`, { 
        duration: 3000,
        description: "Keep finger steady until capture completes"
      });
      
      console.log(`🎯 Starting super-fast capture for ${fingerName}...`);
      
      const result = await captureFingerprint(targetQuality, 15);
      
      if (result.success && result.imageData) {
        // Update fingerprint data
        onFingerprintChange(fingerIndex, result.template);
        onImageChange(fingerIndex, result.imageData);
        
        // Update quality
        setCaptureQualities(prev => {
          const updated = [...prev];
          updated[fingerIndex] = result.quality;
          return updated;
        });

        console.log(`✅ ${fingerName} captured successfully! Quality: ${result.quality}%`);
        toast.success(`${fingerName} captured! Quality: ${result.quality}%`);
        
      } else {
        throw new Error(result.message || "Capture failed");
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      console.error(`❌ ${fingerNames[fingerIndex]} capture error:`, errorMessage);
      toast.error(errorMessage);
    } finally {
      setCapturingIndex(null);
    }
  }, [
    isConnected, 
    isInitialized, 
    capturingIndex, 
    targetQuality, 
    captureFingerprint, 
    onFingerprintChange, 
    onImageChange, 
    fingerNames
  ]);

  const getStatusColor = () => {
    if (error) return "bg-red-500";
    return isConnected ? "bg-green-500" : "bg-yellow-500";
  };

  const getConnectionStatus = () => {
    if (error) return "Error";
    if (!isInitialized) return "Not Initialized";
    return isConnected ? "Ready" : "Connecting";
  };

  return (
    <div className="space-y-6">
      {/* Device Status */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
                <span>MFS100 Device Status</span>
              </div>
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            </span>
            
            <Badge variant={isConnected ? "default" : "secondary"}>
              {getConnectionStatus()}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {!isInitialized ? (
            <div className="text-center space-y-4">
              <p className="text-gray-600">Device not initialized. Click to connect.</p>
              <Button 
                onClick={handleInitialize} 
                disabled={isCapturing}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Wifi className="mr-2 h-4 w-4" />
                Initialize Device
              </Button>
            </div>
          ) : error ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
              <Button 
                onClick={resetConnection} 
                variant="outline"
                className="border-red-300 text-red-700"
              >
                Reset Connection
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Device ready for super-fast capture!</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fingerprint Capture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {fingerNames.map((name, index) => {
          const isCurrentlyCapturing = capturingIndex === index;
          const hasFingerprint = !!fingerprints[index] && !!images[index];
          const quality = captureQualities[index];
          
          return (
            <Card key={index} className={`transition-all duration-300 ${
              isCurrentlyCapturing 
                ? 'border-blue-500 shadow-lg scale-105 bg-blue-50' 
                : hasFingerprint
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:shadow-md'
            }`}>
              <CardHeader className="text-center pb-3">
                <CardTitle className="text-sm font-semibold">
                  Finger {index + 1}
                </CardTitle>
                <p className="text-xs text-gray-600">{name}</p>
                {quality && (
                  <Badge variant={quality >= 70 ? "default" : "secondary"} className="text-xs">
                    Quality: {quality}%
                  </Badge>
                )}
              </CardHeader>
              
              <CardContent className="text-center space-y-3">
                {/* Image preview */}
                <div className={`mx-auto w-20 h-24 border-2 rounded-lg flex items-center justify-center ${
                  isCurrentlyCapturing 
                    ? 'border-blue-500 border-dashed animate-pulse' 
                    : hasFingerprint
                      ? 'border-green-500'
                      : 'border-gray-300'
                }`}>
                  {images[index] ? (
                    <img 
                      src={images[index]} 
                      alt={`${name} fingerprint`}
                      className="w-full h-full object-contain rounded"
                    />
                  ) : (
                    <Fingerprint className={`h-6 w-6 ${
                      isCurrentlyCapturing ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                  )}
                </div>

                {/* Capture button */}
                <Button
                  size="sm"
                  onClick={() => handleCapture(index)}
                  disabled={!isConnected || !isInitialized || capturingIndex !== null}
                  className={`w-full text-xs ${
                    isCurrentlyCapturing 
                      ? 'bg-blue-500 hover:bg-blue-600 animate-pulse' 
                      : hasFingerprint
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  <Fingerprint className="mr-1 h-3 w-3" />
                  {isCurrentlyCapturing 
                    ? 'Capturing...' 
                    : hasFingerprint 
                      ? 'Recapture' 
                      : 'Capture'
                  }
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Capture Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="flex justify-center space-x-2 mb-2">
              {fingerprints.map((fp, index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full ${
                    fp ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-600">
              {fingerprints.filter(Boolean).length} of 5 fingerprints captured
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
