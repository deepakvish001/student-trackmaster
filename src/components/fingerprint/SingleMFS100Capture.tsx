import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Fingerprint, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { singleMFS100Service, SingleMFS100Result } from '@/services/singleMFS100Service';

interface Props {
  onCaptureSuccess?: (result: SingleMFS100Result) => void;
  onCaptureError?: (error: string) => void;
}

export function SingleMFS100Capture({ onCaptureSuccess, onCaptureError }: Props) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastResult, setLastResult] = useState<SingleMFS100Result | null>(null);

  const captureFingerprint = useCallback(async () => {
    if (isCapturing) return;

    setIsCapturing(true);
    setLastResult(null);

    try {
      console.log('🔵 Starting fingerprint capture...');
      toast.info('Place finger on scanner...');

      const result = await singleMFS100Service.captureFingerprint(60, 15);
      setLastResult(result);

      if (result.success) {
        toast.success(result.message);
        onCaptureSuccess?.(result);
      } else {
        toast.error(result.message);
        onCaptureError?.(result.message);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      const errorResult: SingleMFS100Result = {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: errorMessage
      };
      
      setLastResult(errorResult);
      toast.error(errorMessage);
      onCaptureError?.(errorMessage);

    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCaptureSuccess, onCaptureError]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          MFS100 Fingerprint Capture
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Service Info */}
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Service: http://localhost:8003/mfs100
          </AlertDescription>
        </Alert>

        {/* Capture Button */}
        <Button
          onClick={captureFingerprint}
          disabled={isCapturing}
          className="w-full"
        >
          {isCapturing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Fingerprint className="h-4 w-4 mr-2" />
          )}
          {isCapturing ? 'Capturing...' : 'Capture Fingerprint'}
        </Button>

        {/* Results */}
        {lastResult && (
          <Alert variant={lastResult.success ? "default" : "destructive"}>
            {lastResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {lastResult.message}
              {lastResult.success && (
                <div className="mt-2 text-xs opacity-75">
                  Template: {lastResult.template ? '✓ Available' : '✗ Missing'}<br />
                  Image: {lastResult.imageData ? '✓ Available' : '✗ Missing'}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Fingerprint Preview */}
        {lastResult?.success && lastResult.imageData && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Captured Fingerprint:</h4>
            <div className="border rounded-lg p-4 bg-muted/50">
              <img
                src={`data:image/bmp;base64,${lastResult.imageData}`}
                alt="Captured Fingerprint"
                className="w-full h-auto max-w-[200px] mx-auto"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}