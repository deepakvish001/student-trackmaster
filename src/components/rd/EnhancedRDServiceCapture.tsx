
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Fingerprint, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react';
import { toast } from "sonner";

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
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [isInitialCheck, setIsInitialCheck] = useState(true);

  // Refs for managing intervals and preventing memory leaks
  const backgroundCheckRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Stable device check function with reduced frequency
  const checkDeviceConnection = useCallback(async (showLogs = false) => {
    if (!mountedRef.current) return false;

    try {
      const response = await fetch('https://localhost:8003/mfs100/info', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!mountedRef.current) return false;

      if (response.ok) {
        const data = await response.json();
        const isConnected = data.ErrorCode === "0";
        
        setDeviceConnected(isConnected);
        setError(isConnected ? '' : 'Device not responding');
        
        if (showLogs && isConnected) {
          console.log('✅ Device check passed:', data);
        }
        
        return isConnected;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (!mountedRef.current) return false;
      
      const isConnected = false;
      setDeviceConnected(isConnected);
      setError('Device connection failed');
      
      if (showLogs) {
        console.log('❌ Device check failed:', error);
      }
      
      return isConnected;
    }
  }, []);

  // Initial device check and setup background monitoring
  useEffect(() => {
    mountedRef.current = true;

    // Initial check
    const performInitialCheck = async () => {
      const isConnected = await checkDeviceConnection(true);
      setIsInitialCheck(false);
      
      if (isConnected) {
        console.log('🔗 Device connected successfully');
        toast.success('Device connected and ready');
      }
    };

    performInitialCheck();

    // Setup background check (every 30 seconds - much less frequent)
    backgroundCheckRef.current = setInterval(() => {
      if (mountedRef.current && !isCapturing) {
        checkDeviceConnection(false);
      }
    }, 30000); // 30 seconds instead of 5 seconds

    return () => {
      mountedRef.current = false;
      if (backgroundCheckRef.current) {
        clearInterval(backgroundCheckRef.current);
        backgroundCheckRef.current = null;
      }
    };
  }, [checkDeviceConnection, isCapturing]);

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
        let pixelValue = 255 - binaryData.charCodeAt(i);
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.3 + 20));
        
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
    if (isCapturing || !deviceConnected) return;

    try {
      setIsCapturing(true);
      setError('');
      
      console.log(`🔍 Starting capture for ${fingerName}`);
      toast.info(`Place ${fingerName} on scanner and wait for light...`, { duration: 4000 });
      
      // Direct capture without additional device checks
      const response = await fetch('https://localhost:8003/mfs100/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Quality: targetQuality,
          TimeOut: 20 // Increased timeout for better capture
        }),
        signal: AbortSignal.timeout(25000) // 25 second timeout
      });

      if (!mountedRef.current) return;

      if (response.ok) {
        const data = await response.json();
        
        if (data.ErrorCode === "0") {
          const captureQuality = data.Quality || 0;
          let processedImage = "";
          
          if (data.BitmapData) {
            processedImage = processBitmapToImage(
              data.BitmapData,
              data.InWidth || 256,
              data.InHeight || 256
            );
          }
          
          if (processedImage) {
            setImageData(processedImage);
            setQuality(captureQuality);
            setCaptureStatus('captured');
            
            onCaptureSuccess(
              data.IsoTemplate || '',
              captureQuality,
              processedImage
            );
            
            console.log(`✅ ${fingerName} captured successfully! Quality: ${captureQuality}%`);
            toast.success(`${fingerName} captured! Quality: ${captureQuality}%`);
          } else {
            throw new Error("Failed to process fingerprint image");
          }
        } else {
          throw new Error(data.ErrorDescription || 'Capture failed');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      console.error(`❌ Capture error for ${fingerName}:`, error);
      
      setError(errorMessage);
      setCaptureStatus('failed');
      
      // Check if it's a device disconnection error
      if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        setDeviceConnected(false);
        toast.error(`Device disconnected. Please reconnect and try again.`);
      } else {
        toast.error(`${fingerName} capture failed: ${errorMessage}`);
      }
      
      onCaptureError(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsCapturing(false);
      }
    }
  }, [isCapturing, deviceConnected, fingerName, onCaptureSuccess, onCaptureError, processBitmapToImage, targetQuality]);

  const handleClear = useCallback(() => {
    setImageData('');
    setQuality(null);
    setCaptureStatus('idle');
    setError('');
    toast.info(`${fingerName} cleared`);
  }, [fingerName]);

  const handleReconnect = useCallback(async () => {
    try {
      toast.info('Reconnecting device...');
      setError('');
      const isConnected = await checkDeviceConnection(true);
      
      if (isConnected) {
        toast.success('Device reconnected successfully');
      } else {
        toast.error('Failed to reconnect. Please check device connection.');
      }
    } catch (error) {
      toast.error('Reconnection failed');
    }
  }, [checkDeviceConnection]);

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

          {/* Device status */}
          <div className="flex items-center space-x-2">
            <Badge variant={deviceConnected ? "default" : "destructive"}>
              {isInitialCheck ? 'Checking...' : deviceConnected ? 'Device Ready' : 'Device Disconnected'}
            </Badge>
          </div>

          {/* Action buttons */}
          <div className="w-full space-y-2">
            {captureStatus === 'idle' && (
              <Button
                size="sm"
                onClick={handleCapture}
                disabled={isCapturing || !deviceConnected || isInitialCheck}
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
                  disabled={isCapturing || !deviceConnected}
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
                  disabled={isCapturing || !deviceConnected}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
                {!deviceConnected && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReconnect}
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
        </div>
      </CardContent>
    </Card>
  );
}
