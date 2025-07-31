
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Clock, CheckCircle } from 'lucide-react';
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
  
  const [lastStatusChange, setLastStatusChange] = useState<Date>(new Date());

  useEffect(() => {
    setLastStatusChange(new Date());
  }, [isConnected]);

  const getStatusColor = () => {
    if (isConnected && !error) return 'bg-green-500';
    if (isConnected && isCapturing) return 'bg-blue-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center space-x-2">
        {isConnected ? (
          <Wifi className="h-5 w-5 text-green-500" />
        ) : (
          <WifiOff className="h-5 w-5 text-red-500" />
        )}
        
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">MFS100 Device</span>
            <Badge className={`${getStatusColor()} text-white`}>
              {isCapturing ? `Capturing ${currentCapture}` : 
               isConnected ? 'Ready' : 'Disconnected'}
            </Badge>
          </div>
          
          {/* Queue Status */}
          {queueLength > 0 && (
            <div className="flex items-center space-x-1 text-xs text-blue-600 mt-1">
              <Clock className="h-3 w-3" />
              <span>{queueLength} in queue</span>
            </div>
          )}
          
          {/* Device Info */}
          {deviceInfo && (
            <div className="text-xs text-gray-500 mt-1">
              Device: {deviceInfo.SerialNo || 'MFS100'} | 
              Last check: {lastCheckTime?.toLocaleTimeString() || 'Never'}
            </div>
          )}
          
          {/* Error Display */}
          {error && !isConnected && (
            <span className="text-xs text-red-600 mt-1">{error}</span>
          )}
          
          {/* Success Indicator */}
          {isConnected && !error && !isCapturing && (
            <div className="flex items-center space-x-1 text-xs text-green-600 mt-1">
              <CheckCircle className="h-3 w-3" />
              <span>Device ready for captures</span>
            </div>
          )}
        </div>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={softReset}
        disabled={isCapturing}
        className="ml-auto"
      >
        <RefreshCw className={`h-4 w-4 ${isCapturing ? 'animate-spin' : ''}`} />
        <span className="ml-1">Soft Reset</span>
      </Button>
    </div>
  );
}
