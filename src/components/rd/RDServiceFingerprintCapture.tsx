
/**
 * RD Service Fingerprint Capture Component
 * UIDAI-compliant fingerprint capture using XML-based RD Service
 */

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRDService } from "@/hooks/useRDService";
import { RDServiceOptions } from "@/services/rdServiceClient";
import { 
  Fingerprint, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Shield,
  RefreshCw
} from "lucide-react";

interface RDServiceFingerprintCaptureProps {
  index: number;
  onCaptureSuccess: (pidData: string, quality: number) => void;
  onCaptureError?: (error: string) => void;
  disabled?: boolean;
  captureOptions?: RDServiceOptions;
}

export function RDServiceFingerprintCapture({
  index,
  onCaptureSuccess,
  onCaptureError,
  disabled = false,
  captureOptions = {}
}: RDServiceFingerprintCaptureProps) {
  const { 
    isServiceAvailable, 
    isChecking, 
    deviceInfo, 
    error: serviceError,
    checkService,
    captureFingerprint 
  } = useRDService();

  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string>('');
  const [lastCaptureQuality, setLastCaptureQuality] = useState<number | null>(null);
  const [captureSuccess, setCaptureSuccess] = useState(false);

  const handleCapture = useCallback(async () => {
    if (!isServiceAvailable || isCapturing || disabled) return;

    try {
      setIsCapturing(true);
      setCaptureError('');
      setCaptureSuccess(false);

      console.log(`Starting RD Service fingerprint capture for finger ${index + 1}`);

      const result = await captureFingerprint({
        fCount: 1,
        fType: 0,
        timeout: 30000,
        pidVer: '2.0',
        env: 'P',
        ...captureOptions
      });

      if (result.success && result.pidData && result.xmlResponse) {
        const quality = result.quality || 0;
        
        console.log(`RD Service capture successful for finger ${index + 1}:`, {
          quality,
          errorCode: result.pidData.resp.errCode,
          dataLength: result.pidData.data.length
        });

        setLastCaptureQuality(quality);
        setCaptureSuccess(true);
        
        // Pass the complete XML response as PidData
        onCaptureSuccess(result.xmlResponse, quality);
      } else {
        const errorMessage = result.error || 'Capture failed';
        setCaptureError(errorMessage);
        setLastCaptureQuality(null);
        setCaptureSuccess(false);
        
        if (onCaptureError) {
          onCaptureError(errorMessage);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown capture error';
      setCaptureError(errorMessage);
      setLastCaptureQuality(null);
      setCaptureSuccess(false);
      
      if (onCaptureError) {
        onCaptureError(errorMessage);
      }
    } finally {
      setIsCapturing(false);
    }
  }, [isServiceAvailable, isCapturing, disabled, index, captureFingerprint, captureOptions, onCaptureSuccess, onCaptureError]);

  const handleRetry = useCallback(() => {
    setCaptureError('');
    setCaptureSuccess(false);
    setLastCaptureQuality(null);
  }, []);

  const getStatusColor = () => {
    if (!isServiceAvailable) return 'bg-red-500';
    if (captureSuccess) return 'bg-green-500';
    if (isCapturing) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (!isServiceAvailable) return 'RD Service Offline';
    if (captureSuccess) return 'Captured';
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
            <Badge variant={isServiceAvailable ? 'default' : 'destructive'} className="text-xs">
              {getStatusText()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* RD Service Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {isServiceAvailable ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className={isServiceAvailable ? 'text-green-600' : 'text-red-600'}>
              {isServiceAvailable ? 'RD Service Connected' : 'RD Service Offline'}
            </span>
          </div>
          {isChecking && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>

        {/* Device Info */}
        {deviceInfo && (
          <div className="text-xs text-gray-600 space-y-1">
            <div>Device: {deviceInfo.mi || 'MFS100'}</div>
            <div>RDS Version: {deviceInfo.rdsVer || 'Unknown'}</div>
            <div>Status: {deviceInfo.status || 'Unknown'}</div>
          </div>
        )}

        {/* UIDAI Compliance Badge */}
        <div className="flex justify-center">
          <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">
            <Shield className="h-3 w-3 mr-1" />
            UIDAI Compliant
          </Badge>
        </div>

        {/* Fingerprint Placeholder */}
        <div className="flex justify-center">
          <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
            {isCapturing ? (
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Capturing...</p>
              </div>
            ) : captureSuccess ? (
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-xs text-green-600">Captured</p>
              </div>
            ) : (
              <div className="text-center">
                <Fingerprint className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Place finger</p>
              </div>
            )}
          </div>
        </div>

        {/* Quality Score */}
        {lastCaptureQuality !== null && (
          <div className="flex items-center justify-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600">
              Quality: {lastCaptureQuality}%
            </span>
          </div>
        )}

        {/* Error Display */}
        {(captureError || serviceError) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {captureError || serviceError}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {!captureSuccess ? (
            <Button
              onClick={handleCapture}
              disabled={!isServiceAvailable || isCapturing || disabled}
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
              <RefreshCw className="mr-2 h-4 w-4" />
              Recapture
            </Button>
          )}

          <Button
            onClick={checkService}
            variant="secondary"
            size="sm"
            disabled={isChecking}
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 text-center">
          <p>Ensure RD Service is running at localhost:11100</p>
          <p>Place finger firmly on MFS100 scanner</p>
        </div>
      </CardContent>
    </Card>
  );
}
