
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Wrench, CheckCircle, Zap } from 'lucide-react';
import { useUnifiedMFS100 } from '@/hooks/useUnifiedMFS100';
import { toast } from 'sonner';

export function MFS100StatusIndicator() {
  const { 
    isConnected, 
    error, 
    consecutiveFailures, 
    lastCheckTime, 
    isRecovering, 
    recoveryMessage,
    checkDevice, 
    resetConnection,
    triggerRecovery,
    isProbablyAvailable
  } = useUnifiedMFS100();
  
  const [lastStatusChange, setLastStatusChange] = useState<Date>(new Date());

  useEffect(() => {
    setLastStatusChange(new Date());
  }, [isConnected]);

  const handleEnhancedRecovery = async () => {
    toast.info('Starting enhanced MFS100 service recovery...', {
      description: 'This may take up to 30 seconds',
      duration: 5000
    });

    try {
      const result = await triggerRecovery();
      if (result.success) {
        toast.success('Enhanced recovery successful!', {
          description: result.message,
          duration: 8000
        });
      } else {
        toast.error('Enhanced recovery failed', {
          description: result.message,
          duration: 10000
        });
      }
    } catch (error) {
      toast.error('Recovery error', {
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 10000
      });
    }
  };

  const getStatusIcon = () => {
    if (isRecovering) return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    if (consecutiveFailures >= 3) return <AlertTriangle className="h-5 w-5 text-red-500" />;
    if (!isConnected && error?.includes('CONNECTION_REFUSED')) return <WifiOff className="h-5 w-5 text-red-500" />;
    return <Wifi className="h-5 w-5 text-green-500" />;
  };

  const getStatusBadge = () => {
    if (isRecovering) return <Badge variant="secondary" className="bg-blue-50 text-blue-700">Enhanced Recovery...</Badge>;
    if (!isConnected && error?.includes('CONNECTION_REFUSED')) return <Badge variant="destructive">Service Stopped</Badge>;
    if (consecutiveFailures >= 3) return <Badge variant="destructive">Service Issue</Badge>;
    return <Badge className="bg-green-500 text-white">Ready to Capture</Badge>;
  };

  const getSeverityLevel = () => {
    if (isRecovering) return 'info';
    if (!isConnected && error?.includes('CONNECTION_REFUSED')) return 'critical';
    if (consecutiveFailures >= 3) return 'error';
    return 'success';
  };

  const severity = getSeverityLevel();
  const showEnhancedRecovery = severity === 'critical' || consecutiveFailures >= 3;

  return (
    <Card className={`border-2 transition-colors duration-300 ${
      severity === 'success' ? 'border-green-200 bg-green-50' :
      severity === 'critical' ? 'border-red-300 bg-red-50' :
      severity === 'error' ? 'border-red-200 bg-red-50' :
      'border-blue-200 bg-blue-50'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">MFS100 Device</span>
                {getStatusBadge()}
              </div>
              
              {isRecovering && recoveryMessage && (
                <div className="flex items-center space-x-2 mt-1">
                  <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                  <span className="text-xs text-blue-600">{recoveryMessage}</span>
                </div>
              )}
              
              {severity === 'critical' && !isRecovering && (
                <span className="text-xs text-red-600 mt-1">
                  Service has stopped - enhanced recovery available
                </span>
              )}
              
              {consecutiveFailures >= 3 && !isRecovering && severity !== 'critical' && (
                <span className="text-xs text-red-600 mt-1">
                  Multiple failures detected - enhanced recovery recommended
                </span>
              )}
              
              <span className="text-xs text-gray-500 mt-1">
                Last check: {lastCheckTime ? lastCheckTime.toLocaleTimeString() : 'Not checked'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Status Indicators */}
            {severity === 'success' && (
              <div className="flex items-center space-x-1 text-xs text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span>Service Running</span>
              </div>
            )}
            
            {showEnhancedRecovery && (
              <div className="flex items-center space-x-1 text-xs text-red-600">
                <Zap className="h-3 w-3" />
                <span>Recovery Needed</span>
              </div>
            )}
            
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => checkDevice()}
                disabled={isRecovering}
                title="Check connection manually"
              >
                <RefreshCw className={`h-4 w-4 ${isRecovering ? 'animate-spin' : ''}`} />
              </Button>
              
              {/* Enhanced Recovery Button */}
              {showEnhancedRecovery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnhancedRecovery}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                  disabled={isRecovering}
                  title="Enhanced service recovery - restarts service automatically"
                >
                  <Zap className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={resetConnection}
                disabled={isRecovering}
                title="Reset connection state"
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Recovery Progress */}
        {isRecovering && (
          <div className="mt-3">
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full animate-pulse w-full"></div>
            </div>
          </div>
        )}

        {/* Critical Service Alert */}
        {severity === 'critical' && !isRecovering && (
          <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded text-xs">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-red-700">MFS100 Service Stopped</div>
                <div className="text-red-600 mt-1">
                  The service has crashed or been stopped. Use the enhanced recovery button to automatically restart it.
                </div>
                <div className="text-red-500 text-xs mt-1 font-medium">
                  Enhanced recovery will attempt to restart the service without requiring a computer restart.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Multiple Failures Alert */}
        {consecutiveFailures >= 3 && severity !== 'critical' && !isRecovering && (
          <div className="mt-3 p-2 bg-orange-100 border border-orange-200 rounded text-xs">
            <div className="flex items-center space-x-2">
              <Wrench className="h-4 w-4 text-orange-500" />
              <div>
                <div className="font-medium text-orange-700">Service Instability Detected</div>
                <div className="text-orange-600">
                  Enhanced recovery recommended to stabilize the service.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
