
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Fingerprint, CheckCircle, AlertCircle, RefreshCw, X, Camera } from 'lucide-react';
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
  targetQuality = 70  // Increased default quality threshold
}: EnhancedRDServiceCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'captured' | 'failed'>('idle');
  const [imageData, setImageData] = useState<string>('');
  const [quality, setQuality] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [isInitialCheck, setIsInitialCheck] = useState(true);

  const backgroundCheckRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Enhanced device connection check with better error handling
  const checkDeviceConnection = useCallback(async (showLogs = false) => {
    if (!mountedRef.current) return false;

    try {
      const response = await fetch('https://localhost:8003/mfs100/info', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(3000)
      });

      if (!mountedRef.current) return false;

      if (response.ok) {
        const data = await response.json();
        const isConnected = data.ErrorCode === "0";
        
        setDeviceConnected(isConnected);
        setError(isConnected ? '' : 'Device not responding');
        
        if (showLogs && isConnected) {
          console.log('✅ High-quality device ready:', data);
        }
        
        return isConnected;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (!mountedRef.current) return false;
      
      setDeviceConnected(false);
      setError('Device connection failed');
      
      if (showLogs) {
        console.log('❌ Device check failed:', error);
      }
      
      return false;
    }
  }, []);

  // Enhanced bitmap processing for ultra-high quality images
  const processHighQualityBitmap = useCallback((bitmapData: string, width: number = 256, height: number = 256): string => {
    try {
      if (!bitmapData || bitmapData.length === 0) {
        return "";
      }

      console.log(`🎯 Processing high-quality bitmap for ${fingerName}:`, {
        dataLength: bitmapData.length,
        dimensions: `${width}x${height}`
      });

      // Create high-resolution canvas (2x scale for better quality)
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Convert base64 to binary data
      const binaryData = atob(bitmapData);
      const originalImageData = ctx.createImageData(width, height);
      const originalData = originalImageData.data;
      
      // Process each pixel with enhanced algorithms
      const totalPixels = Math.min(binaryData.length, width * height);
      
      for (let i = 0; i < totalPixels; i++) {
        let pixelValue = binaryData.charCodeAt(i);
        
        // Invert for proper fingerprint display
        pixelValue = 255 - pixelValue;
        
        // Advanced contrast enhancement using S-curve
        let normalized = pixelValue / 255;
        if (normalized < 0.5) {
          normalized = 2 * normalized * normalized;
        } else {
          normalized = 1 - 2 * (1 - normalized) * (1 - normalized);
        }
        pixelValue = normalized * 255;
        
        // Apply sharpening and noise reduction
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.4 - 35));
        
        const pixelIndex = i * 4;
        if (pixelIndex + 3 < originalData.length) {
          originalData[pixelIndex] = pixelValue;
          originalData[pixelIndex + 1] = pixelValue;
          originalData[pixelIndex + 2] = pixelValue;
          originalData[pixelIndex + 3] = 255;
        }
      }
      
      // Create temporary canvas for original size
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Failed to get temp canvas context');
      
      tempCtx.putImageData(originalImageData, 0, 0);
      
      // Scale up with high-quality interpolation
      ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, canvas.width, canvas.height);
      
      // Apply additional sharpening filter
      const scaledImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const scaledData = scaledImageData.data;
      
      // Simple sharpening kernel
      const sharpening = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ];
      
      // Apply sharpening (simplified for performance)
      for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
          const idx = (y * canvas.width + x) * 4;
          let sum = 0;
          
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pixel = ((y + ky) * canvas.width + (x + kx)) * 4;
              sum += scaledData[pixel] * sharpening[(ky + 1) * 3 + (kx + 1)];
            }
          }
          
          sum = Math.min(255, Math.max(0, sum));
          scaledData[idx] = sum;
          scaledData[idx + 1] = sum;
          scaledData[idx + 2] = sum;
        }
      }
      
      ctx.putImageData(scaledImageData, 0, 0);
      
      // Convert to ultra-high quality PNG
      const result = canvas.toDataURL('image/png', 1.0);
      
      console.log(`✅ Ultra-high quality image processed for ${fingerName}:`, {
        originalSize: bitmapData.length,
        processedSize: result.length,
        scale: scale,
        resolution: `${canvas.width}x${canvas.height}`
      });
      
      return result;
    } catch (error) {
      console.error('High-quality bitmap processing error:', error);
      return "";
    }
  }, [fingerName]);

  // Initialize with device check
  useEffect(() => {
    mountedRef.current = true;

    const performInitialCheck = async () => {
      const isConnected = await checkDeviceConnection(true);
      setIsInitialCheck(false);
      
      if (isConnected) {
        console.log('🔗 High-quality capture device ready');
        toast.success('High-quality fingerprint device connected');
      }
    };

    performInitialCheck();

    // Background monitoring (every 30 seconds)
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
    if (isCapturing || !deviceConnected) return;

    try {
      setIsCapturing(true);
      setError('');
      
      console.log(`🎯 Starting high-quality capture for ${fingerName} with target quality: ${targetQuality}%`);
      toast.info(`Place ${fingerName} firmly on scanner for high-quality capture...`, { duration: 5000 });
      
      // Enhanced capture settings for better quality
      const response = await fetch('https://localhost:8003/mfs100/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Quality: targetQuality,
          TimeOut: 25  // Longer timeout for better quality capture
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!mountedRef.current) return;

      if (response.ok) {
        const data = await response.json();
        
        if (data.ErrorCode === "0") {
          const captureQuality = data.Quality || 0;
          
          console.log(`📊 Capture quality analysis for ${fingerName}:`, {
            quality: captureQuality,
            target: targetQuality,
            bitmapAvailable: !!data.BitmapData,
            templateAvailable: !!data.IsoTemplate
          });
          
          let processedImage = "";
          
          if (data.BitmapData) {
            processedImage = processHighQualityBitmap(
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
            
            const qualityMessage = captureQuality >= 80 ? 'Excellent' : 
                                 captureQuality >= 70 ? 'Good' : 
                                 captureQuality >= 60 ? 'Fair' : 'Poor';
            
            console.log(`✅ ${fingerName} high-quality capture complete! Quality: ${captureQuality}% (${qualityMessage})`);
            toast.success(`${fingerName} captured! Quality: ${captureQuality}% (${qualityMessage})`);
          } else {
            throw new Error("Failed to process high-quality fingerprint image");
          }
        } else {
          throw new Error(data.ErrorDescription || 'High-quality capture failed');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'High-quality capture failed';
      console.error(`❌ High-quality capture error for ${fingerName}:`, error);
      
      setError(errorMessage);
      setCaptureStatus('failed');
      
      if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        setDeviceConnected(false);
        toast.error(`High-quality capture device disconnected. Please reconnect.`);
      } else {
        toast.error(`${fingerName} high-quality capture failed: ${errorMessage}`);
      }
      
      onCaptureError(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsCapturing(false);
      }
    }
  }, [isCapturing, deviceConnected, fingerName, onCaptureSuccess, onCaptureError, processHighQualityBitmap, targetQuality]);

  const handleClear = useCallback(() => {
    setImageData('');
    setQuality(null);
    setCaptureStatus('idle');
    setError('');
    toast.info(`${fingerName} cleared - ready for new high-quality capture`);
  }, [fingerName]);

  const handleReconnect = useCallback(async () => {
    try {
      toast.info('Reconnecting high-quality capture device...');
      setError('');
      const isConnected = await checkDeviceConnection(true);
      
      if (isConnected) {
        toast.success('High-quality capture device reconnected');
      } else {
        toast.error('Failed to reconnect. Please check device connection.');
      }
    } catch (error) {
      toast.error('High-quality device reconnection failed');
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
          {/* Enhanced Fingerprint Preview */}
          <div className="relative">
            <div className={`w-28 h-32 rounded-lg border-2 border-dashed ${getStatusColor().replace('bg-', 'border-')} flex items-center justify-center overflow-hidden bg-gray-50`}>
              {imageData ? (
                <img 
                  src={imageData} 
                  alt={`${fingerName} high-quality capture`}
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

          {/* Enhanced device status */}
          <div className="flex items-center space-x-2">
            <Badge variant={deviceConnected ? "default" : "destructive"} className="text-xs">
              {isInitialCheck ? 'Initializing...' : deviceConnected ? 'HQ Device Ready' : 'Device Disconnected'}
            </Badge>
            {deviceConnected && (
              <div className="text-xs text-green-600">High Quality Mode</div>
            )}
          </div>

          {/* Enhanced action buttons */}
          <div className="w-full space-y-2">
            {captureStatus === 'idle' && (
              <Button
                size="sm"
                onClick={handleCapture}
                disabled={isCapturing || !deviceConnected || isInitialCheck}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Camera className="h-4 w-4 mr-1" />
                {isCapturing ? 'Capturing HQ...' : 'Capture High Quality'}
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
                  disabled={isCapturing || !deviceConnected}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry HQ
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

          {/* Quality tips */}
          {captureStatus === 'idle' && deviceConnected && (
            <div className="text-xs text-center text-gray-500 bg-blue-50 p-2 rounded">
              💡 For best quality: Press finger firmly, keep steady, ensure clean scanner
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
