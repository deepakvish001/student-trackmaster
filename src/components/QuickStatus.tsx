import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface QuickStatusProps {
  showSync?: boolean;
  compact?: boolean;
}

export function QuickStatus({ showSync = true, compact = false }: QuickStatusProps) {
  const { isOnline } = useOnlineStatus();
  const { syncToSupabase, isSyncing, pendingCount, lastSyncTime } = useOfflineSync();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Connection Status */}
        <div className={`
          flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
          ${isOnline 
            ? 'bg-emerald-green/10 text-emerald-green border border-emerald-green/20' 
            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
          }
        `}>
          {isOnline ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Pending Count */}
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-xs h-5">
            {pendingCount} pending
          </Badge>
        )}

        {/* Sync Button */}
        {showSync && isOnline && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => syncToSupabase(true)}
            disabled={isSyncing}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <div className="w-2 h-2 bg-emerald-green rounded-full animate-pulse"></div>
                  <Wifi className="w-4 h-4 text-emerald-green" />
                  <span className="text-sm font-medium text-emerald-green">Online</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <WifiOff className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-500">Offline</span>
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

            {/* Last Sync */}
            {lastSyncTime && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Last sync: {formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {showSync && isOnline && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncToSupabase(true)}
                disabled={isSyncing}
                className="h-8 gap-2"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync'}
              </Button>
            )}

            {!isOnline && (
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
      </CardContent>
    </Card>
  );
}