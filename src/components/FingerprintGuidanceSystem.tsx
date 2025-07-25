
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Hand, ArrowRight, RotateCcw } from "lucide-react";
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
  const [completedFingers, setCompletedFingers] = useState<boolean[]>([false, false, false, false, false]);

  const fingerNames = [
    "Right Thumb",
    "Right Index",
    "Right Middle", 
    "Left Index",
    "Left Thumb"
  ];

  const handleFingerprintCaptured = (index: number, value: string) => {
    onFingerprintChange(index, value);
    
    // Mark finger as completed
    const newCompleted = [...completedFingers];
    newCompleted[index] = true;
    setCompletedFingers(newCompleted);
    
    // Auto-advance to next incomplete finger
    const nextIncomplete = completedFingers.findIndex((completed, i) => !completed && i > index);
    if (nextIncomplete !== -1) {
      setCurrentFinger(nextIncomplete);
    } else {
      // Find first incomplete finger from beginning
      const firstIncomplete = completedFingers.findIndex(completed => !completed);
      if (firstIncomplete !== -1) {
        setCurrentFinger(firstIncomplete);
      }
    }
  };

  const handleImageCaptured = (index: number, imageData: string) => {
    onImageChange?.(index, imageData);
  };

  const getProgressPercentage = () => {
    return (completedFingers.filter(Boolean).length / 5) * 100;
  };

  const resetCapture = () => {
    setCurrentFinger(0);
    setCompletedFingers([false, false, false, false, false]);
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
              disabled={completedFingers.every(completed => !completed)}
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
              {completedFingers.filter(Boolean).length}/5 Complete
            </Badge>
          </div>
          
          {/* Finger Status Grid */}
          <div className="grid grid-cols-5 gap-2">
            {fingerNames.map((name, index) => (
              <div 
                key={index}
                className={`text-center p-2 rounded-lg border-2 transition-all cursor-pointer ${
                  currentFinger === index 
                    ? 'border-primary bg-primary/10' 
                    : completedFingers[index]
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setCurrentFinger(index)}
              >
                <div className="flex justify-center mb-1">
                  {completedFingers[index] ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : currentFinger === index ? (
                    <Circle className="h-5 w-5 text-primary animate-pulse" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="text-xs font-medium">{name}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Finger Capture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Capture: {fingerNames[currentFinger]}</span>
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
              targetQuality={targetQuality}
            />
          </div>
          
          {/* Instructions */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Ensure the MFS100 device is connected (green indicator)</li>
              <li>2. Click "Capture" button to activate the red scanner light</li>
              <li>3. Place your <strong>{fingerNames[currentFinger]}</strong> firmly on the scanner</li>
              <li>4. Hold steady until capture completes (aim for {targetQuality}%+ quality)</li>
              <li>5. The system will automatically move to the next finger</li>
            </ol>
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
                All Fingerprints Captured Successfully!
              </h3>
              <p className="text-green-700">
                You can now proceed to save the student registration.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
