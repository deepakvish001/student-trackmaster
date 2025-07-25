import React, { useState, useEffect } from 'react';
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

  const maxAttempts = 3;

  // Reset states when value changes
  useEffect(() => {
    if (value) {
      setLastError('');
      setAttempts(0);
    }
  }, [value]);

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
          imageLength: result.data.BitmapData?.length || 0
        });

        setQuality(result.data.Quality || null);
        
        // Store template data - use IsoTemplate from MFS100 response
        if (result.data.IsoTemplate) {
          onChange(result.data.IsoTemplate);
        }

        // Store image data if available - use BitmapData from MFS100 response
        if (result.data.BitmapData && onImageChange) {
          onImageChange(result.data.BitmapData);
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
    } finally {
      setIsCapturing(false);
      setCaptureProgress(0);
    }
  };

  const handleRetry = () => {
    setLastError('');
    setQuality(null);
    onChange('');
    if (onImageChange) {
      onImageChange('');
    }
  };

  const getStatusColor = () => {
    if (!isConnected) return 'bg-red-500';
    if (value) return 'bg-green-500';
    if (isCapturing) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (value) return 'Captured';
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
        {quality !== null && value && (
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
          {!value ? (
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
