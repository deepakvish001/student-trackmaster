import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint } from "lucide-react";
import { toast } from "sonner";

interface FingerprintCaptureProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
}

export function FingerprintCapture({ index, value, onChange }: FingerprintCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'running' | 'not-running'>('checking');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  // Check service and device status on component mount
  useEffect(() => {
    checkServiceAndDevice();
    // Poll service status every 5 seconds
    const interval = setInterval(checkServiceAndDevice, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkServiceAndDevice = async () => {
    try {
      const response = await fetch('http://localhost:11100/rd/info');
      if (!response.ok) {
        setServiceStatus('not-running');
        return false;
      }
      
      const info = await response.json();
      setDeviceInfo(info);
      setServiceStatus('running');
      console.log("Device Info:", info);
      return true;
    } catch (error) {
      console.error('Service/Device check error:', error);
      setServiceStatus('not-running');
      return false;
    }
  };

  const captureFingerprint = async () => {
    try {
      setIsCapturing(true);
      
      // First check if the service is running and device is connected
      const isReady = await checkServiceAndDevice();
      
      if (!isReady) {
        toast.error("Please ensure Mantra RD Service is running and device is connected");
        console.log("Service/Device Status Check Failed");
        return;
      }

      console.log("Attempting to capture fingerprint...");
      
      // Capture fingerprint with high quality settings
      const captureResponse = await fetch('http://localhost:11100/rd/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "Template": "1",
          "Quality": "60", // Higher quality as per Mantra docs
          "TimeOut": "15000", // 15 seconds timeout
          "Format": "ISO",
          "PidType": "0", // Regular capture
          "DeviceId": deviceInfo?.DeviceInfo?.DeviceId || ""
        })
      });

      if (!captureResponse.ok) {
        throw new Error('Failed to capture fingerprint');
      }

      const data = await captureResponse.json();
      console.log("Capture Response:", data);
      
      if (data.ErrorCode === "0") {
        // Store the ISO template
        onChange(data.Data);
        toast.success(`Fingerprint ${index + 1} captured successfully!`);
      } else {
        toast.error(`Error capturing fingerprint: ${data.ErrorDescription}`);
        console.error("Capture Error:", data.ErrorDescription);
      }
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      toast.error("Failed to capture fingerprint. Please ensure device is connected and service is running.");
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
      <div className="text-sm text-gray-500">
        Status: {
          serviceStatus === 'checking' ? 'Checking service...' :
          serviceStatus === 'running' ? 'Service Running' :
          'Service Not Running'
        }
        {deviceInfo && serviceStatus === 'running' && (
          <div className="text-xs text-green-500">
            Device: {deviceInfo.DeviceInfo?.DeviceName || 'Unknown'}
          </div>
        )}
      </div>
      <Button
        type="button"
        onClick={captureFingerprint}
        disabled={isCapturing || serviceStatus !== 'running'}
        className="w-full bg-primary hover:bg-primary/90 transition-colors"
      >
        <Fingerprint className="mr-2 h-4 w-4" />
        {isCapturing ? "Capturing..." : "Capture"}
      </Button>
    </div>
  );
}