import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Wifi, RefreshCw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const { syncToSupabase, isSyncing, pendingCount, lastSyncTime } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className={`
      fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md
      ${isOnline 
        ? 'bg-emerald-green/10 border-emerald-green/20 text-emerald-green' 
        : 'bg-destructive/10 border-destructive/20 text-destructive'
      }
    `}>
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          
          <span className="text-sm font-medium">
            {isOnline ? 'Back Online' : 'Offline Mode'}
          </span>
          
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingCount} pending sync{pendingCount !== 1 ? 's' : ''}
            </Badge>
          )}
          
          {lastSyncTime && (
            <div className="flex items-center gap-1 text-xs opacity-75">
              <Clock className="h-3 w-3" />
              Last sync: {formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })}
            </div>
          )}
        </div>

        {isOnline && pendingCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => syncToSupabase(true)}
            disabled={isSyncing}
            className="text-xs h-7"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Sync Now
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}