
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, RefreshCw, CheckCircle2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useGlobalMFS100 } from '@/hooks/useGlobalMFS100';

interface FingerprintCaptureCardProps {
  index: number;
  fingerName: string;
  onCaptureSuccess: (index: number, template: string, image: string, quality: number) => void;
}

export function FingerprintCaptureCard({ index, fingerName, onCaptureSuccess }: FingerprintCaptureCardProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [quality, setQuality] = useState<number>(0);
  
  const { captureFingerprint, isDeviceConnected } = useGlobalMFS100();

  const handleCapture = async () => {
    if (!isDeviceConnected) {
      toast.error('Device not connected. Please connect the fingerprint device.');
      return;
    }

    try {
      setIsCapturing(true);
      
      const result = await captureFingerprint();
      
      if (result && result.template && result.imageData) {
        setCapturedImage(result.imageData);
        setQuality(result.quality || 0);
        setIsCaptured(true);
        
        onCaptureSuccess(index, result.template, result.imageData, result.quality || 0);
        
        toast.success(`${fingerName} captured successfully!`, {
          description: `Quality: ${result.quality || 0}%`
        });
      } else {
        toast.error('Failed to capture fingerprint. Please try again.');
      }
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      toast.error('Failed to capture fingerprint. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRecapture = () => {
    setIsCaptured(false);
    setCapturedImage('');
    setQuality(0);
    handleCapture();
  };

  return (
    <Card className={`relative transition-all duration-300 ${
      isCaptured 
        ? 'border-green-300 bg-green-50/50' 
        : isCapturing 
        ? 'border-blue-300 bg-blue-50/50' 
        : 'border-slate-200 hover:border-slate-300'
    }`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{fingerName}</span>
          {isCaptured && (
            <Badge className="bg-green-500 text-white text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Captured
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Fingerprint Preview */}
        <div className="aspect-square bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
          {capturedImage ? (
            <img 
              src={capturedImage} 
              alt={`${fingerName} fingerprint`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center text-slate-400">
              <Fingerprint className="h-8 w-8 mx-auto mb-2" />
              <p className="text-xs">Not captured</p>
            </div>
          )}
        </div>

        {/* Quality Score */}
        {quality > 0 && (
          <div className="text-center">
            <Badge variant={quality >= 70 ? "default" : quality >= 50 ? "secondary" : "destructive"} className="text-xs">
              Quality: {quality}%
            </Badge>
          </div>
        )}

        {/* Capture Button */}
        <Button
          onClick={isCaptured ? handleRecapture : handleCapture}
          disabled={isCapturing || !isDeviceConnected}
          size="sm"
          variant={isCaptured ? "outline" : "default"}
          className="w-full"
        >
          {isCapturing ? (
            <>
              <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
              Capturing...
            </>
          ) : isCaptured ? (
            <>
              <RefreshCw className="mr-2 h-3 w-3" />
              Recapture
            </>
          ) : (
            <>
              <Camera className="mr-2 h-3 w-3" />
              Capture
            </>
          )}
        </Button>

        {!isDeviceConnected && (
          <p className="text-xs text-red-500 text-center">Device not connected</p>
        )}
      </CardContent>
    </Card>
  );
}
