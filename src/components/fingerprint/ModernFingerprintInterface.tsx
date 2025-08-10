
import React, { useState } from 'react';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Stepper } from '@/components/ui/stepper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Hand, 
  Fingerprint, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Eye,
  Shield,
  Zap
} from 'lucide-react';
import { FingerprintDisplay } from '@/components/FingerprintDisplay';
import { toast } from 'sonner';

interface ModernFingerprintInterfaceProps {
  fingerprints: string[];
  onFingerprintChange: (index: number, value: string) => void;
  onImageChange?: (index: number, imageData: string) => void;
  targetQuality?: number;
}

const fingerOrder = [
  { id: 'right-thumb', name: 'Right Thumb', index: 0, description: 'Place right thumb on scanner' },
  { id: 'right-index', name: 'Right Index', index: 1, description: 'Place right index finger on scanner' },
  { id: 'right-middle', name: 'Right Middle', index: 2, description: 'Place right middle finger on scanner' },
  { id: 'left-index', name: 'Left Index', index: 3, description: 'Place left index finger on scanner' },
  { id: 'left-thumb', name: 'Left Thumb', index: 4, description: 'Place left thumb on scanner' },
];

export function ModernFingerprintInterface({
  fingerprints,
  onFingerprintChange,
  onImageChange,
  targetQuality = 70
}: ModernFingerprintInterfaceProps) {
  const [currentFingerIndex, setCurrentFingerIndex] = useState(0);
  const [completedFingers, setCompletedFingers] = useState<number[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);

  // Calculate completion stats
  const totalFingers = fingerOrder.length;
  const completedCount = completedFingers.length;
  const overallProgress = (completedCount / totalFingers) * 100;

  // Get current finger info
  const currentFinger = fingerOrder[currentFingerIndex];
  const isCurrentFingerCompleted = completedFingers.includes(currentFingerIndex);

  // Handle finger completion
  const handleFingerCompleted = (fingerIndex: number) => {
    if (!completedFingers.includes(fingerIndex)) {
      setCompletedFingers(prev => [...prev, fingerIndex]);
      toast.success(`${fingerOrder[fingerIndex].name} captured successfully!`);
    }

    // Move to next uncompleted finger
    const nextIndex = fingerOrder.findIndex((_, index) => 
      index > fingerIndex && !completedFingers.includes(index)
    );
    
    if (nextIndex !== -1) {
      setCurrentFingerIndex(nextIndex);
    } else if (completedCount + 1 === totalFingers) {
      toast.success('All fingerprints captured successfully!', {
        description: 'You can now save the student registration.'
      });
    }
  };

  // Handle finger selection
  const handleFingerSelect = (fingerIndex: number) => {
    if (!completedFingers.includes(fingerIndex)) {
      setCurrentFingerIndex(fingerIndex);
    }
  };

  // Mock capture function (replace with actual implementation)
  const handleCapture = async () => {
    setIsCapturing(true);
    setCaptureProgress(0);

    try {
      // Simulate capture progress
      const progressInterval = setInterval(() => {
        setCaptureProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 300);

      // Simulate capture delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate successful capture
      onFingerprintChange(currentFingerIndex, `fingerprint_data_${currentFingerIndex}`);
      onImageChange?.(currentFingerIndex, `image_data_${currentFingerIndex}`);
      
      handleFingerCompleted(currentFingerIndex);
      
    } catch (error) {
      toast.error('Capture failed. Please try again.');
    } finally {
      setIsCapturing(false);
      setCaptureProgress(0);
    }
  };

  // Reset all captures
  const handleReset = () => {
    setCompletedFingers([]);
    setCurrentFingerIndex(0);
    fingerOrder.forEach((_, index) => {
      onFingerprintChange(index, '');
      onImageChange?.(index, '');
    });
    toast.info('All fingerprints cleared. Ready to start over.');
  };

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <EnhancedCard
        title="Fingerprint Enrollment Progress"
        description={`${completedCount} of ${totalFingers} fingerprints captured`}
        icon={Shield}
        variant={completedCount === totalFingers ? 'success' : 'default'}
        headerAction={
          <div className="flex items-center space-x-2">
            <Badge variant={completedCount === totalFingers ? 'default' : 'secondary'}>
              {Math.round(overallProgress)}% Complete
            </Badge>
            {completedCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          <Progress value={overallProgress} className="h-2" />
          
          {/* Finger Selection Grid */}
          <div className="grid grid-cols-5 gap-3">
            {fingerOrder.map((finger, index) => {
              const isCompleted = completedFingers.includes(index);
              const isCurrent = currentFingerIndex === index;
              const hasData = !!fingerprints[index];

              return (
                <button
                  key={finger.id}
                  onClick={() => handleFingerSelect(index)}
                  disabled={isCompleted || isCapturing}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    isCompleted
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : isCurrent
                        ? 'border-primary bg-primary/10 text-primary'
                        : hasData
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : hasData ? (
                      <Eye className="h-5 w-5" />
                    ) : isCurrent ? (
                      <Fingerprint className="h-5 w-5 animate-pulse" />
                    ) : (
                      <Hand className="h-5 w-5" />
                    )}
                    <span className="text-xs font-medium">{finger.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </EnhancedCard>

      {/* Current Finger Capture */}
      <EnhancedCard
        title={`Capture: ${currentFinger.name}`}
        description={currentFinger.description}
        icon={Fingerprint}
        variant={isCurrentFingerCompleted ? 'success' : 'info'}
        isLoading={isCapturing}
      >
        <div className="flex flex-col items-center space-y-6">
          {/* Fingerprint Display */}
          <div className="relative">
            <FingerprintDisplay
              value={fingerprints[currentFingerIndex]}
              index={currentFingerIndex}
              isCapturing={isCapturing}
              showQuality={true}
            />
            
            {isCapturing && (
              <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                <div className="bg-background border border-border p-4 rounded-lg shadow-lg text-center">
                  <Zap className="h-6 w-6 text-blue-500 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm font-medium mb-2">Scanning...</p>
                  <Progress value={captureProgress} className="w-32 h-2" />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {!isCurrentFingerCompleted ? (
              <Button
                onClick={handleCapture}
                disabled={isCapturing}
                size="lg"
                className="min-w-32"
              >
                {isCapturing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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
                variant="outline"
                onClick={() => {
                  onFingerprintChange(currentFingerIndex, '');
                  onImageChange?.(currentFingerIndex, '');
                  setCompletedFingers(prev => prev.filter(i => i !== currentFingerIndex));
                }}
                size="lg"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Recapture
              </Button>
            )}
          </div>

          {/* Instructions */}
          <div className="text-center space-y-2 max-w-md">
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Ensure your finger is clean and dry for best results</span>
            </div>
            {!isCurrentFingerCompleted && (
              <p className="text-xs text-muted-foreground">
                Press firmly on the scanner and hold still until capture is complete
              </p>
            )}
          </div>
        </div>
      </EnhancedCard>

      {/* Completion Status */}
      {completedCount === totalFingers && (
        <EnhancedCard variant="success" icon={CheckCircle2}>
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                All Fingerprints Captured Successfully!
              </h3>
              <p className="text-green-700">
                All {totalFingers} fingerprints have been captured and verified. 
                The biometric enrollment is complete and ready for registration.
              </p>
            </div>
            <div className="flex justify-center space-x-2">
              <Badge className="bg-green-100 text-green-800">
                <Shield className="h-3 w-3 mr-1" />
                Secure Enrollment
              </Badge>
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>
          </div>
        </EnhancedCard>
      )}
    </div>
  );
}
