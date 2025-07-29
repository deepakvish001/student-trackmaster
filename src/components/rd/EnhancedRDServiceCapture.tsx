
import React, { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Fingerprint, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react';
import { toast } from "sonner";
import { mfs100SessionManager } from '@/services/mfs100SessionManager';

interface EnhancedRDServiceCaptureProps {
  index: number;
  fingerName: string;
  onCaptureSuccess: (pidData: string, quality: number, imageData?: string) => void;
  onCaptureError: (error: string) => void;
  targetQuality?: number;
}

export function EnhancedRDServiceCapture({
  index,
  fingerName,
  onCaptureSuccess,
  onCaptureError,
  targetQuality = 60
}: EnhancedRDServiceCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'captured' | 'failed'>('idle');
  const [imageData, setImageData] = useState<string>('');
  const [quality, setQuality] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [sessionStatus, setSessionStatus] = useState(mfs100SessionManager.getSessionStatus());

  // Monitor session status
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionStatus(mfs100SessionManager.getSessionStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const processBitmapToImage = useCallback((bitmapData: string, width: number = 256, height: number = 256): string => {
    try {
      if (!bitmapData || bitmapData.length === 0) {
        return "";
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      const totalPixels = Math.min(binaryData.length, width * height);
      
      for (let i = 0; i < totalPixels; i++) {
        let pixelValue = 255 - binaryData.charCodeAt(i); // Invert
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.3 + 20)); // Enhance contrast
        
        const pixelIndex = i * 4;
        if (pixelIndex + 3 < data.length) {
          data[pixelIndex] = pixelValue;
          data[pixelIndex + 1] = pixelValue;
          data[pixelIndex + 2] = pixelValue;
          data[pixelIndex + 3] = 255;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL('image/png', 1.0);
    } catch (error) {
      console.error('Bitmap processing error:', error);
      return "";
    }
  }, []);

  const handleCapture = useCallback(async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);
      setError('');
      
      toast.info(`Place ${fingerName} on scanner`, { duration: 4000 });
      
      // Use session manager for capture
      const result = await mfs100SessionManager.captureWithSession(60, 20);
      
      if (result.httpStaus && result.data?.ErrorCode === "0") {
        const captureQuality = result.data.Quality || 0;
        let processedImage = "";
        
        if (result.data.BitmapData) {
          processedImage = processBitmapToImage(
            result.data.BitmapData,
            result.data.InWidth || 256,
            result.data.InHeight || 256
          );
        }
        
        if (processedImage) {
          setImageData(processedImage);
          setQuality(captureQuality);
          setCaptureStatus('captured');
          
          onCaptureSuccess(
            result.data.IsoTemplate || '',
            captureQuality,
            processedImage
          );
          
          toast.success(`${fingerName} captured! Quality: ${captureQuality}%`);
        } else {
          throw new Error("Failed to process fingerprint image");
        }
      } else {
        throw new Error(result.data?.ErrorDescription || 'Capture failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      setError(errorMessage);
      setCaptureStatus('failed');
      toast.error(`${fingerName} capture failed: ${errorMessage}`);
      onCaptureError(errorMessage);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, fingerName, onCaptureSuccess, onCaptureError, processBitmapToImage]);

  const handleClear = useCallback(() => {
    setImageData('');
    setQuality(null);
    setCaptureStatus('idle');
    setError('');
    toast.info(`${fingerName} cleared`);
  }, [fingerName]);

  const handleForceReconnect = useCallback(async () => {
    try {
      toast.info('Reconnecting device...');
      await mfs100SessionManager.forceReconnect();
      toast.success('Device reconnected');
    } catch (error) {
      toast.error('Failed to reconnect device');
    }
  }, []);

  const getStatusColor = () => {
    switch (captureStatus) {
      case 'captured': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = () => {
    switch (captureStatus) {
      case 'captured': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <Card className="relative">
      <CardContent className="p-4">
        <div className="flex flex-col items-center space-y-3">
          {/* Fingerprint Preview */}
          <div className="relative">
            <div className={`w-24 h-24 rounded-lg border-2 border-dashed ${getStatusColor().replace('bg-', 'border-')} flex items-center justify-center overflow-hidden`}>
              {imageData ? (
                <img 
                  src={imageData} 
                  alt={fingerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Fingerprint className="h-8 w-8 text-gray-400" />
              )}
            </div>
            
            {/* Status indicator */}
            <div className="absolute -top-1 -right-1">
              {getStatusIcon()}
            </div>
          </div>

          {/* Finger name and quality */}
          <div className="text-center">
            <div className="text-sm font-medium">{fingerName}</div>
            {quality && (
              <Badge variant={quality >= 70 ? "default" : "secondary"} className="mt-1">
                {quality}%
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          <div className="w-full space-y-2">
            {captureStatus === 'idle' && (
              <Button
                size="sm"
                onClick={handleCapture}
                disabled={isCapturing || !sessionStatus.deviceConnected}
                className="w-full"
              >
                <Fingerprint className="h-4 w-4 mr-1" />
                {isCapturing ? 'Capturing...' : 'Capture'}
              </Button>
            )}

            {captureStatus === 'captured' && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCapture}
                  disabled={isCapturing || !sessionStatus.deviceConnected}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClear}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            )}

            {captureStatus === 'failed' && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={handleCapture}
                  disabled={isCapturing || !sessionStatus.deviceConnected}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
                {!sessionStatus.deviceConnected && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleForceReconnect}
                    className="flex-1"
                  >
                    Reconnect
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Session status */}
          {!sessionStatus.deviceConnected && (
            <div className="text-xs text-red-600 text-center">
              Device Disconnected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
