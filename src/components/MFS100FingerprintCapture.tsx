
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
  onImageChange?: (imageData: string) => void;
}

export function MFS100FingerprintCapture({ 
  index, 
  value, 
  onChange, 
  onImageChange 
}: MFS100FingerprintCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [lastError, setLastError] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>("");

  // Reset connection state and reinitialize
  const reinitializeDevice = useCallback(async () => {
    console.log('Reinitializing MFS100 device...');
    setIsInitializing(true);
    setDeviceConnected(false);
    setDeviceInfo(null);
    setSdkLoaded(false);
    
    // Force reload the SDK
    const initialized = await initializeMFS100();
    setSdkLoaded(initialized);
    
    if (initialized) {
      await fetchDeviceInfo();
      toast.success("Device reinitialized successfully");
    } else {
      setLastError("Failed to reinitialize MFS100 SDK");
      toast.error("Failed to reinitialize device");
    }
    setIsInitializing(false);
  }, []);

  // Real-time device detection with better error handling
  const checkDeviceConnection = useCallback(async () => {
    if (!sdkLoaded) return;
    
    try {
      const info = await getDeviceInfo();
      const isConnected = !!info;
      
      if (isConnected !== deviceConnected) {
        setDeviceConnected(isConnected);
        
        if (isConnected && info) {
          setDeviceInfo(info);
          setLastError("");
          console.log('MFS100 device connected:', info);
        } else {
          setDeviceInfo(null);
          console.log('MFS100 device disconnected');
        }
      }
    } catch (error) {
      console.error('Device check error:', error);
      setDeviceConnected(false);
      setDeviceInfo(null);
    }
  }, [sdkLoaded, deviceConnected]);

  useEffect(() => {
    const loadSDK = async () => {
      setIsInitializing(true);
      const initialized = await initializeMFS100();
      setSdkLoaded(initialized);
      if (initialized) {
        await fetchDeviceInfo();
      } else {
        setLastError("Failed to load MFS100 SDK. Please check device connection.");
      }
      setIsInitializing(false);
    };

    loadSDK();
  }, []);

  // Real-time device monitoring
  useEffect(() => {
    if (!sdkLoaded) return;
    
    const interval = setInterval(checkDeviceConnection, 3000);
    return () => clearInterval(interval);
  }, [checkDeviceConnection]);

  const fetchDeviceInfo = async () => {
    try {
      const info = await getDeviceInfo();
      if (info) {
        setDeviceInfo(info);
        setDeviceConnected(true);
        setLastError("");
        console.log('Device info fetched:', info);
      } else {
        setDeviceConnected(false);
        setLastError("Device not found. Please check connection.");
      }
    } catch (error) {
      console.error('Error fetching device info:', error);
      setDeviceConnected(false);
      setLastError("Error communicating with device.");
    }
  };

  // Enhanced bitmap processing for actual fingerprint images
  const processFingerprintBitmap = (bitmapData: string, width: number = 256, height: number = 256): string => {
    try {
      if (!bitmapData) {
        console.log('No bitmap data provided');
        return "";
      }
      
      console.log(`Processing bitmap data: ${bitmapData.length} characters, ${width}x${height}`);
      
      // Create canvas for image processing
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Failed to get canvas context');
        return "";
      }
      
      // Convert base64 bitmap to binary
      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      // Process each pixel - MFS100 provides 8-bit grayscale data
      for (let i = 0; i < binaryData.length && i < (width * height); i++) {
        const pixelValue = binaryData.charCodeAt(i);
        const pixelIndex = i * 4;
        
        // Convert grayscale to RGBA
        data[pixelIndex] = pixelValue;     // Red
        data[pixelIndex + 1] = pixelValue; // Green  
        data[pixelIndex + 2] = pixelValue; // Blue
        data[pixelIndex + 3] = 255;        // Alpha
      }
      
      // Fill remaining pixels if bitmap is smaller than expected
      for (let i = binaryData.length * 4; i < data.length; i += 4) {
        data[i] = 255;     // White background
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
      
      // Put processed image data on canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to base64 PNG
      const result = canvas.toDataURL('image/png', 1.0);
      console.log(`Processed fingerprint image: ${result.length} characters`);
      
      return result;
    } catch (error) {
      console.error('Error processing fingerprint bitmap:', error);
      return "";
    }
  };

  const handleCaptureFingerprint = async () => {
    try {
      if (!sdkLoaded) {
        toast.error("MFS100 SDK not loaded. Please refresh and try again.");
        return;
      }

      if (!deviceConnected) {
        toast.error("MFS100 device not connected. Please check connection.");
        await reinitializeDevice();
        return;
      }

      setIsCapturing(true);
      setLastError("");
      setCaptureQuality(null);
      
      toast.info(`Place finger ${index + 1} on the MFS100 scanner`, {
        duration: 3000,
      });
      
      console.log('Starting fingerprint capture...');
      const result = await captureFingerprint(60, 15);
      console.log('Capture result:', result);
      
      if (!result.httpStaus) {
        throw new Error(result.err || "Failed to capture fingerprint");
      }
      
      if (result.data?.ErrorCode !== "0") {
        throw new Error(result.data?.ErrorDescription || "Device returned error");
      }
      
      const quality = result.data.Quality || 0;
      setCaptureQuality(quality);
      
      console.log(`Fingerprint captured with quality: ${quality}%`);
      
      // Process the actual fingerprint image
      let fingerprintImage = "";
      
      if (result.data.BitmapData) {
        fingerprintImage = processFingerprintBitmap(
          result.data.BitmapData,
          result.data.InWidth || 256,
          result.data.InHeight || 256
        );
        
        console.log('Fingerprint image processed:', {
          originalBitmapSize: result.data.BitmapData.length,
          processedImageSize: fingerprintImage.length,
          dimensions: `${result.data.InWidth}x${result.data.InHeight}`,
          quality: quality
        });
      }
      
      if (fingerprintImage) {
        setCapturedImage(fingerprintImage);
        
        // Save image to database
        if (onImageChange) {
          onImageChange(fingerprintImage);
        }
        
        toast.success(`Finger ${index + 1} image captured! Quality: ${quality}%`, {
          duration: 4000,
        });
      } else {
        console.warn('No image data processed from bitmap');
      }
      
      // Store ISO template for matching
      if (result.data.IsoTemplate) {
        onChange(result.data.IsoTemplate);
        console.log('ISO template saved, length:', result.data.IsoTemplate.length);
      } else {
        throw new Error("No template data received");
      }
      
      if (quality < 60) {
        toast.warning(`Quality ${quality}% is low. Clean finger and try again for better results.`);
      }
      
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown capture error';
      setLastError(errorMessage);
      toast.error(errorMessage, { duration: 5000 });
      
      // Try to reinitialize on connection errors
      if (errorMessage.includes('Service Unavailable') || errorMessage.includes('device')) {
        setTimeout(() => reinitializeDevice(), 1000);
      }
    } finally {
      setIsCapturing(false);
    }
  };
  
  const verifyFingerprint = async () => {
    if (!value || !sdkLoaded) {
      toast.error("No fingerprint captured or device not ready");
      return;
    }
    
    if (!deviceConnected) {
      toast.error("MFS100 device not connected");
      await reinitializeDevice();
      return;
    }
    
    try {
      setIsCapturing(true);
      
      toast.info("Place finger for verification", { duration: 3000 });
      
      const result = await captureFingerprint(60, 15);
      
      if (!result.httpStaus || result.data?.ErrorCode !== "0") {
        throw new Error(result.data?.ErrorDescription || result.err || "Verification capture failed");
      }
      
      if (!result.data.IsoTemplate) {
        throw new Error("No template available for verification");
      }
      
      const matched = await verifyFingerprints(value, result.data.IsoTemplate);
      
      if (matched) {
        toast.success(`Finger ${index + 1} verified successfully! ✓`, { duration: 4000 });
      } else {
        toast.error(`Finger ${index + 1} does not match ✗`, { duration: 4000 });
      }
    } catch (error) {
      console.error('Fingerprint verification error:', error);
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 animate-fade-in">
      <FingerprintDisplay 
        value={capturedImage || value || ""}
        index={index}
        quality={captureQuality}
        isCapturing={isCapturing}
        showQuality={true}
      />
      
      {/* Real-time device status */}
      <div className="flex items-center space-x-2 text-sm">
        {deviceConnected ? (
          <>
            <div className="flex items-center space-x-1">
              <Wifi className="h-4 w-4 text-green-500" />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <span className="text-green-600 font-medium">MFS100 Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-red-500">MFS100 Disconnected</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={reinitializeDevice}
              disabled={isInitializing}
            >
              {isInitializing ? "Connecting..." : "Reconnect"}
            </Button>
          </>
        )}
      </div>

      {!sdkLoaded && !isInitializing && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>SDK Not Loaded</AlertTitle>
          <AlertDescription>
            MFS100 SDK failed to load. Please check device connection and refresh.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col w-full gap-2">
        <Button
          type="button"
          onClick={handleCaptureFingerprint}
          disabled={isCapturing || !sdkLoaded || !deviceConnected}
          className={`w-full transition-all duration-300 rounded-md ${
            isCapturing 
              ? 'bg-blue-500 hover:bg-blue-600 animate-pulse' 
              : deviceConnected 
                ? 'bg-primary hover:bg-primary/90' 
                : 'bg-gray-400'
          }`}
        >
          <Fingerprint className="mr-2 h-4 w-4" />
          {isCapturing ? `Capturing Finger ${index + 1}...` : 
           deviceConnected ? `Capture Finger ${index + 1}` : "Connect Device First"}
        </Button>
        
        {value && capturedImage && (
          <Button
            type="button"
            onClick={verifyFingerprint}
            disabled={isCapturing || !sdkLoaded || !deviceConnected}
            className="w-full bg-green-600 hover:bg-green-700 transition-colors rounded-md"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Verify Finger {index + 1}
          </Button>
        )}
        
        <div className="text-xs text-center space-y-1">
          <div className={`${sdkLoaded ? 'text-green-600' : 'text-red-500'}`}>
            SDK: {sdkLoaded ? 'Loaded ✓' : isInitializing ? 'Loading...' : 'Not Loaded ✗'}
          </div>
          {deviceInfo && deviceConnected && (
            <div className="text-xs text-green-600">
              {`${deviceInfo.Make || 'MFS100'} ${deviceInfo.Model || ''}`}
              {deviceInfo.SerialNo && <div>S/N: {deviceInfo.SerialNo}</div>}
            </div>
          )}
          {lastError && (
            <div className="text-xs text-red-500 break-words max-w-full">
              {lastError}
            </div>
          )}
          {captureQuality !== null && (
            <div className={`text-xs font-medium ${
              captureQuality >= 60 ? 'text-green-600' : 
              captureQuality >= 40 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              Last Quality: {captureQuality}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
