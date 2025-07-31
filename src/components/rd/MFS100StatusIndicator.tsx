
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Clock, CheckCircle, AlertTriangle, Wrench, Zap } from 'lucide-react';
import { useUnifiedMFS100Service } from '@/hooks/useUnifiedMFS100Service';

export function MFS100StatusIndicator() {
  const { 
    isConnected, 
    isCapturing, 
    error, 
    deviceInfo, 
    queueLength,
    currentCapture,
    lastCheckTime,
    softReset 
  } = useUnifiedMFS100Service();
  
  const isRecovering = false; // This would come from the service if available
  const [lastStatusChange, setLastStatusChange] = useState<Date>(new Date());
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);

  useEffect(() => {
    setLastStatusChange(new Date());
  }, [isConnected, isRecovering]);

  const getStatusColor = () => {
    if (isRecovering) return 'bg-orange-500 animate-pulse';
    if (isConnected && !error) return 'bg-green-500';
    if (isCapturing) return 'bg-blue-500 animate-pulse';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (isRecovering) return 'Recovering...';
    if (isCapturing && currentCapture) return `Capturing ${currentCapture}`;
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (isRecovering) return <Wrench className="h-5 w-5 text-orange-500 animate-spin" />;
    if (isConnected) return <Wifi className="h-5 w-5 text-green-500" />;
    return <WifiOff className="h-5 w-5 text-red-500" />;
  };

  const getStatusDescription = () => {
    if (isRecovering) return 'Service recovery in progress - please wait...';
    if (!isConnected && error) return error;
    if (isCapturing) return 'Fingerprint capture in progress';
    if (isConnected) return 'Device ready for fingerprint capture';
    return 'MFS100 service not available';
  };

  return (
    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">MFS100 Fingerprint Scanner</span>
            <Badge className={`${getStatusColor()} text-white border-0`}>
              {getStatusText()}
            </Badge>
          </div>
          
          {/* Status Description */}
          <div className="text-xs text-gray-600 mt-1">
            {getStatusDescription()}
          </div>
          
          {/* Recovery Status */}
          {isRecovering && (
            <div className="flex items-center space-x-1 text-xs text-orange-600 mt-1 animate-pulse">
              <Zap className="h-3 w-3" />
              <span>Auto-recovery active - no restart needed</span>
            </div>
          )}
          
          {/* Queue Status */}
          {queueLength > 0 && !isRecovering && (
            <div className="flex items-center space-x-1 text-xs text-blue-600 mt-1">
              <Clock className="h-3 w-3" />
              <span>{queueLength} captures in queue</span>
            </div>
          )}
          
          {/* Device Info - only show when connected and not recovering */}
          {deviceInfo && isConnected && !isRecovering && (
            <div className="text-xs text-gray-500 mt-1">
              Device: {deviceInfo.SerialNo || 'MFS100'} • 
              Last check: {lastCheckTime?.toLocaleTimeString() || 'Never'}
            </div>
          )}
          
          {/* Error Display */}
          {error && !isConnected && !isRecovering && (
            <div className="flex items-center space-x-1 text-xs text-red-600 mt-1">
              <AlertTriangle className="h-3 w-3" />
              <span>Auto-recovery will attempt to fix this</span>
            </div>
          )}
          
          {/* Success Indicator */}
          {isConnected && !error && !isCapturing && !isRecovering && (
            <div className="flex items-center space-x-1 text-xs text-green-600 mt-1">
              <CheckCircle className="h-3 w-3" />
              <span>Ready for fingerprint captures</span>
            </div>
          )}
        </div>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={softReset}
        disabled={isCapturing || isRecovering}
        className="ml-auto"
      >
        <RefreshCw className={`h-4 w-4 ${isCapturing || isRecovering ? 'animate-spin' : ''}`} />
        <span className="ml-1">
          {isRecovering ? 'Recovering...' : 'Reset Service'}
        </span>
      </Button>
    </div>
  );
}
