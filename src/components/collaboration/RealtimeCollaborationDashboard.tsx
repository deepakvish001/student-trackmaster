import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Activity, 
  Eye, 
  Clock, 
  Globe, 
  UserCheck,
  UserX,
  MapPin,
  Smartphone,
  Monitor,
  RefreshCw,
  Bell,
  Settings,
  Zap
} from 'lucide-react';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { useRealtimeDataSync } from '@/hooks/useRealtimeDataSync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatDistanceToNow } from 'date-fns';

export function RealtimeCollaborationDashboard() {
  const { isOnline } = useOnlineStatus();
  const [showNotifications, setShowNotifications] = useState(true);
  
  const {
    activeUsers: onlineUsers,
    updatePresence: updateActivity
  } = useRealtimeCollaboration();

  // Mock data for compatibility
  const currentActivity = new Map();
  const totalOnlineUsers = onlineUsers.length;
  const realtimeConnected = true;
  const getCurrentPageUsers = () => onlineUsers;
  const getUsersByActivity = (activity: string) => onlineUsers.filter(user => (user.current_table || 'browsing') === activity);

  const {
    isConnected: dataSyncConnected,
    updates,
    clearUpdates,
    getRecentUpdates,
    totalUpdates
  } = useRealtimeDataSync({
    tables: ['students', 'batches', 'student_fingerprints', 'user_profiles'],
    enableNotifications: showNotifications,
    onUpdate: (update) => {
      console.log('Realtime update:', update);
    }
  });

  const activeUsers = getUsersByActivity('active');
  const recentUpdates = getRecentUpdates(10);
  const currentPageUsers = getCurrentPageUsers();

  const getActivityIcon = (activity: string) => {
    switch (activity) {
      case 'active': return <Activity className="w-3 h-3 text-green-500" />;
      case 'capturing_fingerprint': return <Smartphone className="w-3 h-3 text-blue-500" />;
      case 'browsing': return <Eye className="w-3 h-3 text-gray-500" />;
      case 'away': return <Clock className="w-3 h-3 text-yellow-500" />;
      default: return <Activity className="w-3 h-3 text-gray-500" />;
    }
  };

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return <Monitor className="w-3 h-3" />;
    if (userAgent.includes('Mobile')) return <Smartphone className="w-3 h-3" />;
    return <Monitor className="w-3 h-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Realtime Collaboration</h2>
            <p className="text-muted-foreground">Live user activity and data synchronization</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={realtimeConnected ? 'default' : 'destructive'} className="gap-1">
            <Zap className="w-3 h-3" />
            {realtimeConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Badge variant={dataSyncConnected ? 'default' : 'secondary'} className="gap-1">
            <RefreshCw className="w-3 h-3" />
            Data Sync: {dataSyncConnected ? 'Active' : 'Inactive'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotifications(!showNotifications)}
            className="gap-2"
          >
            <Bell className={`w-4 h-4 ${showNotifications ? 'text-primary' : 'text-muted-foreground'}`} />
            Notifications {showNotifications ? 'On' : 'Off'}
          </Button>
        </div>
      </div>

      {/* Connection Status Alert */}
      {!isOnline && (
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertDescription>
            You're currently offline. Realtime features will be limited until you reconnect.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{totalOnlineUsers}</div>
                <p className="text-xs text-muted-foreground">Online Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{activeUsers.length}</div>
                <p className="text-xs text-muted-foreground">Active Now</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{currentPageUsers.length}</div>
                <p className="text-xs text-muted-foreground">This Page</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{totalUpdates}</div>
                <p className="text-xs text-muted-foreground">Live Updates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Online Users</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="updates">Data Updates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Active Users ({totalOnlineUsers})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {onlineUsers.length > 0 ? (
                <div className="space-y-3">
                  {onlineUsers.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {user.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.current_table || 'Unknown page'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          {getActivityIcon(user.current_table || 'browsing')}
                          {user.current_table || 'browsing'}
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          {getDeviceIcon()}
                          {formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No other users online right now
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Live Activity Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {onlineUsers.map((user) => (
                  <div
                    key={`${user.user_id}-activity`}
                    className="flex items-center gap-3 p-2 border-l-2 border-primary/30 pl-4"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <div className="flex-1">
                      <span className="font-medium">{user.full_name}</span>
                      <span className="text-muted-foreground"> is </span>
                      <span className="text-primary">{user.current_table || 'browsing'}</span>
                      <span className="text-muted-foreground"> on </span>
                      <span className="text-sm font-mono">{user.current_table || 'dashboard'}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Database Updates ({totalUpdates})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={clearUpdates}>
                  Clear History
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentUpdates.length > 0 ? (
                <div className="space-y-2">
                  {recentUpdates.map((update, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            update.action === 'INSERT' ? 'default' :
                            update.action === 'UPDATE' ? 'secondary' : 'destructive'
                          }
                        >
                          {update.action}
                        </Badge>
                        <span className="font-medium">{update.table}</span>
                        {update.new_record?.student_name && (
                          <span className="text-muted-foreground">
                            - {update.new_record.student_name}
                          </span>
                        )}
                        {update.new_record?.batch_name && (
                          <span className="text-muted-foreground">
                            - {update.new_record.batch_name}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(update.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent database updates
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Collaboration Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Real-time Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Get notified when other users make changes
                  </div>
                </div>
                <Button
                  variant={showNotifications ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  {showNotifications ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Activity Tracking</div>
                  <div className="text-sm text-muted-foreground">
                    Share your current activity with other users
                  </div>
                </div>
                <Badge variant="default">Always On</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Presence Status</div>
                  <div className="text-sm text-muted-foreground">
                    Show when you're online to other users
                  </div>
                </div>
                <Badge variant="default">Visible</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}