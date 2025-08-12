import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Camera, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCw
} from 'lucide-react';
import { useIntelligentCapture } from '@/hooks/useIntelligentCapture';

interface IntelligentCaptureAssistantProps {
  onCaptureReady: () => void;
  onGuidanceUpdate: (guidance: CaptureGuidance) => void;
  isCapturing: boolean;
}

interface CaptureGuidance {
  instruction: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'rotate';
  confidence: number;
  successProbability: number;
  fingerDetected: boolean;
  positioning: 'perfect' | 'good' | 'needs_adjustment' | 'poor';
}

export const IntelligentCaptureAssistant: React.FC<IntelligentCaptureAssistantProps> = ({
  onCaptureReady,
  onGuidanceUpdate,
  isCapturing
}) => {
  const [guidance, setGuidance] = useState<CaptureGuidance | null>(null);
  const [captureScore, setCaptureScore] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const {
    startMonitoring,
    stopMonitoring,
    analyzeFrame,
    predictCaptureSuccess,
    getOptimalTiming
  } = useIntelligentCapture();

  useEffect(() => {
    if (isCapturing) {
      startRealTimeGuidance();
    } else {
      stopRealTimeGuidance();
    }

    return () => stopRealTimeGuidance();
  }, [isCapturing]);

  const startRealTimeGuidance = async () => {
    try {
      setIsMonitoring(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'environment'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Start frame analysis
      const analyzeInterval = setInterval(async () => {
        if (videoRef.current) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);
            
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            const analysis = await analyzeFrame(imageData);
            
            if (analysis) {
              setGuidance(analysis);
              onGuidanceUpdate(analysis);
              
              const score = await predictCaptureSuccess(imageData);
              setCaptureScore(score);
              
              if (score > 85 && analysis.positioning === 'perfect') {
                onCaptureReady();
              }
            }
          }
        }
      }, 200); // Analyze every 200ms

      return () => {
        clearInterval(analyzeInterval);
        stream.getTracks().forEach(track => track.stop());
      };
    } catch (error) {
      console.error('Failed to start real-time guidance:', error);
      setIsMonitoring(false);
    }
  };

  const stopRealTimeGuidance = () => {
    setIsMonitoring(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const getDirectionIcon = (direction?: string) => {
    switch (direction) {
      case 'up': return <ArrowUp className="h-4 w-4" />;
      case 'down': return <ArrowDown className="h-4 w-4" />;
      case 'left': return <ArrowLeft className="h-4 w-4" />;
      case 'right': return <ArrowRight className="h-4 w-4" />;
      case 'rotate': return <RotateCw className="h-4 w-4" />;
      default: return null;
    }
  };

  const getPositioningColor = (positioning: string) => {
    switch (positioning) {
      case 'perfect': return 'bg-emerald-500';
      case 'good': return 'bg-blue-500';
      case 'needs_adjustment': return 'bg-amber-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Intelligent Capture Assistant
            {isMonitoring && <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCapturing && (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-48 bg-black rounded-lg object-cover"
                muted
                playsInline
              />
              
              {guidance && guidance.fingerDetected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-32 h-32 border-2 rounded-lg ${
                    guidance.positioning === 'perfect' ? 'border-emerald-500' :
                    guidance.positioning === 'good' ? 'border-blue-500' :
                    guidance.positioning === 'needs_adjustment' ? 'border-amber-500' :
                    'border-red-500'
                  }`}>
                    <Target className="w-full h-full text-current opacity-50" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Capture Readiness</span>
              <Badge variant={captureScore > 85 ? "default" : captureScore > 60 ? "secondary" : "destructive"}>
                {captureScore}%
              </Badge>
            </div>
            <Progress value={captureScore} className="h-2" />
          </div>

          {guidance && (
            <div className="space-y-3">
              <Alert className={guidance.fingerDetected ? "border-emerald-200" : "border-amber-200"}>
                <div className="flex items-center gap-2">
                  {guidance.fingerDetected ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  )}
                  <span className="font-medium">
                    {guidance.fingerDetected ? 'Finger Detected' : 'Place Finger on Scanner'}
                  </span>
                </div>
              </Alert>

              {guidance.instruction && (
                <Alert>
                  <div className="flex items-center gap-2">
                    {getDirectionIcon(guidance.direction)}
                    <AlertDescription>{guidance.instruction}</AlertDescription>
                  </div>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Positioning</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getPositioningColor(guidance.positioning)}`} />
                    <span className="text-sm capitalize">{guidance.positioning.replace('_', ' ')}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Confidence</span>
                  <span className="text-sm font-medium">{Math.round(guidance.confidence * 100)}%</span>
                </div>
              </div>

              {guidance.successProbability > 0 && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Success Probability: {Math.round(guidance.successProbability)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {!isCapturing && (
            <Alert>
              <Camera className="h-4 w-4" />
              <AlertDescription>
                Start capturing to receive intelligent guidance and real-time feedback.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};