import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Zap, 
  Users, 
  Database,
  AlertTriangle
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useGlobalRealTime } from '@/components/GlobalRealTimeProvider';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { toast } from 'sonner';

/**
 * Visual indicator showing instant sync status and providing manual controls
 */
export function InstantSyncIndicator() {
  const { isOnline } = useOnlineStatus();
  const { forceGlobalRefresh, emergencySync, isActive } = useGlobalRealTime();
  const { activeUsers, isCollaborationActive } = useRealtimeCollaboration();
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [syncCount, setSyncCount] = useState(0);

  useEffect(() => {
    if (isActive && isCollaborationActive) {
      setLastSyncTime(new Date());
      setSyncCount(prev => prev + 1);
    }
  }, [isActive, isCollaborationActive]);

  const handleForceRefresh = () => {
    forceGlobalRefresh();
    setLastSyncTime(new Date());
    setSyncCount(prev => prev + 1);
    toast.success('🔄 Global refresh initiated!');
  };

  const handleEmergencySync = () => {
    emergencySync();
    setLastSyncTime(new Date());
    setSyncCount(prev => prev + 1);
    toast.success('🚨 Emergency sync completed!');
  };

  if (!isOnline) {
    return (
      <Card className="fixed bottom-4 right-4 p-3 z-50 border-destructive">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">Offline Mode</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 p-3 z-50 bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {isActive && isCollaborationActive ? (
            <>
              <div className="relative">
                <Zap className="h-4 w-4 text-green-500 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              </div>
              <span className="text-sm font-medium text-green-600">Live Sync</span>
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-600">Connecting...</span>
            </>
          )}
        </div>

        {/* Active Users */}
        {activeUsers.length > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-blue-500" />
            <Badge variant="secondary" className="text-xs">
              {activeUsers.length}
            </Badge>
          </div>
        )}

        {/* Sync Stats */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Database className="h-3 w-3" />
          <span>{syncCount}</span>
        </div>

        {/* Manual Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleForceRefresh}
            className="h-7 w-7 p-0"
            title="Force Global Refresh"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEmergencySync}
            className="h-7 w-7 p-0 text-orange-500 hover:text-orange-600"
            title="Emergency Sync"
          >
            <AlertTriangle className="h-3 w-3" />
          </Button>
        </div>

        {/* Last Sync Time */}
        <div className="text-xs text-muted-foreground">
          {lastSyncTime.toLocaleTimeString()}
        </div>
      </div>
    </Card>
  );
}