import { useState } from "react";
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

  const captureFingerprint = async () => {
    try {
      setIsCapturing(true);
      // First check if the service is running
      const checkResponse = await fetch('http://localhost:11100/rd/info');
      
      if (!checkResponse.ok) {
        toast.error("Please ensure Mantra RD Service is running");
        return;
      }

      // Capture fingerprint
      const captureResponse = await fetch('http://localhost:11100/rd/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "Template": "1",
          "Quality": "60",
          "TimeOut": "10000",
          "Format": "ISO"
        })
      });

      if (!captureResponse.ok) {
        throw new Error('Failed to capture fingerprint');
      }

      const data = await captureResponse.json();
      
      if (data.ErrorCode === "0") {
        onChange(data.Data);
        toast.success(`Fingerprint ${index + 1} captured successfully!`);
      } else {
        toast.error(`Error capturing fingerprint: ${data.ErrorDescription}`);
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
      <Button
        type="button"
        onClick={captureFingerprint}
        disabled={isCapturing}
        className="w-full bg-primary hover:bg-primary/90 transition-colors"
      >
        <Fingerprint className="mr-2 h-4 w-4" />
        {isCapturing ? "Capturing..." : "Capture"}
      </Button>
    </div>
  );
}