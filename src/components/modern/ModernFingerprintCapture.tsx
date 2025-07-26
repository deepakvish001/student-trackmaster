
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { useModernDeviceConnection } from "@/hooks/useModernDeviceConnection";
import { Fingerprint, Wifi, WifiOff, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface ModernFingerprintCaptureProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
  onImageChange?: (imageData: string) => void;
  targetQuality?: number;
}

export function ModernFingerprintCapture({
  index,
  value,
  onChange,
  onImageChange,
  targetQuality = 60
}: ModernFingerprintCaptureProps) {
  const { 
    isConnected, 
    deviceInfo, 
    connectionStatus, 
    client,
    reconnect 
  } = useModernDeviceConnection();

  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [lastError, setLastError] = useState<string>('');
  const [quality, setQuality] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [processedImageData, setProcessedImageData] = useState<string>('');

  const maxAttempts = 3;

  // Reset states when value changes
  useEffect(() => {
    if (value) {
      setLastError('');
      setAttempts(0);
    }
  }, [value]);

  // Fixed process raw bitmap data into displayable image format
  const processFingerprintBitmap = useCallback((bitmapData: string, deviceWidth?: number, deviceHeight?: number): string => {
    try {
      if (!bitmapData || bitmapData.length === 0) {
        console.warn('No bitmap data provided for processing');
        return "";
      }

      // Use standard MFS100 dimensions or fallback to device reported dimensions
      const width = Math.floor(deviceWidth || 256);
      const height = Math.floor(deviceHeight || 256);
      
      // Validate dimensions
      if (width <= 0 || height <= 0 || !Number.isInteger(width) || !Number.isInteger(height)) {
        console.error('Invalid canvas dimensions:', { width, height, deviceWidth, deviceHeight });
        return "";
      }

      console.log(`Processing fingerprint bitmap for finger ${index + 1}: ${bitmapData.length} bytes, dimensions: ${width}x${height}`);
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Convert base64 bitmap data to binary
      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      // Process each pixel - MFS100 provides raw grayscale bitmap data
      const totalPixels = Math.min(binaryData.length, width * height);
      
      for (let i = 0; i < totalPixels; i++) {
        let pixelValue = binaryData.charCodeAt(i);
        
        // Invert the pixel values - MFS100 typically returns inverted images
        pixelValue = 255 - pixelValue;
        
        // Apply contrast and brightness enhancement
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.3 + 20));
        
        const pixelIndex = i * 4;
        if (pixelIndex + 3 < data.length) {
          data[pixelIndex] = pixelValue;     // Red
          data[pixelIndex + 1] = pixelValue; // Green
          data[pixelIndex + 2] = pixelValue; // Blue
          data[pixelIndex + 3] = 255;        // Alpha (fully opaque)
        }
      }
      
      // Put the processed image data onto the canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to high-quality PNG data URI
      const result = canvas.toDataURL('image/png', 1.0);
      console.log(`✅ Fingerprint image processed successfully for finger ${index + 1}, result length: ${result.length}`);
      
      return result;
      
    } catch (error) {
      console.error('Fingerprint bitmap processing error:', error);
      return "";
    }
  }, [index]);

  const handleCapture = async () => {
    if (!isConnected || !client) {
      setLastError('Device not connected. Please connect your MFS100 device.');
      return;
    }

    if (isCapturing) return;

    try {
      setIsCapturing(true);
      setLastError('');
      setCaptureProgress(0);
      setAttempts(prev => prev + 1);

      console.log(`Starting modern fingerprint capture for finger ${index + 1} (attempt ${attempts + 1})`);

      // Progress simulation
      const progressInterval = setInterval(() => {
        setCaptureProgress(prev => Math.min(prev + 20, 90));
      }, 200);

      // Capture fingerprint using modern client with all required properties
      const result = await client.captureFingerprint({
        timeout: 15000,
        quality: targetQuality,
        retries: 3
      });

      clearInterval(progressInterval);
      setCaptureProgress(100);

      // Check for successful capture using correct MFS100Response structure
      if (result.httpStaus && result.data && result.data.ErrorCode === "0") {
        console.log('Modern capture successful:', {
          finger: index + 1,
          quality: result.data.Quality,
          templateLength: result.data.IsoTemplate?.length || 0,
          imageLength: result.data.BitmapData?.length || 0,
          actualDimensions: {
            width: result.data.InWidth,
            height: result.data.InHeight
          }
        });

        setQuality(result.data.Quality || null);
        
        // Store template data - use IsoTemplate from MFS100 response
        if (result.data.IsoTemplate) {
          onChange(result.data.IsoTemplate);
        }

        // Process and store image data if available
        if (result.data.BitmapData) {
          // Use proper integer dimensions from device response
          const imageWidth = Math.floor(result.data.InWidth || 256);
          const imageHeight = Math.floor(result.data.InHeight || 256);
          
          const processedImage = processFingerprintBitmap(
            result.data.BitmapData,
            imageWidth,
            imageHeight
          );
          
          if (processedImage) {
            setProcessedImageData(processedImage);
            if (onImageChange) {
              onImageChange(processedImage);
            }
            console.log(`✅ Processed fingerprint image for finger ${index + 1}, length: ${processedImage.length}`);
          } else {
            console.warn(`Failed to process image for finger ${index + 1}`);
          }
        }

        setLastError('');
      } else {
        throw new Error(result.err || result.data?.ErrorDescription || 'Capture failed');
      }

    } catch (error) {
      console.error(`Modern capture failed for finger ${index + 1}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown capture error';
      setLastError(errorMessage);
      setQuality(null);
      setProcessedImageData('');
    } finally {
      setIsCapturing(false);
      setCaptureProgress(0);
    }
  };

  const handleRetry = () => {
    setLastError('');
    setQuality(null);
    setProcessedImageData('');
    onChange('');
    if (onImageChange) {
      onImageChange('');
    }
  };

  const getStatusColor = () => {
    if (!isConnected) return 'bg-red-500';
    if (value && processedImageData) return 'bg-green-500';
    if (isCapturing) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (value && processedImageData) return 'Captured';
    if (isCapturing) return 'Capturing...';
    return 'Ready';
  };

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Finger {index + 1}</span>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
              {getStatusText()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Device Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {connectionStatus}
            </span>
          </div>
          {deviceInfo && (
            <span className="text-xs text-gray-500">
              {deviceInfo.model || 'MFS100'}
            </span>
          )}
        </div>

        {/* Fingerprint Display */}
        <div className="flex justify-center">
          <FingerprintDisplay
            value={value}
            imageData={processedImageData}
            index={index}
            quality={quality}
            isCapturing={isCapturing}
            showQuality={true}
          />
        </div>

        {/* Capture Progress */}
        {isCapturing && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${captureProgress}%` }}
              />
            </div>
            <p className="text-sm text-center text-gray-600">
              Place finger on sensor... ({captureProgress}%)
            </p>
          </div>
        )}

        {/* Quality Indicator */}
        {quality !== null && (value || processedImageData) && (
          <div className="flex items-center justify-center space-x-2">
            {quality >= targetQuality ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
            <span className={`text-sm font-medium ${
              quality >= targetQuality ? 'text-green-600' : 'text-yellow-600'
            }`}>
              Quality: {quality}%
            </span>
          </div>
        )}

        {/* Error Display */}
        {lastError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {lastError}
              {attempts >= maxAttempts && (
                <span className="block mt-1 text-xs">
                  Maximum attempts reached. Please try reconnecting the device.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {!value || !processedImageData ? (
            <Button
              onClick={handleCapture}
              disabled={!isConnected || isCapturing || attempts >= maxAttempts}
              className="flex-1"
              variant="default"
            >
              {isCapturing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Capture
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleRetry}
              variant="outline"
              className="flex-1"
            >
              Recapture
            </Button>
          )}

          {!isConnected && (
            <Button
              onClick={reconnect}
              variant="secondary"
              size="sm"
            >
              Reconnect
            </Button>
          )}
        </div>

        {/* Device Info */}
        {deviceInfo && isConnected && (
          <div className="text-xs text-gray-500 text-center space-y-1">
            <div>Serial: {deviceInfo.serialNumber || 'Unknown'}</div>
            <div>Version: {deviceInfo.version || 'Unknown'}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
