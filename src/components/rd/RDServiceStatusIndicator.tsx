
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useSmartDeviceDetection } from '@/hooks/useSmartDeviceDetection';

export function RDServiceStatusIndicator() {
  const { isConnected, lastStateChange, manualCheck } = useSmartDeviceDetection();
  const [isManualChecking, setIsManualChecking] = useState(false);

  const handleManualCheck = async () => {
    setIsManualChecking(true);
    try {
      await manualCheck();
    } finally {
      setIsManualChecking(false);
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
            <span className="text-sm font-medium">RD Service</span>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isManualChecking ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          
          <span className="text-xs text-gray-500 mt-1">
            Last check: {lastStateChange.toLocaleTimeString()}
          </span>
          
          {isConnected && (
            <span className="text-xs text-green-600 mt-1">
              Smart detection active - will detect reconnections automatically
            </span>
          )}
        </div>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleManualCheck}
        disabled={isManualChecking}
        className="ml-auto"
      >
        <RefreshCw className={`h-4 w-4 ${isManualChecking ? 'animate-spin' : ''}`} />
        <span className="ml-1">Check Now</span>
      </Button>
    </div>
  );
}
