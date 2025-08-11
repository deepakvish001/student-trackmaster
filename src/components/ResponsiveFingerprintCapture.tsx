import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ModernFingerprintCapture } from '@/components/modern/ModernFingerprintCapture';
import { 
  Fingerprint, 
  Smartphone, 
  Tablet, 
  Monitor, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Zap,
  Eye,
  X
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useUltraPerformanceOptimizer } from '@/hooks/useUltraPerformanceOptimizer';

interface ResponsiveFingerprintCaptureProps {
  fingerprints: Record<number, any>;
  onFingerprintChange: (index: number, data: string) => void;
  onImageChange?: (index: number, imageData: string) => void;
  disabled?: boolean;
  showPreview?: boolean;
}

export function ResponsiveFingerprintCapture({
  fingerprints,
  onFingerprintChange,
  onImageChange,
  disabled = false,
  showPreview = true
}: ResponsiveFingerprintCaptureProps) {
  const [selectedFinger, setSelectedFinger] = useState<number | null>(null);
  const [captureProgress, setCaptureProgress] = useState<Record<number, number>>({});
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [optimizedMode, setOptimizedMode] = useState(false);
  
  const { isOnline } = useOnlineStatus();
  const { metrics } = useUltraPerformanceOptimizer();
  const captureRef = useRef<HTMLDivElement>(null);

  // Detect device type and optimize interface
  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    updateDeviceType();
    window.addEventListener('resize', updateDeviceType);
    return () => window.removeEventListener('resize', updateDeviceType);
  }, []);

  // Auto-enable optimized mode for performance
  useEffect(() => {
    if (metrics.renderTime > 16 || metrics.memoryUsage > 70) {
      setOptimizedMode(true);
    }
  }, [metrics]);

  const fingerLabels = [
    'Right Thumb', 'Right Index', 'Right Middle', 'Right Ring', 'Right Little',
    'Left Thumb', 'Left Index', 'Left Middle', 'Left Ring', 'Left Little'
  ];

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const getFingerStatus = (index: number) => {
    const hasData = fingerprints[index + 1];
    const progress = captureProgress[index] || 0;
    
    if (hasData) return 'completed';
    if (progress > 0) return 'capturing';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-300 text-green-800';
      case 'capturing': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'capturing': return <RefreshCw className="w-4 h-4 animate-spin" />;
      default: return <Fingerprint className="w-4 h-4" />;
    }
  };

  const completedCount = Object.keys(fingerprints).length;
  const totalFingers = 10;
  const completionPercentage = (completedCount / totalFingers) * 100;

  const handleFullscreenToggle = () => {
    if (!isFullscreen && captureRef.current) {
      captureRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const renderMobileInterface = () => (
    <div className="space-y-4">
      {/* Header with progress */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              <span className="font-semibold">Fingerprint Capture</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {completedCount}/{totalFingers}
            </Badge>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {completedCount === 0 
              ? 'Tap a finger below to start capture'
              : `${totalFingers - completedCount} fingerprints remaining`
            }
          </p>
        </CardContent>
      </Card>

      {/* Finger grid - optimized for mobile */}
      <div className="grid grid-cols-2 gap-3">
        {fingerLabels.map((label, index) => {
          const status = getFingerStatus(index);
          const progress = captureProgress[index] || 0;
          
          return (
            <Card 
              key={index}
              className={`cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                selectedFinger === index ? 'ring-2 ring-primary' : ''
              } ${getStatusColor(status)}`}
              onClick={() => setSelectedFinger(selectedFinger === index ? null : index)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(status)}
                  <span className="text-sm font-medium truncate">{label}</span>
                </div>
                {progress > 0 && (
                  <Progress value={progress} className="h-1" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Capture interface */}
      {selectedFinger !== null && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Capturing: {fingerLabels[selectedFinger]}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFinger(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ModernFingerprintCapture
              index={selectedFinger + 1}
              value={fingerprints[selectedFinger + 1] || ''}
              onChange={(data) => onFingerprintChange(selectedFinger + 1, data)}
              onImageChange={(imageData) => onImageChange?.(selectedFinger + 1, imageData)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderDesktopInterface = () => (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Fingerprint className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedCount}/10</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                {getDeviceIcon()}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Device Type</p>
                <p className="text-lg font-semibold capitalize">{deviceType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${optimizedMode ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Performance</p>
                <p className="text-lg font-semibold">
                  {optimizedMode ? 'Optimized' : 'Standard'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Capture Progress</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(completionPercentage)}%
            </span>
          </div>
          <Progress value={completionPercentage} className="h-3" />
        </CardContent>
      </Card>

      {/* Finger grid */}
      <div className="grid grid-cols-5 gap-4">
        {fingerLabels.map((label, index) => {
          const status = getFingerStatus(index);
          const progress = captureProgress[index] || 0;
          
          return (
            <Card 
              key={index}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedFinger === index ? 'ring-2 ring-primary' : ''
              } ${getStatusColor(status)}`}
              onClick={() => setSelectedFinger(selectedFinger === index ? null : index)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  {getStatusIcon(status)}
                  <span className="text-xs font-medium">{label.split(' ')[1]}</span>
                  <span className="text-xs text-muted-foreground">{label.split(' ')[0]}</span>
                  {progress > 0 && (
                    <Progress value={progress} className="h-1 w-full" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Capture interface */}
      {selectedFinger !== null && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="w-5 h-5" />
                Capturing: {fingerLabels[selectedFinger]}
              </CardTitle>
              <div className="flex gap-2">
                {showPreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFullscreenToggle}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {isFullscreen ? 'Exit' : 'Fullscreen'}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFinger(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent ref={captureRef}>
            <ModernFingerprintCapture
              index={selectedFinger + 1}
              value={fingerprints[selectedFinger + 1] || ''}
              onChange={(data) => onFingerprintChange(selectedFinger + 1, data)}
              onImageChange={(imageData) => onImageChange?.(selectedFinger + 1, imageData)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (!isOnline) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Fingerprint capture requires an internet connection. Please check your network.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full">
      {deviceType === 'mobile' ? renderMobileInterface() : renderDesktopInterface()}
    </div>
  );
}