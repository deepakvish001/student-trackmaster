
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FingerprintDisplay } from "./FingerprintDisplay";

interface FingerprintCaptureProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
}

interface DeviceInfo {
  ErrorCode: string;
  ErrorDescription: string;
  DeviceInfo?: {
    DeviceId: string;
    DeviceName: string;
  };
}

export function FingerprintCapture({ index, value, onChange }: FingerprintCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'running' | 'not-running'>('checking');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [lastError, setLastError] = useState<string>("");
  const [rdServiceUrl, setRdServiceUrl] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [captureQuality, setCaptureQuality] = useState<number | null>(null);

  useEffect(() => {
    // Try to get the stored RD service URL from localStorage
    const savedUrl = localStorage.getItem('rdServiceUrl');
    if (savedUrl) {
      setRdServiceUrl(savedUrl);
      checkServiceAndDevice(savedUrl);
    }
  }, []);

  // Real-time service monitoring
  const monitorService = useCallback(async () => {
    if (!rdServiceUrl) return;
    await checkServiceAndDevice(rdServiceUrl);
  }, [rdServiceUrl]);

  useEffect(() => {
    if (!rdServiceUrl) return;
    
    const interval = setInterval(monitorService, 3000);
    return () => clearInterval(interval);
  }, [monitorService]);

  const promptForServiceUrl = async () => {
    const url = prompt("Please enter your local RD Service URL (e.g., http://localhost:11100)", "http://localhost:11100");
    if (url) {
      localStorage.setItem('rdServiceUrl', url);
      setRdServiceUrl(url);
      await checkServiceAndDevice(url);
    }
  };

  const checkServiceAndDevice = async (serviceUrl: string) => {
    try {
      console.log("Checking Mantra RD service status...");
      const response = await fetch(`${serviceUrl}/rd/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          "Device": "Mantra.MFSM",
          "PGCount": "1",
          "PTimeout": "20000",
          "PidVer": "2.0",
          "Timeout": "11000",
          "Env": "P",
          "RequestType": "RDSERVICE",
          "Method": "INFO"
        })
      });

      if (!response.ok) {
        throw new Error(`Service error: ${response.status} ${response.statusText}`);
      }
      
      const info = await response.json();
      console.log("Device Info received:", info);
      
      if (info.ErrorCode !== "0") {
        throw new Error(`Device error: ${info.ErrorDescription}`);
      }

      setDeviceInfo(info);
      setServiceStatus('running');
      setLastError("");
      return true;
    } catch (error) {
      console.error('Service/Device check error:', error);
      setServiceStatus('not-running');
      setLastError(error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  };

  const captureFingerprint = async () => {
    if (!rdServiceUrl) {
      await promptForServiceUrl();
      return;
    }

    try {
      setIsCapturing(true);
      
      const isReady = await checkServiceAndDevice(rdServiceUrl);
      
      if (!isReady) {
        toast.error(`Device not ready: ${lastError}. Please check device connection and try again.`);
        return;
      }

      console.log("Starting fingerprint capture...");
      
      const captureResponse = await fetch(`${rdServiceUrl}/rd/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          "Device": "Mantra.MFSM",
          "PGCount": "1",
          "PTimeout": "20000",
          "PidVer": "2.0",
          "Timeout": "11000",
          "Env": "P",
          "Format": "ISO",
          "Quality": "60",
          "Type": "CAPTURE",
          "PidType": "0",
          "DeviceId": deviceInfo?.DeviceInfo?.DeviceId || "",
          "Demo": false,
          "ReturnImage": true
        })
      });

      if (!captureResponse.ok) {
        throw new Error(`Capture failed: ${captureResponse.status} ${captureResponse.statusText}`);
      }

      const data = await captureResponse.json();
      console.log("Capture Response:", data);
      
      if (data.ErrorCode === "0") {
        const pidData = data.Data ? JSON.parse(data.Data) : null;
        if (pidData && pidData.Skey && pidData.Pid) {
          // Extract quality if available
          const quality = pidData.Quality || null;
          setCaptureQuality(quality);
          
          // Create fingerprint image if available
          if (pidData.Bitmap) {
            const fingerprintImage = `data:image/bmp;base64,${pidData.Bitmap}`;
            setCapturedImage(fingerprintImage);
          }
          
          onChange(pidData.Pid);
          toast.success(`Fingerprint ${index + 1} captured successfully!${quality ? ` (Quality: ${quality})` : ''}`);
        } else {
          throw new Error("Invalid fingerprint data received");
        }
      } else {
        throw new Error(`Error capturing fingerprint: ${data.ErrorDescription}`);
      }
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to capture fingerprint");
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
      
      {/* Service connection status */}
      <div className="flex items-center space-x-2 text-sm">
        {serviceStatus === 'running' ? (
          <><Wifi className="h-4 w-4 text-green-500" /><span className="text-green-500">RD Service Connected</span></>
        ) : (
          <><WifiOff className="h-4 w-4 text-red-500" /><span className="text-red-500">RD Service Disconnected</span></>
        )}
      </div>
      
      {!rdServiceUrl && (
        <Alert variant="destructive">
          <AlertDescription>
            Please configure your local RD Service URL to capture fingerprints.
            Click the capture button to set it up.
          </AlertDescription>
        </Alert>
      )}
      
      {rdServiceUrl && (
        <div className="text-xs text-gray-500 text-center">
          <div>Status: {
            serviceStatus === 'checking' ? 'Checking...' :
            serviceStatus === 'running' ? 'Service Running' :
            'Service Not Running'
          }</div>
          {deviceInfo && serviceStatus === 'running' && (
            <div className="text-xs text-green-500 mt-1">
              Device: {deviceInfo.DeviceInfo?.DeviceName || 'Unknown'}
            </div>
          )}
          {lastError && (
            <div className="text-xs text-red-500 mt-1">
              {lastError}
            </div>
          )}
        </div>
      )}
      
      <Button
        type="button"
        onClick={captureFingerprint}
        disabled={isCapturing || (rdServiceUrl && serviceStatus !== 'running')}
        className="w-full bg-primary hover:bg-primary/90 transition-colors rounded-md"
      >
        <Fingerprint className="mr-2 h-4 w-4" />
        {!rdServiceUrl ? "Configure Device" : isCapturing ? "Capturing..." : "Capture"}
      </Button>
    </div>
  );
}
