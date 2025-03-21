
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, Usb } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  connectToMFS100,
  listMFS100Devices,
  captureFingerprint,
  disconnectDevice,
  fingerprintToBase64
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
}

export function USBFingerprintCapture({ index, value, onChange }: USBFingerprintCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [browserSupport, setBrowserSupport] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string>("");

  useEffect(() => {
    // Check if WebUSB is supported
    if (navigator.usb) {
      setBrowserSupport(true);
      
      // Try to list already authorized devices
      listMFS100Devices().then(devices => {
        if (devices.length > 0) {
          const device = devices[0];
          setDeviceStatus({
            connected: true,
            deviceId: device.id,
            manufacturer: device.manufacturer
          });
        }
      });
    } else {
      setBrowserSupport(false);
      setLastError("WebUSB is not supported in this browser");
    }
  }, []);

  const handleConnectDevice = async () => {
    try {
      setIsCapturing(true);
      setLastError("");
      
      const device = await connectToMFS100();
      
      if (device) {
        setDeviceStatus({
          connected: true,
          deviceId: device.id,
          manufacturer: device.manufacturer
        });
        toast.success("Device connected successfully!");
      } else {
        throw new Error("Failed to connect to device. Please make sure it's connected and try again.");
      }
    } catch (error) {
      console.error('Device connection error:', error);
      setLastError(error instanceof Error ? error.message : 'Failed to connect to device');
      toast.error(error instanceof Error ? error.message : "Failed to connect to device");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureFingerprint = async () => {
    try {
      setIsCapturing(true);
      setLastError("");
      
      // If not connected, try to connect first
      if (!deviceStatus?.connected) {
        const device = await connectToMFS100();
        
        if (!device) {
          throw new Error("Please connect to a fingerprint device first");
        }
        
        setDeviceStatus({
          connected: true,
          deviceId: device.id,
          manufacturer: device.manufacturer
        });
        
        // Get all devices to use for capture
        const devices = await listMFS100Devices();
        
        if (devices.length === 0) {
          throw new Error("No authorized devices found");
        }
        
        const fingerprint = await captureFingerprint(devices[0]);
        
        if (!fingerprint) {
          throw new Error("Failed to capture fingerprint");
        }
        
        // Convert fingerprint to base64 and update
        const base64Data = fingerprintToBase64(fingerprint);
        onChange(base64Data);
        toast.success(`Fingerprint ${index + 1} captured successfully!`);
      } else {
        // Already connected, just list and capture
        const devices = await listMFS100Devices();
        
        if (devices.length === 0) {
          throw new Error("No authorized devices found");
        }
        
        const fingerprint = await captureFingerprint(devices[0]);
        
        if (!fingerprint) {
          throw new Error("Failed to capture fingerprint");
        }
        
        // Convert fingerprint to base64 and update
        const base64Data = fingerprintToBase64(fingerprint);
        onChange(base64Data);
        toast.success(`Fingerprint ${index + 1} captured successfully!`);
      }
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      setLastError(error instanceof Error ? error.message : 'Failed to capture fingerprint');
      toast.error(error instanceof Error ? error.message : "Failed to capture fingerprint");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 animate-fade-in">
      <div className="w-40 h-40 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-white hover:border-primary transition-colors">
        {value ? (
          <img 
            src="/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png"
            alt={`Fingerprint ${index + 1}`}
            className="w-32 h-32 object-contain animate-scale-in"
          />
        ) : (
          <div className="text-gray-400">No Print</div>
        )}
      </div>
      <div className="text-center font-medium">Finger {index + 1}</div>
      
      {!browserSupport && (
        <Alert variant="destructive">
          <AlertDescription>
            WebUSB is not supported in this browser. Please use Chrome or Edge.
          </AlertDescription>
        </Alert>
      )}
      
      {browserSupport && !deviceStatus?.connected && (
        <Button
          type="button"
          onClick={handleConnectDevice}
          disabled={isCapturing}
          className="w-full bg-secondary hover:bg-secondary/90 transition-colors rounded-md"
        >
          <Usb className="mr-2 h-4 w-4" />
          {isCapturing ? "Connecting..." : "Connect Device"}
        </Button>
      )}
      
      {browserSupport && (
        <div className="text-sm text-gray-500">
          Status: {deviceStatus?.connected ? 'Device Connected' : 'No Device Connected'}
          {deviceStatus?.connected && (
            <div className="text-xs text-green-500">
              Device: {deviceStatus.manufacturer} ({deviceStatus.deviceId})
            </div>
          )}
          {lastError && (
            <div className="text-sm text-red-500 mt-1">
              {lastError}
            </div>
          )}
        </div>
      )}
      
      <Button
        type="button"
        onClick={handleCaptureFingerprint}
        disabled={isCapturing || !browserSupport}
        className="w-full bg-primary hover:bg-primary/90 transition-colors rounded-md"
      >
        <Fingerprint className="mr-2 h-4 w-4" />
        {isCapturing ? "Capturing..." : "Capture Fingerprint"}
      </Button>
    </div>
  );
}
