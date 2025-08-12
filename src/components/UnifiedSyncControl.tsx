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
  ChevronDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useGlobalRealTime } from '@/components/GlobalRealTimeProvider';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface UnifiedSyncControlProps {
  variant?: 'floating' | 'compact' | 'full';
  showCollaboration?: boolean;
  className?: string;
}

/**
 * Unified sync control that handles all sync, refresh, and collaboration functionality
 * Replaces: InstantSyncIndicator, QuickStatus, SyncButton, AdvancedSyncStatus
 */
export function UnifiedSyncControl({ 
  variant = 'compact', 
  showCollaboration = true,
  className = ''
}: UnifiedSyncControlProps) {
  const { isOnline } = useOnlineStatus();
  const { forceGlobalRefresh, emergencySync, isActive } = useGlobalRealTime();
  const { activeUsers, isCollaborationActive } = useRealtimeCollaboration();
  const { syncToSupabase, isSyncing, pendingCount, lastSyncTime } = useOfflineSync();
  
  const [lastSyncTimeLocal, setLastSyncTimeLocal] = useState<Date>(new Date());
  const [syncCount, setSyncCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isActive && isCollaborationActive) {
      setLastSyncTimeLocal(new Date());
      setSyncCount(prev => prev + 1);
    }
  }, [isActive, isCollaborationActive]);

  const handleForceRefresh = () => {
    forceGlobalRefresh();
    setLastSyncTimeLocal(new Date());
    setSyncCount(prev => prev + 1);
    toast.success('🔄 Global refresh initiated!');
  };

  const handleEmergencySync = () => {
    emergencySync();
    setLastSyncTimeLocal(new Date());
    setSyncCount(prev => prev + 1);
    toast.success('🚨 Emergency sync completed!');
  };

  const handleRegularSync = () => {
    syncToSupabase(true);
    setLastSyncTimeLocal(new Date());
    setSyncCount(prev => prev + 1);
  };

  // Status helpers
  const getConnectionStatus = () => {
    if (!isOnline) return { icon: WifiOff, text: 'Offline', color: 'red' };
    if (isActive && isCollaborationActive) return { icon: Zap, text: 'Live Sync Active', color: 'green' };
    return { icon: Wifi, text: 'Online', color: 'amber' };
  };

  const status = getConnectionStatus();

  // Floating variant (replaces InstantSyncIndicator)
  if (variant === 'floating') {
    if (!isExpanded) {
      return (
        <div className={`fixed bottom-4 right-20 z-[9998] flex flex-col items-end gap-1 ${className}`}>
          <div 
            className={`
              flex items-center gap-2 px-3 py-2 rounded-full shadow-lg cursor-pointer
              transition-all duration-300 backdrop-blur-sm border
              ${status.color === 'green' 
                ? 'bg-green-50/95 border-green-200 hover:bg-green-100/95' 
                : status.color === 'amber'
                  ? 'bg-amber-50/95 border-amber-200 hover:bg-amber-100/95'
                  : 'bg-red-50/95 border-red-200 hover:bg-red-100/95'
              }
            `}
            onClick={() => setIsExpanded(true)}
          >
            {status.color === 'green' ? (
              <div className="relative">
                <status.icon className="h-4 w-4 text-green-500" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              </div>
            ) : (
              <status.icon className={`h-4 w-4 text-${status.color}-500 ${status.color === 'amber' ? 'animate-pulse' : ''}`} />
            )}
            
            {showCollaboration && activeUsers.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {activeUsers.length}
              </Badge>
            )}
            
            {pendingCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                {pendingCount}
              </Badge>
            )}
            
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
      );
    }

    return (
      <div className={`fixed bottom-4 right-20 z-[9998] flex flex-col items-end gap-2 ${className}`}>
        <div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-xl border p-4 min-w-[320px] mb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <status.icon className={`h-4 w-4 text-${status.color}-500`} />
              <span className={`text-sm font-medium text-${status.color}-600`}>{status.text}</span>
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

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-4">
              {showCollaboration && activeUsers.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{activeUsers.length} online</span>
                </div>
              )}
              {pendingCount > 0 && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <span>{pendingCount} pending</span>
                </div>
              )}
              <div>
                <span>{syncCount} syncs</span>
              </div>
              <div>
                {lastSyncTimeLocal.toLocaleTimeString()}
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
              onClick={handleRegularSync}
              className="flex-1 h-8 text-xs"
              disabled={!isOnline || isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Database className="h-3 w-3 mr-1" />
              )}
              {isSyncing ? 'Syncing...' : 'Sync'}
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

  // Compact variant (replaces QuickStatus compact mode)
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Connection Status */}
        <div className={`
          flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
          ${status.color === 'green'
            ? 'bg-emerald-green/10 text-emerald-green border border-emerald-green/20' 
            : status.color === 'amber'
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }
        `}>
          <status.icon className="w-3 h-3" />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Collaboration */}
        {showCollaboration && activeUsers.length > 0 && (
          <Badge variant="secondary" className="text-xs h-5">
            {activeUsers.length} users
          </Badge>
        )}

        {/* Pending Count */}
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-xs h-5">
            {pendingCount} pending
          </Badge>
        )}

        {/* Sync Button */}
        {isOnline && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleForceRefresh}
            disabled={isSyncing}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  // Full variant (replaces AdvancedSyncStatus and QuickStatus full mode)
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Status Card */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {status.color === 'green' ? (
                <>
                  <div className="w-2 h-2 bg-emerald-green rounded-full animate-pulse"></div>
                  <status.icon className="w-4 h-4 text-emerald-green" />
                  <span className="text-sm font-medium text-emerald-green">{status.text}</span>
                </>
              ) : status.color === 'amber' ? (
                <>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <status.icon className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-500">{status.text}</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <status.icon className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-500">{status.text}</span>
                </>
              )}
            </div>

            {/* Sync Status */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {pendingCount > 0 ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>{pendingCount} pending sync{pendingCount !== 1 ? 's' : ''}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-green" />
                  <span>All synced</span>
                </>
              )}
            </div>

            {/* Collaboration Status */}
            {showCollaboration && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{activeUsers.length} active user{activeUsers.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Last Sync */}
            {(lastSyncTime || lastSyncTimeLocal) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  Last sync: {formatDistanceToNow(new Date(lastSyncTime || lastSyncTimeLocal), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegularSync}
                  disabled={isSyncing}
                  className="h-8 gap-2"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleForceRefresh}
                  className="h-8 gap-2"
                >
                  <Activity className="w-3 h-3" />
                  Refresh All
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-1 text-xs text-amber-500 px-2 py-1 bg-amber-500/10 rounded">
                <Zap className="w-3 h-3" />
                <span>Working offline</span>
              </div>
            )}
          </div>
        </div>

        {/* Offline Message */}
        {!isOnline && pendingCount > 0 && (
          <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-600">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Changes will sync automatically when you reconnect to the internet.
          </div>
        )}
      </div>
    </div>
  );
}