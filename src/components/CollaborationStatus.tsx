import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
  Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function CollaborationStatus() {
  const { isOnline } = useOnlineStatus();
  const { activeUsers, conflictCount, lastRealtimeEvent, conflicts } = useRealtimeCollaboration();

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'INSERT': return 'text-emerald-600 bg-emerald-50';
      case 'UPDATE': return 'text-blue-600 bg-blue-50';
      case 'DELETE': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-emerald-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-500" />
            )}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge 
                variant={isOnline ? "default" : "secondary"} 
                className={isOnline ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
              
              {isOnline && (
                <div className="flex items-center gap-1 text-sm text-emerald-600">
                  <Zap className="w-4 h-4" />
                  <span>Real-time enabled</span>
                </div>
              )}
            </div>

            {!isOnline && (
              <Alert className="bg-amber-50 border-amber-200 flex-1 ml-4">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  Working offline. Changes will sync when connection is restored.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Collaboration */}
      {isOnline && (
        <Card>
          <CardHeader className=\"pb-3\">
            <CardTitle className=\"flex items-center gap-2 text-lg\">
              <Users className=\"w-5 h-5 text-blue-600\" />
              Live Collaboration
              {activeUsers.length > 0 && (
                <Badge variant=\"outline\" className=\"ml-2\">
                  {activeUsers.length} active
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeUsers.length > 0 ? (
              <div className=\"space-y-3\">
                <div className=\"flex items-center gap-2 text-sm text-emerald-600\">
                  <Eye className=\"w-4 h-4\" />
                  <span>
                    {activeUsers.length} user{activeUsers.length !== 1 ? 's' : ''} currently editing
                  </span>
                </div>

                {lastRealtimeEvent && (
                  <Alert className=\"bg-blue-50 border-blue-200\">
                    <Activity className=\"h-4 w-4 text-blue-600\" />
                    <AlertDescription className=\"text-blue-800 text-sm\">
                      <div className=\"flex items-center justify-between\">
                        <span>
                          Latest: <Badge 
                            variant=\"outline\" 
                            className={getEventColor(lastRealtimeEvent.event_type)}
                          >
                            {lastRealtimeEvent.event_type}
                          </Badge>
                          {' '}on {lastRealtimeEvent.table}
                          {lastRealtimeEvent.new_record?.student_name && (
                            <> - {lastRealtimeEvent.new_record.student_name}</>
                          )}
                          {lastRealtimeEvent.new_record?.batch_name && (
                            <> - {lastRealtimeEvent.new_record.batch_name}</>
                          )}
                        </span>
                        <span className=\"text-xs text-blue-600\">
                          {formatDistanceToNow(new Date(lastRealtimeEvent.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className=\"text-sm text-muted-foreground\">
                No other users currently active
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Conflict Resolution */}
      {conflictCount > 0 && (
        <Card>
          <CardHeader className=\"pb-3\">
            <CardTitle className=\"flex items-center gap-2 text-lg\">
              <AlertTriangle className=\"w-5 h-5 text-amber-600\" />
              Conflict Resolution
              <Badge variant=\"outline\" className=\"bg-amber-50 text-amber-800\">
                {conflictCount} resolved
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className=\"space-y-2\">
              <div className=\"text-sm text-muted-foreground\">
                Recent conflicts have been automatically resolved using the \"latest timestamp wins\" strategy.
              </div>
              
              {conflicts.slice(0, 3).map((conflict: any) => (
                <Alert key={conflict.id} className=\"bg-amber-50 border-amber-200\">
                  <CheckCircle className=\"h-4 w-4 text-amber-600\" />
                  <AlertDescription className=\"text-amber-800 text-sm\">
                    <div className=\"flex items-center justify-between\">
                      <span>
                        {conflict.table} conflict resolved: {conflict.resolution.replace('_', ' ')}
                      </span>
                      <span className=\"text-xs\">
                        {formatDistanceToNow(new Date(conflict.resolved_at), { addSuffix: true })}
                      </span>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Information */}
      <Card>
        <CardHeader className=\"pb-3\">
          <CardTitle className=\"flex items-center gap-2 text-lg\">
            <RefreshCw className=\"w-5 h-5 text-purple-600\" />
            Sync & Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"grid grid-cols-2 gap-4 text-sm\">
            <div>
              <div className=\"text-muted-foreground\">Mode</div>
              <div className=\"font-medium\">
                {isOnline ? 'Online Sync' : 'Offline Storage'}
              </div>
            </div>
            <div>
              <div className=\"text-muted-foreground\">Collaboration</div>
              <div className=\"font-medium\">
                {isOnline ? 'Real-time' : 'Disabled'}
              </div>
            </div>
            <div>
              <div className=\"text-muted-foreground\">Conflict Strategy</div>
              <div className=\"font-medium\">Latest Timestamp Wins</div>
            </div>
            <div>
              <div className=\"text-muted-foreground\">Data Storage</div>
              <div className=\"font-medium\">Local + Remote</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}