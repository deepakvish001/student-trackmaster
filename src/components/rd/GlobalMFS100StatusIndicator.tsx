
import { useGlobalMFS100 } from '@/hooks/useGlobalMFS100';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

export function GlobalMFS100StatusIndicator() {
  const {
    isConnected,
    isInitializing,
    isCapturing,
    error,
    deviceInfo,
    lastConnectionTime,
    reconnectAttempts,
    isReady,
    statusMessage,
    reconnectDevice,
    forceReset,
    clearQueue
  } = useGlobalMFS100();

  const getStatusIcon = () => {
    if (isInitializing) return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    if (isCapturing) return <Zap className="h-5 w-5 text-yellow-500 animate-pulse" />;
    if (isReady) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (isConnected) return <Wifi className="h-5 w-5 text-green-400" />;
    if (reconnectAttempts > 3) return <AlertTriangle className="h-5 w-5 text-red-500" />;
    return <WifiOff className="h-5 w-5 text-gray-400" />;
  };

  const getStatusBadge = () => {
    if (isInitializing) return <Badge variant="secondary" className="bg-blue-50 text-blue-700">Initializing</Badge>;
    if (isCapturing) return <Badge className="bg-yellow-500 text-white animate-pulse">Capturing</Badge>;
    if (isReady) return <Badge className="bg-green-500 text-white">Ready</Badge>;
    if (isConnected) return <Badge className="bg-green-400 text-white">Connected</Badge>;
    if (reconnectAttempts > 0) return <Badge variant="destructive">Connection Issues</Badge>;
    return <Badge variant="secondary">Standby</Badge>;
  };

  const getSeverityLevel = () => {
    if (isReady) return 'success';
    if (isConnected || isInitializing) return 'info';
    if (reconnectAttempts > 3) return 'error';
    if (reconnectAttempts > 0) return 'warning';
    return 'info';
  };

  const handleReconnect = async () => {
    toast.info('Reconnecting to MFS100 device...', {
      description: 'Please wait while we establish connection'
    });

    try {
      const result = await reconnectDevice();
      if (result) {
        toast.success('Device reconnected successfully!', {
          description: 'Ready for fingerprint capture'
        });
      } else {
        toast.error('Reconnection failed', {
          description: 'Please check device connection and try again'
        });
      }
    } catch (error) {
      toast.error('Reconnection error', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleForceReset = async () => {
    toast.info('Resetting MFS100 service...', {
      description: 'This will clear all pending captures'
    });

    await forceReset();
    
    toast.success('Service reset complete', {
      description: 'Device will reinitialize automatically'
    });
  };

  const severity = getSeverityLevel();

  return (
    <Card className={`border-2 transition-all duration-300 ${
      severity === 'success' ? 'border-green-200 bg-green-50' :
      severity === 'warning' ? 'border-orange-200 bg-orange-50' :
      severity === 'error' ? 'border-red-200 bg-red-50' :
      'border-blue-200 bg-blue-50'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">Global MFS100 Service</span>
                {getStatusBadge()}
              </div>
              
              <span className="text-xs text-gray-600 mt-1">
                {statusMessage}
              </span>
              
              {deviceInfo && (
                <span className="text-xs text-gray-500 mt-1">
                  Device: {deviceInfo.Make} {deviceInfo.Model}
                </span>
              )}
              
              {lastConnectionTime && (
                <div className="flex items-center space-x-1 mt-1">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    Connected: {lastConnectionTime.toLocaleTimeString()}
                  </span>
                </div>
              )}
              
              {reconnectAttempts > 0 && (
                <span className="text-xs text-orange-600 mt-1">
                  Reconnect attempts: {reconnectAttempts}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            {/* Status Indicators */}
            {isReady && (
              <div className="flex items-center space-x-1 text-xs text-green-600 mr-2">
                <CheckCircle className="h-3 w-3" />
                <span>Ready</span>
              </div>
            )}
            
            {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReconnect}
              disabled={isInitializing || isCapturing}
              title="Reconnect device"
            >
              <RefreshCw className={`h-4 w-4 ${isInitializing ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={clearQueue}
              disabled={isInitializing}
              title="Clear capture queue"
              className="text-orange-600 hover:text-orange-700"
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceReset}
              disabled={isInitializing}
              title="Force reset service"
              className="text-red-600 hover:text-red-700"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Connection Issues Alert */}
        {reconnectAttempts > 3 && (
          <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded text-xs">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-red-700">Persistent Connection Issues</div>
                <div className="text-red-600 mt-1">
                  The device has failed to connect multiple times. This usually indicates:
                </div>
                <ul className="text-red-600 mt-1 ml-2 space-y-1">
                  <li>• MFS100 device is not connected</li>
                  <li>• RD Service is not running</li>
                  <li>• Device drivers need to be reinstalled</li>
                  <li>• System requires restart</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {(isInitializing || isCapturing) && (
          <div className="mt-3">
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full animate-pulse w-full"></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
