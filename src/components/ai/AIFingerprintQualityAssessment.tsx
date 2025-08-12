import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Brain, Zap, Eye } from 'lucide-react';
import { useAIQualityAssessment } from '@/hooks/useAIQualityAssessment';

interface AIFingerprintQualityAssessmentProps {
  imageData: string | null;
  onQualityAssessed: (quality: QualityAssessment) => void;
  onEnhancementSuggested: (enhancement: string) => void;
}

interface QualityAssessment {
  overallScore: number;
  clarity: number;
  contrast: number;
  ridgeFlow: number;
  minutiaeQuality: number;
  recommendations: string[];
  confidence: number;
  isAcceptable: boolean;
}

export const AIFingerprintQualityAssessment: React.FC<AIFingerprintQualityAssessmentProps> = ({
  imageData,
  onQualityAssessed,
  onEnhancementSuggested
}) => {
  const [assessment, setAssessment] = useState<QualityAssessment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const {
    assessQuality,
    enhanceImage,
    getRecommendations,
    isLoading
  } = useAIQualityAssessment();

  const performAssessment = useCallback(async () => {
    if (!imageData) return;
    
    setIsProcessing(true);
    try {
      const result = await assessQuality(imageData);
      setAssessment(result);
      onQualityAssessed(result);
      
      if (result.overallScore < 70) {
        const enhancement = await enhanceImage(imageData);
        onEnhancementSuggested(enhancement);
      }
    } catch (error) {
      console.error('Quality assessment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageData, assessQuality, enhanceImage, onQualityAssessed, onEnhancementSuggested]);

  useEffect(() => {
    if (imageData) {
      performAssessment();
    }
  }, [imageData, performAssessment]);

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getQualityIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    if (score >= 60) return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  if (!imageData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Quality Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Capture a fingerprint to begin AI quality analysis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Quality Assessment
          {isProcessing && <Zap className="h-4 w-4 animate-pulse text-amber-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isProcessing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 animate-pulse" />
              <span className="text-sm">Analyzing fingerprint quality...</span>
            </div>
            <Progress value={75} className="w-full" />
          </div>
        ) : assessment ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getQualityIcon(assessment.overallScore)}
                <span className="font-semibold">Overall Quality</span>
              </div>
              <Badge variant={assessment.isAcceptable ? "default" : "destructive"}>
                {assessment.overallScore}%
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Clarity</span>
                <span className={getQualityColor(assessment.clarity)}>{assessment.clarity}%</span>
              </div>
              <Progress value={assessment.clarity} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Contrast</span>
                <span className={getQualityColor(assessment.contrast)}>{assessment.contrast}%</span>
              </div>
              <Progress value={assessment.contrast} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ridge Flow</span>
                <span className={getQualityColor(assessment.ridgeFlow)}>{assessment.ridgeFlow}%</span>
              </div>
              <Progress value={assessment.ridgeFlow} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Minutiae Quality</span>
                <span className={getQualityColor(assessment.minutiaeQuality)}>{assessment.minutiaeQuality}%</span>
              </div>
              <Progress value={assessment.minutiaeQuality} className="h-2" />
            </div>

            {assessment.recommendations.length > 0 && (
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">AI Recommendations:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {assessment.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm">{rec}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">
                Confidence: {Math.round(assessment.confidence * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={performAssessment}
                disabled={isLoading}
              >
                Re-analyze
              </Button>
            </div>
          </div>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to assess fingerprint quality. Please try again.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};