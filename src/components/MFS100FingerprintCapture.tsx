
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, Info, AlertCircle, Check, X, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FingerprintDisplay } from "./FingerprintDisplay";
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
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>("");

  // Real-time device detection
  const checkDeviceConnection = useCallback(async () => {
    if (!sdkLoaded) return;
    
    try {
      const info = await getDeviceInfo();
      setDeviceConnected(!!info);
      if (info && !deviceInfo) {
        setDeviceInfo(info);
        toast.success("MFS100 device connected");
      } else if (!info && deviceInfo) {
        setDeviceInfo(null);
        toast.warning("MFS100 device disconnected");
      }
    } catch (error) {
      setDeviceConnected(false);
    }
  }, [sdkLoaded, deviceInfo]);

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

  // Real-time device monitoring
  useEffect(() => {
    if (!sdkLoaded) return;
    
    const interval = setInterval(checkDeviceConnection, 2000);
    return () => clearInterval(interval);
  }, [checkDeviceConnection]);

  const fetchDeviceInfo = async () => {
    const info = await getDeviceInfo();
    if (info) {
      setDeviceInfo(info);
      setDeviceConnected(true);
      setLastError("");
    } else {
      setDeviceConnected(false);
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
        // Create a fingerprint image from the captured data
        const fingerprintImage = generateFingerprintImage(result.data);
        setCapturedImage(fingerprintImage);
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

  // Generate a visual representation of the fingerprint
  const generateFingerprintImage = (data: any): string => {
    if (data.Bitmap) {
      return `data:image/bmp;base64,${data.Bitmap}`;
    }
    
    // Fallback: create a simple canvas representation
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 200);
      
      // Draw fingerprint pattern
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Fingerprint ${index + 1}`, 100, 100);
      ctx.fillText(`Quality: ${captureQuality}`, 100, 120);
      
      // Add some fingerprint-like lines
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(100, 100, 20 + i * 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.3 - i * 0.01})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    
    return canvas.toDataURL('image/png');
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
      <FingerprintDisplay 
        value={capturedImage || value}
        index={index}
        quality={captureQuality}
        isCapturing={isCapturing}
      />
      
      {/* Device connection status */}
      <div className="flex items-center space-x-2 text-sm">
        {deviceConnected ? (
          <><Wifi className="h-4 w-4 text-green-500" /><span className="text-green-500">Device Connected</span></>
        ) : (
          <><WifiOff className="h-4 w-4 text-red-500" /><span className="text-red-500">Device Disconnected</span></>
        )}
      </div>

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
          disabled={isCapturing || !sdkLoaded || !deviceConnected}
          className="w-full bg-primary hover:bg-primary/90 transition-colors rounded-md"
        >
          <Fingerprint className="mr-2 h-4 w-4" />
          {isCapturing ? "Capturing..." : deviceConnected ? "Capture Fingerprint" : "Connect Device"}
        </Button>
        
        {value && (
          <Button
            type="button"
            onClick={verifyFingerprint}
            disabled={isCapturing || !sdkLoaded || !deviceConnected || !value}
            className="w-full bg-green-600 hover:bg-green-700 transition-colors rounded-md"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Verify Fingerprint
          </Button>
        )}
        
        <div className="text-xs text-gray-500 text-center">
          <div>SDK: {sdkLoaded ? 'Loaded' : isInitializing ? 'Loading...' : 'Not Loaded'}</div>
          {deviceInfo && (
            <div className="text-xs text-green-500 mt-1">
              {`${deviceInfo.Make || ''} ${deviceInfo.Model || ''}`}
              {deviceInfo.SerialNo && <div>S/N: {deviceInfo.SerialNo}</div>}
            </div>
          )}
          {lastError && (
            <div className="text-xs text-red-500 mt-1">
              {lastError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
