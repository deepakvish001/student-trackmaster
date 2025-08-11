import { Activity, Users, Database, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAdvancedSync } from '@/hooks/useAdvancedSync';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatDistanceToNow } from 'date-fns';

export function AdvancedSyncStatus() {
  const { 
    performAdvancedSync, 
    isSyncing, 
    syncProgress, 
    conflictState,
    resolveConflicts,
    hasConflicts 
  } = useAdvancedSync();
  const { activeUsers, recentCollaborationEvents } = useRealtimeCollaboration();
  const { isOnline } = useOnlineStatus();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Network Status */}
      <Card className={`border-2 ${isOnline ? 'border-green-200 bg-green-50/50' : 'border-orange-200 bg-orange-50/50'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className={`h-4 w-4 ${isOnline ? 'text-green-600' : 'text-orange-600'}`} />
            Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Badge variant={isOnline ? 'default' : 'secondary'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {isOnline ? 'Real-time sync active' : 'Working offline'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isSyncing ? (
              <>
                <Progress 
                  value={(syncProgress.current / syncProgress.total) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  Syncing {syncProgress.current}/{syncProgress.total}
                </p>
              </>
            ) : (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => performAdvancedSync(true)}
                  disabled={!isOnline}
                  className="w-full"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync Now
                </Button>
                <p className="text-xs text-muted-foreground">
                  All data synchronized
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Collaborators */}
      <Card className="border-2 border-purple-200 bg-purple-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-600" />
            Active Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-purple-700">
                {activeUsers.length}
              </Badge>
              <span className="text-xs text-muted-foreground">online</span>
            </div>
            {activeUsers.length > 0 && (
              <div className="text-xs space-y-1">
                {activeUsers.slice(0, 2).map(user => (
                  <div key={user.user_id} className="flex items-center justify-between">
                    <span className="truncate">{user.full_name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {user.current_table || 'dashboard'}
                    </Badge>
                  </div>
                ))}
                {activeUsers.length > 2 && (
                  <p className="text-muted-foreground">+{activeUsers.length - 2} more</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conflicts & Activity */}
      <Card className={`border-2 ${hasConflicts ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {hasConflicts ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : (
              <Activity className="h-4 w-4 text-green-600" />
            )}
            {hasConflicts ? 'Conflicts' : 'Activity'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {hasConflicts ? (
              <>
                <Badge variant="destructive">
                  {conflictState.conflicts.length} conflicts
                </Badge>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => resolveConflicts(conflictState.conflicts, 'local_wins')}
                  className="w-full text-xs"
                  disabled={conflictState.isResolvingConflicts}
                >
                  Resolve All
                </Button>
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-green-700">
                  {recentCollaborationEvents.length} recent
                </Badge>
                {recentCollaborationEvents.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(recentCollaborationEvents[0].timestamp))} ago
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}