
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Wrench, CheckCircle } from 'lucide-react';
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
    triggerRecovery 
  } = useUnifiedMFS100();
  
  const [lastStatusChange, setLastStatusChange] = useState<Date>(new Date());

  useEffect(() => {
    setLastStatusChange(new Date());
  }, [isConnected]);

  const handleManualRecovery = async () => {
    toast.info('Starting MFS100 service recovery...', {
      description: 'This may take a few moments'
    });

    try {
      const result = await triggerRecovery();
      if (result.success) {
        toast.success('Service recovery successful!', {
          description: result.message
        });
      } else {
        toast.error('Recovery failed', {
          description: result.message
        });
      }
    } catch (error) {
      toast.error('Recovery error', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const getStatusIcon = () => {
    if (isRecovering) return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    if (isConnected) return <Wifi className="h-5 w-5 text-green-500" />;
    if (consecutiveFailures > 0) return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    return <WifiOff className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = () => {
    if (isRecovering) return <Badge variant="secondary" className="bg-blue-50 text-blue-700">Recovering...</Badge>;
    if (isConnected) return <Badge className="bg-green-500 text-white">Connected</Badge>;
    if (consecutiveFailures >= 3) return <Badge variant="destructive">Service Down</Badge>;
    if (consecutiveFailures > 0) return <Badge variant="secondary" className="bg-orange-50 text-orange-700">Unstable</Badge>;
    return <Badge variant="destructive">Disconnected</Badge>;
  };

  const getSeverityLevel = () => {
    if (isRecovering) return 'info';
    if (isConnected) return 'success';
    if (consecutiveFailures >= 5) return 'critical';
    if (consecutiveFailures >= 3) return 'error';
    if (consecutiveFailures > 0) return 'warning';
    return 'error';
  };

  const severity = getSeverityLevel();

  return (
    <Card className={`border-2 ${
      severity === 'success' ? 'border-green-200 bg-green-50' :
      severity === 'warning' ? 'border-orange-200 bg-orange-50' :
      severity === 'error' ? 'border-red-200 bg-red-50' :
      severity === 'critical' ? 'border-red-300 bg-red-100' :
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
              
              {error && !isRecovering && (
                <span className="text-xs text-red-600 mt-1">{error}</span>
              )}
              
              {consecutiveFailures > 0 && !isRecovering && (
                <span className="text-xs text-orange-600 mt-1">
                  Failed attempts: {consecutiveFailures}
                </span>
              )}
              
              <span className="text-xs text-gray-500 mt-1">
                Last check: {lastCheckTime ? lastCheckTime.toLocaleTimeString() : 'Never'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Auto Recovery Indicator */}
            {consecutiveFailures >= 3 && !isRecovering && (
              <div className="flex items-center space-x-1 text-xs text-blue-600">
                <Wrench className="h-3 w-3" />
                <span>Auto-recovery available</span>
              </div>
            )}
            
            {/* Success Indicator */}
            {isConnected && consecutiveFailures === 0 && (
              <div className="flex items-center space-x-1 text-xs text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span>Ready</span>
              </div>
            )}
            
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => checkDevice()}
                disabled={isRecovering}
                title="Check connection"
              >
                <RefreshCw className={`h-4 w-4 ${isRecovering ? 'animate-spin' : ''}`} />
              </Button>
              
              {/* Manual Recovery Button - show when service is down */}
              {(consecutiveFailures >= 2 || !isConnected) && !isRecovering && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRecovery}
                  className="text-blue-600 hover:text-blue-700"
                  title="Trigger manual recovery"
                >
                  <Wrench className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={resetConnection}
                disabled={isRecovering}
                title="Reset connection"
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Recovery Progress Bar */}
        {isRecovering && (
          <div className="mt-3">
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full animate-pulse w-full"></div>
            </div>
          </div>
        )}

        {/* Critical Alert */}
        {consecutiveFailures >= 5 && !isRecovering && (
          <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <div className="font-medium text-red-700">Service Critical</div>
                <div className="text-red-600">
                  Multiple connection failures detected. Click the recovery button to attempt automatic fix.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
