
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, Usb, AlertCircle, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  connectToMFS100,
  listMFS100Devices,
  captureFingerprint,
  disconnectDevice,
  fingerprintToBase64,
  isWebUSBSupported,
  isQualityAcceptable,
  templateToBase64,
  matchFingerprints,
  getDeviceInfo
} from "@/utils/usbFingerprint";

interface USBFingerprintCaptureProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
}

interface DeviceStatus {
  connected: boolean;
  deviceId: string;
  manufacturer: string;
  serialNumber?: string;
  model?: string;
  info?: string;
}

export function USBFingerprintCapture({ index, value, onChange }: USBFingerprintCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [browserSupport, setBrowserSupport] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [fingerData, setFingerData] = useState({
    template: "",
    quality: 0,
    imageBase64: ""
  });

  useEffect(() => {
    // Check if WebUSB is supported
    setBrowserSupport(isWebUSBSupported());
    
    if (isWebUSBSupported()) {
      // Try to list already authorized devices
      listMFS100Devices().then(devices => {
        if (devices.length > 0) {
          const device = devices[0];
          setDeviceStatus({
            connected: true,
            deviceId: device.id,
            manufacturer: device.manufacturer,
            serialNumber: device.serialNumber,
            model: device.model,
            info: device.info
          });
          
          toast.success("MFS100 device detected");
        }
      });
    } else {
      setLastError("WebUSB is not supported in this browser. Please use Chrome or Edge.");
    }
  }, []);

  const handleInitDevice = async () => {
    try {
      setIsInitializing(true);
      setLastError("");
      
      const device = await connectToMFS100();
      
      if (device) {
        setDeviceStatus({
          connected: true,
          deviceId: device.id,
          manufacturer: device.manufacturer,
          serialNumber: device.serialNumber,
          model: device.model,
          info: device.info
        });
        toast.success("Device initialized successfully!");
        console.log("Device info:", device);
      } else {
        throw new Error("Failed to initialize device. Please make sure it's connected and try again.");
      }
    } catch (error) {
      console.error('Device initialization error:', error);
      setLastError(error instanceof Error ? error.message : 'Failed to initialize device');
      toast.error(error instanceof Error ? error.message : "Failed to initialize device");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleUninitDevice = async () => {
    try {
      setIsInitializing(true);
      setLastError("");
      
      if (!deviceStatus?.connected) {
        toast.error("No device connected");
        return;
      }
      
      const devices = await listMFS100Devices();
      if (devices.length === 0) {
        throw new Error("No authorized devices found");
      }
      
      const success = await disconnectDevice(devices[0]);
      
      if (success) {
        setDeviceStatus(null);
        setCaptureQuality(null);
        setFingerData({
          template: "",
          quality: 0,
          imageBase64: ""
        });
        toast.success("Device uninitialized successfully");
      } else {
        throw new Error("Failed to uninitialize device");
      }
    } catch (error) {
      console.error('Device uninitialization error:', error);
      setLastError(error instanceof Error ? error.message : 'Failed to uninitialize device');
      toast.error(error instanceof Error ? error.message : "Failed to uninitialize device");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCaptureFingerprint = async () => {
    try {
      setIsCapturing(true);
      setLastError("");
      setCaptureQuality(null);
      
      // If not connected, try to connect first
      if (!deviceStatus?.connected) {
        const device = await connectToMFS100();
        
        if (!device) {
          throw new Error("Please initialize the fingerprint device first");
        }
        
        setDeviceStatus({
          connected: true,
          deviceId: device.id,
          manufacturer: device.manufacturer,
          serialNumber: device.serialNumber,
          model: device.model,
          info: device.info
        });
      }
      
      // Get all devices to use for capture
      const devices = await listMFS100Devices();
      
      if (devices.length === 0) {
        throw new Error("No authorized devices found");
      }
      
      toast.info("Place your finger on the scanner");
      const fingerprint = await captureFingerprint(devices[0]);
      
      if (!fingerprint) {
        throw new Error("Failed to capture fingerprint");
      }
      
      setCaptureQuality(fingerprint.quality);
      
      if (!isQualityAcceptable(fingerprint)) {
        toast.warning(`Low quality fingerprint (${fingerprint.quality}). Please try again for better results.`);
      }
      
      // Convert fingerprint to base64 and update
      const base64Data = fingerprintToBase64(fingerprint);
      
      // Also store the template for future matching
      const templateBase64 = templateToBase64(fingerprint);
      
      setFingerData({
        template: templateBase64 || "",
        quality: fingerprint.quality,
        imageBase64: base64Data
      });
      
      onChange(base64Data);
      toast.success(`Fingerprint ${index + 1} captured successfully! (Quality: ${fingerprint.quality})`);
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      setLastError(error instanceof Error ? error.message : 'Failed to capture fingerprint');
      toast.error(error instanceof Error ? error.message : "Failed to capture fingerprint");
    } finally {
      setIsCapturing(false);
    }
  };
  
  const verifyFingerprint = async () => {
    if (!value || !deviceStatus?.connected) {
      toast.error("No fingerprint captured or device not connected");
      return;
    }
    
    try {
      setIsCapturing(true);
      
      const devices = await listMFS100Devices();
      if (devices.length === 0) {
        throw new Error("No authorized devices found");
      }
      
      toast.info("Place your finger for verification");
      const currentFinger = await captureFingerprint(devices[0]);
      
      if (!currentFinger || !currentFinger.template) {
        throw new Error("Failed to capture fingerprint for verification");
      }
      
      if (!fingerData.template) {
        throw new Error("No template available for matching");
      }
      
      // This is a simplified approach since we don't have direct access to the stored template
      // In real implementation, you might want to compare with the stored template from database
      const templateBuffer = Buffer.from(fingerData.template, 'base64');
      const currentBuffer = Buffer.from(templateToBase64(currentFinger) || "", 'base64');
      
      const matchResult = await matchFingerprints(templateBuffer, currentBuffer, devices[0]);
      
      if (matchResult.matched) {
        toast.success(`Fingerprint verified successfully! (Score: ${matchResult.score})`);
      } else {
        toast.error(`Fingerprint does not match (Score: ${matchResult.score})`);
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
      
      {!browserSupport && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Browser Not Supported</AlertTitle>
          <AlertDescription>
            WebUSB is not supported in this browser. Please use Chrome or Edge.
          </AlertDescription>
        </Alert>
      )}
      
      {browserSupport && (
        <div className="flex flex-col w-full gap-2">
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              onClick={handleInitDevice}
              disabled={isInitializing || isCapturing || deviceStatus?.connected}
              className="flex-1 bg-secondary hover:bg-secondary/90 transition-colors rounded-md"
              size="sm"
            >
              <Usb className="mr-2 h-4 w-4" />
              {isInitializing ? "Initializing..." : "Init Device"}
            </Button>
            
            <Button
              type="button"
              onClick={handleUninitDevice}
              disabled={isInitializing || isCapturing || !deviceStatus?.connected}
              className="flex-1 bg-destructive hover:bg-destructive/90 transition-colors rounded-md"
              size="sm"
            >
              <X className="mr-2 h-4 w-4" />
              {isInitializing ? "Processing..." : "Uninit"}
            </Button>
          </div>
          
          <Button
            type="button"
            onClick={handleCaptureFingerprint}
            disabled={isCapturing || !deviceStatus?.connected || !browserSupport}
            className="w-full bg-primary hover:bg-primary/90 transition-colors rounded-md"
          >
            <Fingerprint className="mr-2 h-4 w-4" />
            {isCapturing ? "Capturing..." : "Capture Fingerprint"}
          </Button>
          
          {value && (
            <Button
              type="button"
              onClick={verifyFingerprint}
              disabled={isCapturing || !deviceStatus?.connected || !browserSupport || !value}
              className="w-full bg-green-600 hover:bg-green-700 transition-colors rounded-md"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Verify Fingerprint
            </Button>
          )}
          
          <div className="text-xs text-gray-500">
            Status: {deviceStatus?.connected ? 'Device Connected' : 'No Device Connected'}
            {deviceStatus?.connected && (
              <div className="text-xs text-green-500 mt-1">
                {deviceStatus.info || `${deviceStatus.manufacturer} (${deviceStatus.deviceId})`}
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
      )}
    </div>
  );
}
