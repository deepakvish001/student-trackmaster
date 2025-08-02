
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Power } from 'lucide-react';
import { useCleanMFS100 } from '@/hooks/useCleanMFS100';

export function RDServiceStatusIndicator() {
  const { isConnected, message, lastCheckTime, checkDevice, reconnectDevice } = useCleanMFS100();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      await checkDevice();
    } finally {
      setIsChecking(false);
    }
  };

  const handleReconnect = async () => {
    setIsChecking(true);
    try {
      await reconnectDevice();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-2">
        {isConnected ? (
          <Wifi className="h-5 w-5 text-green-500" />
        ) : (
          <WifiOff className="h-5 w-5 text-red-500" />
        )}
        
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">MFS100 Device</span>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isChecking ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          
          <span className="text-xs text-gray-500 mt-1">
            {message}
          </span>
          
          {lastCheckTime && (
            <span className="text-xs text-gray-400 mt-1">
              Last check: {lastCheckTime.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={isConnected ? handleCheck : handleReconnect}
          disabled={isChecking}
        >
          {isConnected ? (
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
          ) : (
            <Power className="h-4 w-4" />
          )}
          <span className="ml-1">
            {isConnected ? 'Check' : 'Connect'}
          </span>
        </Button>
      </div>
    </div>
  );
}
