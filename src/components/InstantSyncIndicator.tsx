import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Zap, 
  Users, 
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useGlobalRealTime } from '@/components/GlobalRealTimeProvider';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { toast } from 'sonner';

/**
 * Compact floating sync indicator that doesn't overlap with any content
 */
export function InstantSyncIndicator() {
  const { isOnline } = useOnlineStatus();
  const { forceGlobalRefresh, emergencySync, isActive } = useGlobalRealTime();
  const { activeUsers, isCollaborationActive } = useRealtimeCollaboration();
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [syncCount, setSyncCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Compact collapsed view
  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-1">
        {/* Main sync indicator */}
        <div 
          className={`
            flex items-center gap-2 px-3 py-2 rounded-full shadow-lg cursor-pointer
            transition-all duration-300 backdrop-blur-sm border
            ${isOnline && isActive && isCollaborationActive 
              ? 'bg-green-50/95 border-green-200 hover:bg-green-100/95' 
              : isOnline 
                ? 'bg-amber-50/95 border-amber-200 hover:bg-amber-100/95'
                : 'bg-red-50/95 border-red-200 hover:bg-red-100/95'
            }
          `}
          onClick={() => setIsExpanded(true)}
        >
          {!isOnline ? (
            <WifiOff className="h-4 w-4 text-red-500" />
          ) : isActive && isCollaborationActive ? (
            <div className="relative">
              <Zap className="h-4 w-4 text-green-500" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
            </div>
          ) : (
            <Wifi className="h-4 w-4 text-amber-500 animate-pulse" />
          )}
          
          {activeUsers.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {activeUsers.length}
            </Badge>
          )}
          
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Expanded view with controls
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
      {/* Expanded panel */}
      <div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-xl border p-4 min-w-[280px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-600">Offline</span>
              </>
            ) : isActive && isCollaborationActive ? (
              <>
                <div className="relative">
                  <Zap className="h-4 w-4 text-green-500" />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <span className="text-sm font-medium text-green-600">Live Sync Active</span>
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 text-amber-500 animate-pulse" />
                <span className="text-sm font-medium text-amber-600">Connecting</span>
              </>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="h-6 w-6 p-0"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-4">
            {activeUsers.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{activeUsers.length} online</span>
              </div>
            )}
            <div>
              <span>{syncCount} syncs</span>
            </div>
            <div>
              {lastSyncTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleForceRefresh}
            className="flex-1 h-8 text-xs"
            disabled={!isOnline}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleEmergencySync}
            className="flex-1 h-8 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
            disabled={!isOnline}
          >
            Emergency
          </Button>
        </div>
      </div>
    </div>
  );
}