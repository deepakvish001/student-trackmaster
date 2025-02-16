
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface FingerprintCaptureProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
}

export function FingerprintCapture({ index, value, onChange }: FingerprintCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'running' | 'not-running'>('checking');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [lastError, setLastError] = useState<string>("");
  const [isSecureContext, setIsSecureContext] = useState(false);

  useEffect(() => {
    setIsSecureContext(window.location.protocol === 'https:');
    checkServiceAndDevice();
    const interval = setInterval(checkServiceAndDevice, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkServiceAndDevice = async () => {
    try {
      if (window.location.protocol === 'https:') {
        setServiceStatus('not-running');
        setLastError("Please access this page using HTTP (not HTTPS) when running locally");
        return false;
      }

      console.log("Checking RD service status...");
      const response = await fetch('http://localhost:11100/rd/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          "Device": "Mantra",
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

  const verifyFingerprint = async (capturedData: string) => {
    try {
      const { data, error } = await supabase.rpc('verify_fingerprint', {
        fingerprint_data: capturedData,
        target_fingerprint: value || ''
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fingerprint verification error:', error);
      return { success: false, message: 'Failed to verify fingerprint' };
    }
  };

  const captureFingerprint = async () => {
    try {
      setIsCapturing(true);
      
      const isReady = await checkServiceAndDevice();
      
      if (!isReady) {
        toast.error(`Device not ready: ${lastError}. Please check device connection and try again.`);
        return;
      }

      console.log("Starting fingerprint capture...");
      
      const captureResponse = await fetch('http://localhost:11100/rd/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          "Device": "Mantra",
          "PGCount": "1",
          "PTimeout": "20000",
          "PidVer": "2.0",
          "Timeout": "11000",
          "Env": "P",
          "Format": "ISO",
          "Quality": "60",
          "Type": "CAPTURE",
          "PidType": "0",
          "DeviceId": deviceInfo?.DeviceInfo?.DeviceId || ""
        })
      });

      if (!captureResponse.ok) {
        throw new Error(`Capture failed: ${captureResponse.status} ${captureResponse.statusText}`);
      }

      const data = await captureResponse.json();
      console.log("Capture Response:", data);
      
      if (data.ErrorCode === "0") {
        // Verify the captured fingerprint
        const verificationResult = await verifyFingerprint(data.Data);
        
        if (verificationResult.success) {
          onChange(data.Data);
          toast.success(`Fingerprint ${index + 1} captured successfully!`);
        } else {
          toast.error(`Fingerprint verification failed: ${verificationResult.message}`);
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
      {isSecureContext && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            To use the fingerprint scanner, please access this page using HTTP instead of HTTPS. 
            Try using <strong>http://localhost:5173</strong> or your local development URL.
          </AlertDescription>
        </Alert>
      )}
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
        {lastError && (
          <div className="text-xs text-red-500 mt-1">
            {lastError}
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
