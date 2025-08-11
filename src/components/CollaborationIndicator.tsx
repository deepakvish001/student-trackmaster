import { Users, Clock, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatDistanceToNow } from 'date-fns';

export function CollaborationIndicator() {
  const { activeUsers, recentCollaborationEvents } = useRealtimeCollaboration();
  const { isOnline } = useOnlineStatus();

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/50">
        <WifiOff className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Offline Mode</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        {/* Online Indicator */}
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600 font-medium">Online</span>
        </div>

        {/* Active Users */}
        {activeUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <div className="flex -space-x-2">
              {activeUsers.slice(0, 3).map((user) => (
                <Tooltip key={user.user_id}>
                  <TooltipTrigger>
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {user.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Last seen {formatDistanceToNow(new Date(user.last_seen))} ago
                      </p>
                      {user.current_table && (
                        <p className="text-xs text-primary">
                          Working on {user.current_table}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            {activeUsers.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{activeUsers.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Recent Activity */}
        {recentCollaborationEvents.length > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/20">
                <Clock className="h-3 w-3 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">
                  {recentCollaborationEvents.length}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <div className="space-y-2">
                <p className="font-medium">Recent Collaboration</p>
                {recentCollaborationEvents.slice(0, 3).map((event, index) => (
                  <div key={index} className="text-xs space-y-1">
                    <p>
                      <span className="font-medium capitalize">{event.type.toLowerCase()}</span> in {event.table}
                    </p>
                    <p className="text-muted-foreground">
                      {formatDistanceToNow(new Date(event.timestamp))} ago
                    </p>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}