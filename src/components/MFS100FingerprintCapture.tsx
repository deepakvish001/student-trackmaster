
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, Info, AlertCircle, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  isMFS100Available, 
  initializeMFS100, 
  captureFingerprint, 
  verifyFingerprints,
  getDeviceInfo
} from "@/utils/mfs100Native";

interface MFS100FingerprintCaptureProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
}

export function MFS100FingerprintCapture({ index, value, onChange }: MFS100FingerprintCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [lastError, setLastError] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    const loadSDK = async () => {
      setIsInitializing(true);
      const initialized = await initializeMFS100();
      setSdkLoaded(initialized);
      if (initialized) {
        fetchDeviceInfo();
      } else {
        setLastError("Failed to load MFS100 SDK. Please make sure the device is connected and try again.");
      }
      setIsInitializing(false);
    };

    loadSDK();
  }, []);

  const fetchDeviceInfo = async () => {
    const info = await getDeviceInfo();
    if (info) {
      setDeviceInfo(info);
      toast.success("MFS100 device detected");
    } else {
      setLastError("Could not get device information. Make sure the device is properly connected.");
    }
  };

  const handleCaptureFingerprint = async () => {
    try {
      if (!sdkLoaded) {
        toast.error("MFS100 SDK not loaded. Please refresh the page and try again.");
        return;
      }

      setIsCapturing(true);
      setLastError("");
      setCaptureQuality(null);
      
      toast.info("Place your finger on the scanner");
      
      const result = await captureFingerprint(60, 10);
      
      if (!result.httpStaus || result.data?.ErrorCode !== "0") {
        throw new Error(result.data?.ErrorDescription || result.err || "Failed to capture fingerprint");
      }
      
      const quality = result.data.Quality || 0;
      setCaptureQuality(quality);
      
      if (quality < 60) {
        toast.warning(`Low quality fingerprint (${quality}). Please try again for better results.`);
      }
      
      if (result.data.IsoTemplate) {
        onChange(result.data.IsoTemplate);
        toast.success(`Fingerprint ${index + 1} captured successfully! (Quality: ${quality})`);
      } else {
        throw new Error("No template data received from device");
      }
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      setLastError(error instanceof Error ? error.message : 'Failed to capture fingerprint');
      toast.error(error instanceof Error ? error.message : "Failed to capture fingerprint");
    } finally {
      setIsCapturing(false);
    }
  };
  
  const verifyFingerprint = async () => {
    if (!value || !sdkLoaded) {
      toast.error("No fingerprint captured or device not initialized");
      return;
    }
    
    try {
      setIsCapturing(true);
      
      toast.info("Place your finger for verification");
      
      const result = await captureFingerprint(60, 10);
      
      if (!result.httpStaus || result.data?.ErrorCode !== "0") {
        throw new Error(result.data?.ErrorDescription || result.err || "Failed to capture fingerprint for verification");
      }
      
      if (!result.data.IsoTemplate) {
        throw new Error("No template available for matching");
      }
      
      const matched = await verifyFingerprints(value, result.data.IsoTemplate);
      
      if (matched) {
        toast.success(`Fingerprint verified successfully!`);
      } else {
        toast.error(`Fingerprint does not match`);
      }
    } catch (error) {
      console.error('Fingerprint verification error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to verify fingerprint");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 animate-fade-in">
      <div className="w-40 h-40 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-white hover:border-primary transition-colors">
        {value ? (
          <div className="relative w-full h-full">
            <img 
              src="/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png"
              alt={`Fingerprint ${index + 1}`}
              className="w-32 h-32 object-contain m-auto animate-scale-in"
            />
            {captureQuality !== null && (
              <div className={`absolute bottom-1 right-1 rounded-full p-1 ${
                captureQuality >= 60 ? 'bg-green-500' : 
                captureQuality >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}>
                {captureQuality >= 60 ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-white" />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400">No Print</div>
        )}
      </div>
      <div className="text-center font-medium">Finger {index + 1}</div>
      
      {!sdkLoaded && !isInitializing && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>SDK Not Loaded</AlertTitle>
          <AlertDescription>
            MFS100 SDK could not be loaded. Please ensure the device is connected properly and refresh the page.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col w-full gap-2">
        <Button
          type="button"
          onClick={handleCaptureFingerprint}
          disabled={isCapturing || !sdkLoaded}
          className="w-full bg-primary hover:bg-primary/90 transition-colors rounded-md"
        >
          <Fingerprint className="mr-2 h-4 w-4" />
          {isCapturing ? "Capturing..." : "Capture Fingerprint"}
        </Button>
        
        {value && (
          <Button
            type="button"
            onClick={verifyFingerprint}
            disabled={isCapturing || !sdkLoaded || !value}
            className="w-full bg-green-600 hover:bg-green-700 transition-colors rounded-md"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Verify Fingerprint
          </Button>
        )}
        
        <div className="text-xs text-gray-500">
          Status: {sdkLoaded ? 'SDK Loaded' : isInitializing ? 'Initializing...' : 'SDK Not Loaded'}
          {deviceInfo && (
            <div className="text-xs text-green-500 mt-1">
              {`${deviceInfo.Make || ''} ${deviceInfo.Model || ''} (S/N: ${deviceInfo.SerialNo || ''})`}
            </div>
          )}
          {lastError && (
            <div className="text-xs text-red-500 mt-1">
              {lastError}
            </div>
          )}
          {captureQuality !== null && (
            <div className={`text-xs mt-1 ${
              captureQuality >= 60 ? 'text-green-500' : 
              captureQuality >= 40 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              Fingerprint Quality: {captureQuality}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
