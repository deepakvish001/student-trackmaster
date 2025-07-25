
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Hand, ArrowRight, RotateCcw, Eye } from "lucide-react";
import { EnhancedMFS100Capture } from "./EnhancedMFS100Capture";

interface FingerprintGuidanceSystemProps {
  fingerprints: string[];
  onFingerprintChange: (index: number, value: string) => void;
  onImageChange?: (index: number, imageData: string) => void;
  targetQuality?: number;
}

export function FingerprintGuidanceSystem({ 
  fingerprints, 
  onFingerprintChange, 
  onImageChange,
  targetQuality = 70
}: FingerprintGuidanceSystemProps) {
  const [currentFinger, setCurrentFinger] = useState(0);
  const [acceptedFingers, setAcceptedFingers] = useState<boolean[]>([false, false, false, false, false]);

  const fingerNames = [
    "Right Thumb",
    "Right Index",
    "Right Middle", 
    "Left Index",
    "Left Thumb"
  ];

  const handleFingerprintCaptured = (index: number, value: string) => {
    onFingerprintChange(index, value);
  };

  const handleImageCaptured = (index: number, imageData: string) => {
    onImageChange?.(index, imageData);
  };

  const handleFingerAccepted = (index: number) => {
    // Mark finger as accepted
    const newAccepted = [...acceptedFingers];
    newAccepted[index] = true;
    setAcceptedFingers(newAccepted);
    
    // Auto-advance to next unaccepted finger
    const nextUnaccepted = acceptedFingers.findIndex((accepted, i) => !accepted && i > index);
    if (nextUnaccepted !== -1) {
      setCurrentFinger(nextUnaccepted);
    } else {
      // Find first unaccepted finger from beginning
      const firstUnaccepted = acceptedFingers.findIndex((accepted, i) => !accepted && i !== index);
      if (firstUnaccepted !== -1) {
        setCurrentFinger(firstUnaccepted);
      }
    }
  };

  const getProgressPercentage = () => {
    return (acceptedFingers.filter(Boolean).length / 5) * 100;
  };

  const resetCapture = () => {
    setCurrentFinger(0);
    setAcceptedFingers([false, false, false, false, false]);
  };

  const getFingerStatus = (index: number) => {
    if (acceptedFingers[index]) return 'accepted';
    if (currentFinger === index) return 'current';
    if (fingerprints[index]) return 'captured';
    return 'pending';
  };

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Hand className="h-5 w-5" />
              <span>Fingerprint Capture Progress</span>
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetCapture}
              disabled={acceptedFingers.every(accepted => !accepted)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Progress value={getProgressPercentage()} className="flex-1" />
            <Badge variant={getProgressPercentage() === 100 ? "default" : "secondary"}>
              {acceptedFingers.filter(Boolean).length}/5 Accepted
            </Badge>
          </div>
          
          {/* Finger Status Grid */}
          <div className="grid grid-cols-5 gap-2">
            {fingerNames.map((name, index) => {
              const status = getFingerStatus(index);
              return (
                <div 
                  key={index}
                  className={`text-center p-2 rounded-lg border-2 transition-all cursor-pointer ${
                    status === 'current'
                      ? 'border-primary bg-primary/10' 
                      : status === 'accepted'
                        ? 'border-green-500 bg-green-50'
                        : status === 'captured'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setCurrentFinger(index)}
                >
                  <div className="flex justify-center mb-1">
                    {status === 'accepted' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : status === 'captured' ? (
                      <Eye className="h-5 w-5 text-blue-500" />
                    ) : status === 'current' ? (
                      <Circle className="h-5 w-5 text-primary animate-pulse" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="text-xs font-medium">{name}</div>
                  {status === 'captured' && !acceptedFingers[index] && (
                    <div className="text-xs text-blue-600 mt-1">Review</div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Finger Capture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {acceptedFingers[currentFinger] ? 'Completed: ' : 'Capture: '}
              {fingerNames[currentFinger]}
            </span>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Step {currentFinger + 1} of 5</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <EnhancedMFS100Capture
              index={currentFinger}
              value={fingerprints[currentFinger]}
              onChange={(value) => handleFingerprintCaptured(currentFinger, value)}
              onImageChange={(imageData) => handleImageCaptured(currentFinger, imageData)}
              onAccepted={() => handleFingerAccepted(currentFinger)}
              targetQuality={targetQuality}
              fingerName={fingerNames[currentFinger]}
            />
          </div>
          
          {/* Enhanced Instructions */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Enhanced Capture Process:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Ensure the MFS100 device is connected (green indicator)</li>
              <li>2. Click "Capture" to activate scanner and place your <strong>{fingerNames[currentFinger]}</strong></li>
              <li>3. <strong>Preview & Review:</strong> Check the captured fingerprint quality</li>
              <li>4. Choose "Accept & Continue" if satisfied, or "Recapture" to try again</li>
              <li>5. System advances to next finger only after acceptance</li>
            </ol>
            
            {!acceptedFingers[currentFinger] && fingerprints[currentFinger] && (
              <div className="mt-3 p-2 bg-blue-100 rounded text-sm font-medium text-blue-900">
                💡 Fingerprint captured! Please review and accept to continue.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completion Status */}
      {getProgressPercentage() === 100 && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold text-green-800">
                All Fingerprints Accepted Successfully!
              </h3>
              <p className="text-green-700">
                All 5 fingerprints have been captured, reviewed, and accepted. Ready to save registration.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
