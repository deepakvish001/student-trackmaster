
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useRDService } from '@/hooks/useRDService';

export function RDServiceStatusIndicator() {
  const { isAvailable, isChecking, error, resetConnection } = useRDService();
  const [lastStatusChange, setLastStatusChange] = useState<Date>(new Date());

  useEffect(() => {
    setLastStatusChange(new Date());
  }, [isAvailable]);

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-2">
        {isAvailable ? (
          <Wifi className="h-5 w-5 text-green-500" />
        ) : (
          <WifiOff className="h-5 w-5 text-red-500" />
        )}
        
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">RD Service</span>
            <Badge variant={isAvailable ? "default" : "destructive"}>
              {isChecking ? 'Checking...' : isAvailable ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          
          {error && (
            <span className="text-xs text-red-600 mt-1">{error}</span>
          )}
          
          <span className="text-xs text-gray-500 mt-1">
            Last check: {lastStatusChange.toLocaleTimeString()}
          </span>
        </div>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={resetConnection}
        disabled={isChecking}
        className="ml-auto"
      >
        <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
        <span className="ml-1">Retry</span>
      </Button>
    </div>
  );
}
