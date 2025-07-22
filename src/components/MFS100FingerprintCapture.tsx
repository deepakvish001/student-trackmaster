
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

  // Convert MFS100 bitmap data to proper image format
  const processFingerprintImage = (bitmapData: string, width: number = 256, height: number = 256): string => {
    try {
      if (!bitmapData) return "";
      
      // Create a canvas to process the bitmap data
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return "";
      
      // Convert base64 bitmap to binary data
      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(width, height);
      
      // Process bitmap data - MFS100 typically provides 8-bit grayscale data
      for (let i = 0; i < binaryData.length && i < (width * height); i++) {
        const pixelValue = binaryData.charCodeAt(i);
        const pixelIndex = i * 4;
        
        // Set RGBA values (convert grayscale to RGBA)
        imageData.data[pixelIndex] = pixelValue;     // Red
        imageData.data[pixelIndex + 1] = pixelValue; // Green
        imageData.data[pixelIndex + 2] = pixelValue; // Blue
        imageData.data[pixelIndex + 3] = 255;        // Alpha (fully opaque)
      }
      
      // Put the processed image data on canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Return as base64 PNG for storage and display
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error processing fingerprint image:', error);
      return "";
    }
  };

  const handleCaptureFingerprint = async () => {
    try {
      if (!sdkLoaded) {
        toast.error("MFS100 SDK not loaded. Please refresh the page and try again.");
        return;
      }

      if (!deviceConnected) {
        toast.error("MFS100 device not connected. Please connect the device and try again.");
        return;
      }

      setIsCapturing(true);
      setLastError("");
      setCaptureQuality(null);
      
      toast.info("Place your finger on the MFS100 scanner", {
        duration: 3000,
      });
      
      const result = await captureFingerprint(60, 10);
      
      if (!result.httpStaus || result.data?.ErrorCode !== "0") {
        throw new Error(result.data?.ErrorDescription || result.err || "Failed to capture fingerprint");
      }
      
      const quality = result.data.Quality || 0;
      setCaptureQuality(quality);
      
      if (quality < 60) {
        toast.warning(`Low quality fingerprint (${quality}). Please clean your finger and try again for better results.`);
      }
      
      if (result.data.IsoTemplate) {
        // Process the actual fingerprint image from bitmap data
        let fingerprintImage = "";
        
        if (result.data.BitmapData) {
          // Convert MFS100 bitmap data to displayable image
          fingerprintImage = processFingerprintImage(
            result.data.BitmapData,
            result.data.InWidth || 256,
            result.data.InHeight || 256
          );
          
          console.log('Processed fingerprint image:', {
            originalWidth: result.data.InWidth,
            originalHeight: result.data.InHeight,
            bitmapDataLength: result.data.BitmapData.length,
            processedImageSize: fingerprintImage.length
          });
        }
        
        // Set the captured image for display
        if (fingerprintImage) {
          setCapturedImage(fingerprintImage);
          
          // Call the image change callback to save to database
          if (onImageChange) {
            onImageChange(fingerprintImage);
          }
        }
        
        // Store the ISO template for matching purposes
        onChange(result.data.IsoTemplate);
        
        toast.success(`Fingerprint ${index + 1} captured successfully! Quality: ${quality}%`, {
          duration: 4000,
        });
        
        console.log('Captured fingerprint data:', {
          templateLength: result.data.IsoTemplate?.length,
          imageGenerated: !!fingerprintImage,
          quality: quality,
          dimensions: `${result.data.InWidth}x${result.data.InHeight}`
        });
      } else {
        throw new Error("No template data received from MFS100 device");
      }
    } catch (error) {
      console.error('MFS100 fingerprint capture error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to capture fingerprint';
      setLastError(errorMessage);
      toast.error(errorMessage, {
        duration: 5000,
      });
    } finally {
      setIsCapturing(false);
    }
  };
  
  const verifyFingerprint = async () => {
    if (!value || !sdkLoaded) {
      toast.error("No fingerprint captured or device not initialized");
      return;
    }
    
    if (!deviceConnected) {
      toast.error("MFS100 device not connected");
      return;
    }
    
    try {
      setIsCapturing(true);
      
      toast.info("Place your finger for verification", {
        duration: 3000,
      });
      
      const result = await captureFingerprint(60, 10);
      
      if (!result.httpStaus || result.data?.ErrorCode !== "0") {
        throw new Error(result.data?.ErrorDescription || result.err || "Failed to capture fingerprint for verification");
      }
      
      if (!result.data.IsoTemplate) {
        throw new Error("No template available for matching");
      }
      
      const matched = await verifyFingerprints(value, result.data.IsoTemplate);
      
      if (matched) {
        toast.success(`Fingerprint verified successfully! ✓`, {
          duration: 4000,
        });
      } else {
        toast.error(`Fingerprint does not match ✗`, {
          duration: 4000,
        });
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
        value={capturedImage || value || ""}
        index={index}
        quality={captureQuality}
        isCapturing={isCapturing}
      />
      
      {/* Device connection status with real-time indicator */}
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
          </>
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
          className={`w-full transition-all duration-300 rounded-md ${
            isCapturing 
              ? 'bg-blue-500 hover:bg-blue-600 animate-pulse' 
              : deviceConnected 
                ? 'bg-primary hover:bg-primary/90' 
                : 'bg-gray-400'
          }`}
        >
          <Fingerprint className="mr-2 h-4 w-4" />
          {isCapturing ? "Capturing..." : deviceConnected ? "Capture Fingerprint" : "Connect MFS100 Device"}
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
            <div className="text-xs text-red-500 break-words">
              {lastError}
            </div>
          )}
          {captureQuality !== null && (
            <div className={`text-xs ${captureQuality >= 60 ? 'text-green-600' : 'text-yellow-600'}`}>
              Last Quality: {captureQuality}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
