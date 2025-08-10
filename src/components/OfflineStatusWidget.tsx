import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Cloud, CloudOff, RefreshCw, Database, Users, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineStatusWidget() {
  const { syncStatus, syncData, clearOfflineData } = useOfflineSync();
  const { isOnline, isSlowConnection } = useNetworkStatus();

  const getStorageStats = async () => {
    if (!syncStatus.isInitialized) return null;
    
    try {
      const { offlineStorage } = await import('@/services/offlineStorageService');
      return await offlineStorage.getStorageInfo();
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return null;
    }
  };

  const [storageStats, setStorageStats] = React.useState<any>(null);

  React.useEffect(() => {
    if (syncStatus.isInitialized) {
      getStorageStats().then(setStorageStats);
    }
  }, [syncStatus.isInitialized, syncStatus.pendingOperations]);

  if (!syncStatus.isInitialized) return null;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          {isOnline ? (
            <Cloud className="h-5 w-5 text-emerald-green" />
          ) : (
            <CloudOff className="h-5 w-5 text-destructive" />
          )}
          Offline Capabilities
        </h3>
        <Badge 
          variant={isOnline ? "default" : "destructive"}
          className={cn(
            isOnline && isSlowConnection && "bg-sunset-orange/20 text-sunset-orange"
          )}
        >
          {!isOnline ? 'Offline' : isSlowConnection ? 'Slow' : 'Online'}
        </Badge>
      </div>

      {/* Storage Stats */}
      {storageStats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-electric-blue" />
            <span>{storageStats.students} Students</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-vibrant-purple" />
            <span>{storageStats.batches} Batches</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Fingerprint className="h-4 w-4 text-emerald-green" />
            <span>{storageStats.fingerprints} Prints</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4 text-sunset-orange" />
            <span>{storageStats.pendingOperations} Pending</span>
          </div>
        </div>
      )}

      {/* Sync Status */}
      {syncStatus.pendingOperations > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pending Operations:</span>
            <Badge variant="outline" className="text-sunset-orange border-sunset-orange/30">
              {syncStatus.pendingOperations}
            </Badge>
          </div>
          
          {isOnline && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={syncData}
              disabled={syncStatus.isSyncing}
              className="w-full"
            >
              {syncStatus.isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Last Sync Time */}
      {syncStatus.lastSyncTime && (
        <div className="text-xs text-muted-foreground">
          Last sync: {syncStatus.lastSyncTime.toLocaleString()}
        </div>
      )}

      {/* Offline Mode Benefits */}
      {!isOnline && (
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <strong>Working Offline:</strong> All data is saved locally and will sync automatically when connection is restored.
        </div>
      )}
    </Card>
  );
}