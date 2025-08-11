import { useState, useEffect } from 'react';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Wifi,
  WifiOff,
  Eye,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CollaborationBannerProps {
  showDetailedInfo?: boolean;
}

export function CollaborationBanner({ showDetailedInfo = false }: CollaborationBannerProps) {
  const { isOnline } = useOnlineStatus();
  const { syncToSupabase, isSyncing, pendingCount, lastSyncTime } = useOfflineSync();
  const { activeUsers, conflictCount, lastRealtimeEvent } = useRealtimeCollaboration();
  const [showBanner, setShowBanner] = useState(true);

  if (!showBanner) return null;

  const handleSync = () => {
    syncToSupabase(true);
  };

  // Compact banner for when offline or has pending changes
  if (!isOnline || pendingCount > 0) {
    return (
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        !isOnline ? 'bg-amber-500/90' : 'bg-blue-500/90'
      } backdrop-blur-sm border-b border-border`}>
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isOnline ? (
                <>
                  <WifiOff className="w-4 h-4 text-white" />
                  <span className="text-white font-medium text-sm">
                    Working Offline
                  </span>
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 text-white" />
                  <span className="text-white font-medium text-sm">
                    Online
                  </span>
                </>
              )}
              
              {pendingCount > 0 && (
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {pendingCount} pending sync{pendingCount !== 1 ? 's' : ''}
                </Badge>
              )}

              {activeUsers.length > 0 && (
                <div className="flex items-center gap-1 text-white/90 text-xs">
                  <Users className="w-3 h-3" />
                  <span>{activeUsers.length} active</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isSyncing && (
                <div className="flex items-center gap-2 text-white text-xs">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Syncing...</span>
                </div>
              )}

              {isOnline && pendingCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="h-7 px-3 text-white hover:bg-white/20 border border-white/30"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Sync
                </Button>
              )}

              <button
                onClick={() => setShowBanner(false)}
                className="text-white/80 hover:text-white p-1"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detailed collaboration info (optional)
  if (showDetailedInfo && (activeUsers.length > 0 || conflictCount > 0)) {
    return (
      <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Live Collaboration</span>
              </div>

              {activeUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-600 font-medium">
                    {activeUsers.length} user{activeUsers.length !== 1 ? 's' : ''} active
                  </span>
                </div>
              )}

              {conflictCount > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-amber-600 font-medium">
                    {conflictCount} conflict{conflictCount !== 1 ? 's' : ''} resolved
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {lastRealtimeEvent && (
                <div className="text-xs text-muted-foreground">
                  Last update: {formatDistanceToNow(new Date(lastRealtimeEvent.timestamp), { addSuffix: true })}
                </div>
              )}

              <Badge variant="outline" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                Real-time
              </Badge>
            </div>
          </div>

          {lastRealtimeEvent && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <Alert className="bg-blue-50/50 border-blue-200/50">
                <Activity className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-xs">
                  Latest: {lastRealtimeEvent.event_type.toLowerCase()} on {lastRealtimeEvent.table} 
                  {lastRealtimeEvent.new_record?.student_name && ` - ${lastRealtimeEvent.new_record.student_name}`}
                  {lastRealtimeEvent.new_record?.batch_name && ` - ${lastRealtimeEvent.new_record.batch_name}`}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}