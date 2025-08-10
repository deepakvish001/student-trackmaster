// Unified fingerprint capture component replacing 8 similar components
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UnifiedFingerprintCaptureProps {
  index: number;
  fingerName: string;
  value?: string;
  onChange: (value: string, quality: number) => void;
  disabled?: boolean;
  deviceType?: 'mfs100' | 'rdservice' | 'usb';
  captureMode?: 'standard' | 'enhanced' | 'zero-polling';
}

export function UnifiedFingerprintCapture({
  index,
  fingerName,
  value,
  onChange,
  disabled = false,
  deviceType = 'mfs100',
  captureMode = 'standard'
}: UnifiedFingerprintCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [quality, setQuality] = useState<number | null>(null);

  const handleCapture = useCallback(async () => {
    if (disabled || isCapturing) return;

    setIsCapturing(true);
    try {
      // Import from the correct module based on device type
      if (deviceType === 'mfs100') {
        const { captureFingerprint } = await import('@/utils/mfs100Native');
        
        const result = await captureFingerprint(60, 30);

        if (result.httpStaus && result.data && result.data.ErrorCode === "0") {
          const quality = result.data.Quality || 60;
          setQuality(quality);
          onChange(result.data.BitmapData || '', quality);
          toast.success(`${fingerName} captured (Quality: ${quality}%)`);
        } else {
          throw new Error(result.data?.ErrorDescription || result.err || 'Capture failed');
        }
      } else {
        // For other device types, we'd implement their specific capture logic
        throw new Error(`Device type ${deviceType} not yet implemented`);
      }
    } catch (error) {
      console.error('Capture error:', error);
      toast.error(`Failed to capture ${fingerName}`);
    } finally {
      setIsCapturing(false);
    }
  }, [index, fingerName, onChange, disabled, isCapturing, deviceType, captureMode]);

  const isCompleted = Boolean(value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{fingerName}</h4>
        {isCompleted && (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Captured
          </Badge>
        )}
      </div>

      <Button
        onClick={handleCapture}
        disabled={disabled || isCapturing}
        variant={isCompleted ? "outline" : "default"}
        className="w-full"
      >
        {isCapturing ? (
          <>
            <Fingerprint className="h-4 w-4 mr-2 animate-pulse" />
            Capturing...
          </>
        ) : isCompleted ? (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Recapture
          </>
        ) : (
          <>
            <Fingerprint className="h-4 w-4 mr-2" />
            Capture {fingerName}
          </>
        )}
      </Button>

      {quality && (
        <div className="text-xs text-muted-foreground text-center">
          Quality: {quality}%
        </div>
      )}

      {/* Fingerprint preview */}
      {value && (
        <div className="relative aspect-square bg-muted rounded border overflow-hidden">
          <img 
            src={value} 
            alt={`${fingerName} preview`}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}