import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Fingerprint, CheckCircle, AlertCircle, RefreshCw, X, Camera } from 'lucide-react';
import { toast } from "sonner";
import { HighQualityImageProcessor } from "@/utils/highQualityImageProcessor";

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
  targetQuality = 70
}: EnhancedRDServiceCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'captured' | 'failed'>('idle');
  const [imageData, setImageData] = useState<string>('');
  const [quality, setQuality] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [deviceConnected, setDeviceConnected] = useState(true); // Start with true since parent shows connected
  const [isInitialCheck, setIsInitialCheck] = useState(false);

  const backgroundCheckRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const lastSuccessfulCheck = useRef<number>(Date.now());

  // Simplified device connection check - only check if capture fails
  const checkDeviceConnection = useCallback(async (showLogs = false) => {
    if (!mountedRef.current) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch('https://localhost:8003/mfs100/info', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!mountedRef.current) return false;

      if (response.ok) {
        const data = await response.json();
        const isConnected = data.ErrorCode === "0";
        
        if (isConnected) {
          setDeviceConnected(true);
          setError('');
          lastSuccessfulCheck.current = Date.now();
          
          if (showLogs) {
            console.log('✅ Device connection verified:', data);
          }
        } else {
          setDeviceConnected(false);
          setError(data.ErrorDescription || 'Device not responding');
        }
        
        return isConnected;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (!mountedRef.current) return false;
      
      // Don't immediately mark as disconnected on single failure
      const timeSinceLastSuccess = Date.now() - lastSuccessfulCheck.current;
      
      if (timeSinceLastSuccess > 10000) { // Only mark disconnected after 10 seconds of failures
        setDeviceConnected(false);
        setError('Device connection lost');
        
        if (showLogs) {
          console.log('❌ Device connection lost:', error);
        }
      }
      
      return false;
    }
  }, []);

  // Initialize - assume device is connected since parent shows it as connected
  useEffect(() => {
    mountedRef.current = true;
    setDeviceConnected(true);
    setError('');
    lastSuccessfulCheck.current = Date.now();

    // Only check periodically in background (every 30 seconds)
    backgroundCheckRef.current = setInterval(() => {
      if (mountedRef.current && !isCapturing) {
        checkDeviceConnection(false);
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      if (backgroundCheckRef.current) {
        clearInterval(backgroundCheckRef.current);
        backgroundCheckRef.current = null;
      }
    };
  }, [checkDeviceConnection, isCapturing]);

  const handleCapture = useCallback(async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);
      setError('');
      
      console.log(`🎯 Starting capture for ${fingerName} with target quality: ${targetQuality}%`);
      toast.info(`Place ${fingerName} firmly on scanner...`, { duration: 4000 });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch('https://localhost:8003/mfs100/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Quality: targetQuality,
          TimeOut: 20
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!mountedRef.current) return;

      if (response.ok) {
        const data = await response.json();
        
        if (data.ErrorCode === "0") {
          const captureQuality = data.Quality || 0;
          
          console.log(`📊 Capture success for ${fingerName}:`, {
            quality: captureQuality,
            target: targetQuality,
            bitmapAvailable: !!data.BitmapData
          });
          
          let processedImage = "";
          
          if (data.BitmapData) {
            processedImage = HighQualityImageProcessor.processFingerprint(
              data.BitmapData,
              data.InWidth || 256,
              data.InHeight || 256
            );
          }
          
          if (processedImage) {
            setImageData(processedImage);
            setQuality(captureQuality);
            setCaptureStatus('captured');
            setDeviceConnected(true); // Capture succeeded, so device is connected
            lastSuccessfulCheck.current = Date.now();
            
            onCaptureSuccess(
              data.IsoTemplate || '',
              captureQuality,
              processedImage
            );
            
            const qualityMessage = captureQuality >= 80 ? 'Excellent' : 
                                 captureQuality >= 70 ? 'Good' : 
                                 captureQuality >= 60 ? 'Fair' : 'Poor';
            
            console.log(`✅ ${fingerName} capture complete! Quality: ${captureQuality}% (${qualityMessage})`);
            toast.success(`${fingerName} captured! Quality: ${captureQuality}% (${qualityMessage})`);
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
      
      // Only mark as disconnected if it's a connection-related error
      if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('aborted') || errorMessage.includes('timeout')) {
        setDeviceConnected(false);
        toast.error(`Device connection lost during capture. Please check device.`);
        // Try to reconnect after a brief delay
        setTimeout(() => {
          if (mountedRef.current) {
            checkDeviceConnection(true);
          }
        }, 2000);
      } else {
        toast.error(`${fingerName} capture failed: ${errorMessage}`);
      }
      
      onCaptureError(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsCapturing(false);
      }
    }
  }, [isCapturing, fingerName, onCaptureSuccess, onCaptureError, targetQuality, checkDeviceConnection]);

  const handleClear = useCallback(() => {
    setImageData('');
    setQuality(null);
    setCaptureStatus('idle');
    setError('');
    toast.info(`${fingerName} cleared - ready for new capture`);
  }, [fingerName]);

  const handleReconnect = useCallback(async () => {
    try {
      toast.info('Reconnecting device...');
      setError('');
      setDeviceConnected(true); // Optimistically set as connected
      const isConnected = await checkDeviceConnection(true);
      
      if (isConnected) {
        toast.success('Device reconnected successfully');
      } else {
        setDeviceConnected(false);
        toast.error('Failed to reconnect. Please check device connection.');
      }
    } catch (error) {
      setDeviceConnected(false);
      toast.error('Device reconnection failed');
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

  const getQualityBadgeVariant = () => {
    if (!quality) return "secondary";
    if (quality >= 80) return "default";
    if (quality >= 70) return "secondary";
    return "destructive";
  };

  return (
    <Card className="relative border-2 border-primary/20">
      <CardContent className="p-4">
        <div className="flex flex-col items-center space-y-3">
          {/* Fingerprint Preview */}
          <div className="relative">
            <div className={`w-28 h-32 rounded-lg border-2 border-dashed ${getStatusColor().replace('bg-', 'border-')} flex items-center justify-center overflow-hidden bg-gray-50`}>
              {imageData ? (
                <img 
                  src={imageData} 
                  alt={`${fingerName} capture`}
                  className="w-full h-full object-cover rounded-md"
                />
              ) : (
                <div className="text-center">
                  <Fingerprint className="h-10 w-10 text-gray-400 mx-auto mb-1" />
                  <div className="text-xs text-gray-500">High Quality</div>
                </div>
              )}
            </div>
            
            {/* Status indicator */}
            <div className="absolute -top-1 -right-1">
              {getStatusIcon()}
            </div>

            {/* Quality indicator */}
            {captureStatus === 'captured' && quality && quality >= 80 && (
              <div className="absolute -top-1 -left-1">
                <div className="bg-yellow-500 text-white rounded-full p-1">
                  <Camera className="h-3 w-3" />
                </div>
              </div>
            )}
          </div>

          {/* Finger name and quality */}
          <div className="text-center">
            <div className="text-sm font-medium">{fingerName}</div>
            {quality && (
              <Badge variant={getQualityBadgeVariant()} className="mt-1">
                {quality}% {quality >= 80 && "⭐"}
              </Badge>
            )}
          </div>

          {/* Device status */}
          <div className="flex items-center space-x-2">
            <Badge variant={deviceConnected ? "default" : "destructive"} className="text-xs">
              {isInitialCheck ? 'Checking...' : deviceConnected ? 'Device Ready' : 'Device Error'}
            </Badge>
            {deviceConnected && (
              <div className="text-xs text-green-600">Connected</div>
            )}
          </div>

          {/* Action buttons */}
          <div className="w-full space-y-2">
            {captureStatus === 'idle' && (
              <Button
                size="sm"
                onClick={handleCapture}
                disabled={isCapturing || isInitialCheck}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Camera className="h-4 w-4 mr-1" />
                {isCapturing ? 'Capturing...' : 'Capture High Quality'}
              </Button>
            )}

            {captureStatus === 'captured' && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCapture}
                  disabled={isCapturing}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Recapture
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
                  disabled={isCapturing}
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
          {error && !deviceConnected && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Quality tips */}
          {captureStatus === 'idle' && deviceConnected && (
            <div className="text-xs text-center text-gray-500 bg-blue-50 p-2 rounded">
              💡 Press finger firmly, keep steady, ensure clean scanner
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
