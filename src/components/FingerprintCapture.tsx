
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FingerprintCaptureProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
}

interface VerificationResponse {
  success: boolean;
  message: string;
}

interface MxFaceResponse {
  code: number;
  message: string;
  errorMessage?: string;
}

export function FingerprintCapture({ index, value, onChange }: FingerprintCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);

  const verifyFingerprint = async (capturedData: string): Promise<VerificationResponse> => {
    try {
      const { data, error } = await supabase.rpc('verify_fingerprint', {
        fingerprint_data: capturedData,
        target_fingerprint: value || ''
      });

      if (error) throw error;
      
      // Type assertion since we know the structure of our RPC function's response
      const result = data as { success: boolean; message: string };
      return result;
    } catch (error) {
      console.error('Fingerprint verification error:', error);
      return { success: false, message: 'Failed to verify fingerprint' };
    }
  };

  const enrollFingerprint = async (fingerprintData: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('enroll-fingerprint', {
        body: {
          fingerPrint: fingerprintData,
          externalId: `finger_${index + 1}`,
          group: 'students'
        }
      });

      if (error) throw error;
      return data as MxFaceResponse;
    } catch (error) {
      console.error('Fingerprint enrollment error:', error);
      throw error;
    }
  };

  const captureFingerprint = async () => {
    try {
      setIsCapturing(true);

      // Request user's permission to use the camera (which we'll use to capture the fingerprint)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = stream.getVideoTracks()[0];
      
      // Create a video element to display the camera feed
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Create a canvas to capture the frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      // Capture a frame from the video
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert the captured frame to base64
      const capturedData = canvas.toDataURL('image/jpeg').split(',')[1];

      // Stop the video stream
      videoTrack.stop();
      
      console.log("Captured fingerprint data, enrolling...");
      
      // Enroll the fingerprint
      const enrollmentResult = await enrollFingerprint(capturedData);
      
      if (enrollmentResult.code === 200) {
        // Store the fingerprint data
        onChange(capturedData);
        toast.success(`Fingerprint ${index + 1} captured and enrolled successfully!`);
      } else {
        throw new Error(enrollmentResult.errorMessage || enrollmentResult.message);
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
