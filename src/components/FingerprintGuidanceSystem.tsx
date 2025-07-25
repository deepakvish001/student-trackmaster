
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Hand, ArrowRight, RotateCcw, Eye, Wifi, WifiOff } from "lucide-react";
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
  const [deviceConnected, setDeviceConnected] = useState(false);

  const fingerNames = [
    "Right Thumb",
    "Right Index", 
    "Right Middle",
    "Left Index",
    "Left Thumb"
  ];

  const handleFingerprintCaptured = (index: number, value: string) => {
    console.log(`Fingerprint ${index + 1} captured:`, value ? 'data received' : 'no data');
    onFingerprintChange(index, value);
  };

  const handleImageCaptured = (index: number, imageData: string) => {
    console.log(`Fingerprint image ${index + 1} captured:`, imageData ? 'image received' : 'no image');
    onImageChange?.(index, imageData);
  };

  const handleFingerAccepted = (index: number) => {
    console.log(`Finger ${index + 1} accepted, advancing to next...`);
    
    const newAccepted = [...acceptedFingers];
    newAccepted[index] = true;
    setAcceptedFingers(newAccepted);
    
    const nextUnacceptedIndex = newAccepted.findIndex((accepted, i) => !accepted);
    
    if (nextUnacceptedIndex !== -1) {
      console.log(`Moving to finger ${nextUnacceptedIndex + 1}`);
      setCurrentFinger(nextUnacceptedIndex);
    } else {
      console.log('All fingerprints captured and accepted!');
    }
  };

  const getProgressPercentage = () => {
    return (acceptedFingers.filter(Boolean).length / 5) * 100;
  };

  const resetCapture = () => {
    console.log('Resetting capture system...');
    setCurrentFinger(0);
    setAcceptedFingers([false, false, false, false, false]);
    
    for (let i = 0; i < 5; i++) {
      onFingerprintChange(i, "");
      onImageChange?.(i, "");
    }
  };

  const getFingerStatus = (index: number) => {
    if (acceptedFingers[index]) return 'accepted';
    if (currentFinger === index) return 'current';
    if (fingerprints[index]) return 'captured';
    return 'pending';
  };

  const handleFingerClick = (index: number) => {
    if (!acceptedFingers[index]) {
      console.log(`Manually switching to finger ${index + 1}`);
      setCurrentFinger(index);
    }
  };

  const handleReconnect = () => {
    setDeviceConnected(!deviceConnected);
  };

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-2xl">
      {/* Enhanced Progress Overview */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-xl">
            <span className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Hand className="h-6 w-6 text-primary" />
              </div>
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent font-bold">
                Fingerprint Enrollment Progress
              </span>
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetCapture}
              disabled={acceptedFingers.every(accepted => !accepted)}
              className="hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-200"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Progress 
              value={getProgressPercentage()} 
              className="flex-1 h-3 bg-gray-100"
            />
            <Badge 
              variant={getProgressPercentage() === 100 ? "default" : "secondary"}
              className="px-4 py-2 text-sm font-semibold"
            >
              {acceptedFingers.filter(Boolean).length}/5 Completed
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Fingerprint Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {fingerNames.map((name, index) => {
          const status = getFingerStatus(index);
          const isDisconnected = !deviceConnected;
          
          return (
            <Card 
              key={index}
              className={`relative transition-all duration-300 cursor-pointer hover:scale-105 ${
                status === 'current'
                  ? 'border-2 border-primary shadow-xl bg-primary/5 scale-105' 
                  : status === 'accepted'
                    ? 'border-2 border-green-500 shadow-lg bg-green-50'
                    : status === 'captured'
                      ? 'border-2 border-blue-500 shadow-lg bg-blue-50'
                      : 'border border-gray-200 shadow-md hover:border-gray-300 bg-white'
              }`}
              onClick={() => handleFingerClick(index)}
            >
              {/* Status Badge */}
              <div className="absolute -top-2 -right-2 z-10">
                <Badge 
                  variant={isDisconnected ? "destructive" : status === 'accepted' ? "default" : "secondary"}
                  className="px-2 py-1 text-xs font-semibold"
                >
                  {isDisconnected ? (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-1" />
                      Disconnected
                    </>
                  ) : status === 'accepted' ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                      Captured
                    </>
                  ) : status === 'captured' ? (
                    <>
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-1" />
                      Review
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-1" />
                      Ready
                    </>
                  )}
                </Badge>
              </div>

              <CardHeader className="text-center pb-2">
                <CardTitle className="text-sm font-bold">
                  Finger {index + 1}
                </CardTitle>
                <div className="text-xs text-gray-600 font-medium">
                  {name}
                </div>
              </CardHeader>
              
              <CardContent className="text-center space-y-4 pb-4">
                {/* Connection Status */}
                <div className="flex items-center justify-center space-x-1">
                  {isDisconnected ? (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  ) : (
                    <Wifi className="h-4 w-4 text-green-500" />
                  )}
                  <span className={`text-xs font-medium ${
                    isDisconnected ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {isDisconnected ? 'Disconnected' : 'Connected'}
                  </span>
                </div>

                {/* Fingerprint Display Area */}
                <div className={`mx-auto w-24 h-32 border-2 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  status === 'current'
                    ? 'border-primary border-dashed animate-pulse bg-primary/5' 
                    : status === 'accepted'
                      ? 'border-green-500 bg-green-50'
                      : status === 'captured'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-gray-50'
                }`}>
                  <div className="flex flex-col items-center space-y-2 text-gray-400">
                    {status === 'accepted' ? (
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    ) : status === 'captured' ? (
                      <Eye className="h-8 w-8 text-blue-500" />
                    ) : status === 'current' ? (
                      <Circle className="h-8 w-8 text-primary animate-pulse" />
                    ) : (
                      <>
                        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 1C8.5 1 5.7 3.8 5.7 7.3v3.4c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5V7.3C8.7 5.1 10.1 3.7 12 3.7s3.3 1.4 3.3 3.6v3.4c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5V7.3C18.3 3.8 15.5 1 12 1z"/>
                          <path d="M12 14c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z"/>
                        </svg>
                        <span className="text-xs">No Print</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant={status === 'current' ? "default" : "outline"}
                    disabled={status === 'accepted'}
                    className="w-full py-2 text-xs font-semibold transition-all duration-200"
                  >
                    {status === 'accepted' ? 'Captured ✓' : 'Capture'}
                  </Button>
                  
                  {isDisconnected && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleReconnect}
                      className="w-full py-1.5 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300"
                    >
                      Reconnect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completion Status */}
      {getProgressPercentage() === 100 && (
        <Card className="border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl">
          <CardContent className="pt-8 pb-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle2 className="h-16 w-16 text-green-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-green-800">
                Enrollment Complete!
              </h3>
              <p className="text-green-700 text-lg max-w-2xl mx-auto">
                All 5 fingerprints have been successfully captured and verified. 
                The student registration is now ready to be saved.
              </p>
              <div className="flex justify-center space-x-4 mt-6">
                <Badge variant="default" className="px-4 py-2 text-sm">
                  ✓ All Fingers Enrolled
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  Ready to Save
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
