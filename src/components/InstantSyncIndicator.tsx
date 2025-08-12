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
      <Card className="fixed top-4 left-4 p-3 z-[9999] border-destructive bg-destructive/10 backdrop-blur-sm shadow-lg">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive font-medium">Offline Mode</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed top-4 left-4 p-3 z-[9999] bg-background/95 backdrop-blur-sm shadow-lg border-primary/20">
      <div className="flex items-center gap-3">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {isActive && isCollaborationActive ? (
            <>
              <div className="relative">
                <Zap className="h-5 w-5 text-green-500 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
              </div>
              <span className="text-sm font-semibold text-green-600">Live Sync Active</span>
            </>
          ) : (
            <>
              <Wifi className="h-5 w-5 text-amber-500 animate-pulse" />
              <span className="text-sm font-medium text-amber-600">Connecting...</span>
            </>
          )}
        </div>

        {/* Active Users */}
        {activeUsers.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-full">
            <Users className="h-4 w-4 text-blue-500" />
            <Badge variant="secondary" className="text-xs font-semibold">
              {activeUsers.length} online
            </Badge>
          </div>
        )}

        {/* Sync Stats */}
        <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-full">
          <Database className="h-4 w-4 text-gray-600" />
          <span className="text-xs font-medium text-gray-700">{syncCount} syncs</span>
        </div>

        {/* Last Sync Time */}
        <div className="text-xs text-muted-foreground font-medium">
          {lastSyncTime.toLocaleTimeString()}
        </div>

        {/* Manual Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleForceRefresh}
            className="h-8 px-3 text-xs font-medium"
            title="Force Global Refresh"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleEmergencySync}
            className="h-8 px-3 text-xs font-medium text-orange-600 border-orange-200 hover:bg-orange-50"
            title="Emergency Sync"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Emergency
          </Button>
        </div>
      </div>
    </Card>
  );
}