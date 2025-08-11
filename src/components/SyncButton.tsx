import { Button } from '@/components/ui/button';
import { RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Badge } from '@/components/ui/badge';

export function SyncButton() {
  const { isOnline } = useOnlineStatus();
  const { syncToSupabase, isSyncing, pendingCount } = useOfflineSync();

  if (!isOnline) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <CloudOff className="h-4 w-4" />
        Offline
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => syncToSupabase(true)}
        disabled={isSyncing}
        className="gap-2"
      >
        {isSyncing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <Cloud className="h-4 w-4" />
            Sync
          </>
        )}
      </Button>
      
      {pendingCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 min-w-5 text-xs flex items-center justify-center p-1"
        >
          {pendingCount}
        </Badge>
      )}
    </div>
  );
}