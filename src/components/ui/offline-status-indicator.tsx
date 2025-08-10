import React from 'react';
import { cn } from '@/lib/utils';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Wifi, WifiOff, CloudOff, Cloud, Loader2, Clock, AlertCircle } from 'lucide-react';
import { Badge } from './badge';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';

export function OfflineStatusIndicator() {
  const networkStatus = useNetworkStatus();
  const { syncStatus, syncData } = useOfflineSync();

  const getStatusInfo = () => {
    if (!networkStatus.isOnline) {
      return {
        icon: WifiOff,
        label: 'Offline',
        color: 'status-offline',
        description: 'Working offline - changes will sync when connection is restored'
      };
    }

    if (syncStatus.isSyncing) {
      return {
        icon: Loader2,
        label: 'Syncing',
        color: 'status-warning',
        description: 'Syncing offline changes...',
        animated: true
      };
    }

    if (syncStatus.pendingOperations > 0) {
      return {
        icon: Clock,
        label: `${syncStatus.pendingOperations} pending`,
        color: 'status-warning',
        description: `${syncStatus.pendingOperations} operations waiting to sync`
      };
    }

    if (networkStatus.isSlowConnection) {
      return {
        icon: AlertCircle,
        label: 'Slow',
        color: 'status-warning',
        description: 'Slow connection detected - some features may be limited'
      };
    }

    return {
      icon: networkStatus.isOnline ? Cloud : CloudOff,
      label: 'Online',
      color: 'status-online',
      description: 'Connected and synced'
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 gap-2">
          <StatusIcon 
            className={cn(
              "h-4 w-4",
              statusInfo.animated && "animate-spin"
            )}
          />
          <Badge 
            variant="outline" 
            className={cn("text-xs px-2 py-1", statusInfo.color)}
          >
            {statusInfo.label}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusIcon 
              className={cn(
                "h-5 w-5",
                statusInfo.animated && "animate-spin"
              )}
            />
            <div>
              <h4 className="font-medium">{statusInfo.label}</h4>
              <p className="text-sm text-muted-foreground">
                {statusInfo.description}
              </p>
            </div>
          </div>

          {/* Network Details */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Connection:</span>
              <span className="font-medium">
                {networkStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            {networkStatus.isOnline && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">
                    {networkStatus.effectiveType}
                  </span>
                </div>
                
                {networkStatus.downlink > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Speed:</span>
                    <span className="font-medium">
                      {networkStatus.downlink} Mbps
                    </span>
                  </div>
                )}
              </>
            )}

            {syncStatus.pendingOperations > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending:</span>
                <span className="font-medium text-sunset-orange">
                  {syncStatus.pendingOperations} operations
                </span>
              </div>
            )}

            {syncStatus.lastSyncTime && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last sync:</span>
                <span className="font-medium">
                  {syncStatus.lastSyncTime.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          {(syncStatus.pendingOperations > 0 || syncStatus.syncErrors.length > 0) && (
            <div className="pt-2 border-t">
              {syncStatus.pendingOperations > 0 && networkStatus.isOnline && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={syncData}
                  disabled={syncStatus.isSyncing}
                  className="w-full mb-2"
                >
                  {syncStatus.isSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Cloud className="h-4 w-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
              )}

              {syncStatus.syncErrors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    Sync Errors:
                  </p>
                  {syncStatus.syncErrors.slice(0, 3).map((error, index) => (
                    <p key={index} className="text-xs text-muted-foreground">
                      {error}
                    </p>
                  ))}
                  {syncStatus.syncErrors.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{syncStatus.syncErrors.length - 3} more errors
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}