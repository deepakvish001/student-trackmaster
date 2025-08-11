import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Fingerprint, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Zap, 
  Shield,
  Camera,
  Timer,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';

interface BiometricQuality {
  score: number;
  factors: {
    ridgeClarity: number;
    minutiaePoints: number;
    imageContrast: number;
    noiseLevel: number;
  };
}

interface AdvancedBiometricCaptureProps {
  onCapture: (data: { imageData: string; pidData: string; quality: BiometricQuality }) => void;
  fingerIndex: number;
  studentId?: string;
  disabled?: boolean;
}

export function AdvancedBiometricCapture({ 
  onCapture, 
  fingerIndex, 
  studentId,
  disabled = false 
}: AdvancedBiometricCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'connecting' | 'capturing' | 'analyzing' | 'complete' | 'error'>('idle');
  const [quality, setQuality] = useState<BiometricQuality | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [captureTime, setCaptureTime] = useState<number>(0);
  const captureTimeRef = useRef<NodeJS.Timeout>();
  const { logSecurityEvent } = useSecurityMonitoring();

  const maxRetries = 3;
  const minQualityScore = 70;

  useEffect(() => {
    return () => {
      if (captureTimeRef.current) {
        clearInterval(captureTimeRef.current);
      }
    };
  }, []);

  const analyzeImageQuality = useCallback((imageData: string): BiometricQuality => {
    // Simulate advanced biometric quality analysis
    // In real implementation, this would use actual image processing algorithms
    const baseScore = 60 + Math.random() * 40;
    const ridgeClarity = 70 + Math.random() * 30;
    const minutiaePoints = Math.floor(15 + Math.random() * 25);
    const imageContrast = 65 + Math.random() * 35;
    const noiseLevel = Math.max(0, 100 - (baseScore + Math.random() * 20));

    const qualityScore = Math.min(100, 
      (ridgeClarity * 0.3) + 
      (Math.min(100, minutiaePoints * 2.5) * 0.25) + 
      (imageContrast * 0.25) + 
      ((100 - noiseLevel) * 0.2)
    );

    return {
      score: Math.round(qualityScore),
      factors: {
        ridgeClarity: Math.round(ridgeClarity),
        minutiaePoints,
        imageContrast: Math.round(imageContrast),
        noiseLevel: Math.round(noiseLevel)
      }
    };
  }, []);

  const generateMockBiometricData = useCallback(() => {
    // Generate mock fingerprint data that would come from actual MFS100 device
    const mockImageData = `data:image/png;base64,${btoa(`mock_fingerprint_${fingerIndex}_${Date.now()}`)}`;
    const mockPidData = btoa(JSON.stringify({
      fingerIndex,
      captureTime: new Date().toISOString(),
      deviceSerial: 'MFS100_MOCK_001',
      quality: 'HIGH'
    }));

    return { mockImageData, mockPidData };
  }, [fingerIndex]);

  const startCaptureTimer = useCallback(() => {
    setCaptureTime(0);
    captureTimeRef.current = setInterval(() => {
      setCaptureTime(prev => prev + 0.1);
    }, 100);
  }, []);

  const stopCaptureTimer = useCallback(() => {
    if (captureTimeRef.current) {
      clearInterval(captureTimeRef.current);
      captureTimeRef.current = undefined;
    }
  }, []);

  const performCapture = useCallback(async () => {
    if (disabled || isCapturing) return;

    setIsCapturing(true);
    setCaptureStatus('connecting');
    startCaptureTimer();

    try {
      // Log biometric access attempt
      await logSecurityEvent(
        'data_access',
        'high',
        `Biometric capture initiated for finger ${fingerIndex}`,
        { 
          fingerIndex, 
          studentId,
          attempt: retryCount + 1,
          maxRetries 
        }
      );

      // Simulate device connection
      await new Promise(resolve => setTimeout(resolve, 800));
      setCaptureStatus('capturing');

      // Simulate capture process
      await new Promise(resolve => setTimeout(resolve, 1200));
      setCaptureStatus('analyzing');

      // Generate mock data and analyze quality
      const { mockImageData, mockPidData } = generateMockBiometricData();
      const qualityResult = analyzeImageQuality(mockImageData);

      await new Promise(resolve => setTimeout(resolve, 600));
      setQuality(qualityResult);

      if (qualityResult.score >= minQualityScore) {
        setCaptureStatus('complete');
        toast.success(`High-quality fingerprint captured! Score: ${qualityResult.score}%`);
        
        onCapture({
          imageData: mockImageData,
          pidData: mockPidData,
          quality: qualityResult
        });

        await logSecurityEvent(
          'data_access',
          'medium',
          `Biometric capture successful for finger ${fingerIndex}`,
          { 
            fingerIndex, 
            studentId,
            qualityScore: qualityResult.score,
            captureTime: captureTime.toFixed(1)
          }
        );

        setRetryCount(0);
      } else {
        throw new Error(`Quality too low: ${qualityResult.score}%`);
      }

    } catch (error: any) {
      setCaptureStatus('error');
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);

      if (newRetryCount < maxRetries) {
        toast.error(`Capture failed (${error.message}). Retry ${newRetryCount}/${maxRetries}`);
        setTimeout(() => {
          setCaptureStatus('idle');
          setQuality(null);
        }, 2000);
      } else {
        toast.error('Maximum retry attempts reached. Please try again later.');
        await logSecurityEvent(
          'suspicious_activity',
          'medium',
          `Multiple biometric capture failures for finger ${fingerIndex}`,
          { 
            fingerIndex, 
            studentId,
            retryCount: newRetryCount,
            error: error.message
          }
        );
      }
    } finally {
      setIsCapturing(false);
      stopCaptureTimer();
    }
  }, [disabled, isCapturing, fingerIndex, studentId, retryCount, onCapture, logSecurityEvent, analyzeImageQuality, generateMockBiometricData, startCaptureTimer, stopCaptureTimer, captureTime]);

  const getStatusColor = (status: typeof captureStatus) => {
    switch (status) {
      case 'idle': return 'text-muted-foreground';
      case 'connecting': return 'text-blue-500';
      case 'capturing': return 'text-orange-500';
      case 'analyzing': return 'text-purple-500';
      case 'complete': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: typeof captureStatus) => {
    switch (status) {
      case 'idle': return <Fingerprint className="w-4 h-4" />;
      case 'connecting': return <Zap className="w-4 h-4 animate-pulse" />;
      case 'capturing': return <Camera className="w-4 h-4 animate-bounce" />;
      case 'analyzing': return <TrendingUp className="w-4 h-4 animate-spin" />;
      case 'complete': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      default: return <Fingerprint className="w-4 h-4" />;
    }
  };

  const getProgressValue = () => {
    switch (captureStatus) {
      case 'idle': return 0;
      case 'connecting': return 25;
      case 'capturing': return 50;
      case 'analyzing': return 75;
      case 'complete': return 100;
      case 'error': return 0;
      default: return 0;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            Finger {fingerIndex} Capture
          </CardTitle>
          <Badge variant={captureStatus === 'complete' ? 'default' : 'secondary'}>
            {captureStatus === 'complete' ? 'Captured' : 'Ready'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress and Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className={`flex items-center gap-2 ${getStatusColor(captureStatus)}`}>
              {getStatusIcon(captureStatus)}
              <span className="font-medium capitalize">
                {captureStatus === 'idle' ? 'Ready to capture' : captureStatus}
              </span>
            </div>
            {isCapturing && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Timer className="w-3 h-3" />
                <span>{captureTime.toFixed(1)}s</span>
              </div>
            )}
          </div>
          <Progress value={getProgressValue()} className="h-2" />
        </div>

        {/* Quality Analysis */}
        {quality && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quality Score</span>
              <Badge variant={quality.score >= minQualityScore ? 'default' : 'destructive'}>
                {quality.score}%
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span>Ridge Clarity:</span>
                <span className="font-medium">{quality.factors.ridgeClarity}%</span>
              </div>
              <div className="flex justify-between">
                <span>Minutiae Points:</span>
                <span className="font-medium">{quality.factors.minutiaePoints}</span>
              </div>
              <div className="flex justify-between">
                <span>Image Contrast:</span>
                <span className="font-medium">{quality.factors.imageContrast}%</span>
              </div>
              <div className="flex justify-between">
                <span>Noise Level:</span>
                <span className="font-medium">{quality.factors.noiseLevel}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Retry Information */}
        {retryCount > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Attempt {retryCount + 1} of {maxRetries}. 
              {retryCount >= maxRetries - 1 ? ' Last attempt!' : ' Please position finger correctly.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Capture Button */}
        <Button
          onClick={performCapture}
          disabled={disabled || isCapturing || (retryCount >= maxRetries && captureStatus === 'error')}
          className="w-full"
          size="lg"
        >
          {isCapturing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Capturing...</span>
            </div>
          ) : captureStatus === 'complete' ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Recapture</span>
            </div>
          ) : retryCount >= maxRetries && captureStatus === 'error' ? (
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              <span>Max Attempts Reached</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4" />
              <span>Capture Fingerprint</span>
            </div>
          )}
        </Button>

        {/* Security Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>All biometric data is encrypted and securely stored</span>
        </div>
      </CardContent>
    </Card>
  );
}