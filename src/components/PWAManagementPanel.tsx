import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Wifi, 
  WifiOff, 
  Users, 
  RefreshCw, 
  Settings, 
  Bell,
  Shield,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAdvancedSync } from '@/hooks/useAdvancedSync';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export function PWAManagementPanel() {
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();
  const { isSyncing, pendingCount, lastSyncTime } = useOfflineSync();
  const { performAdvancedSync, syncProgress, hasConflicts } = useAdvancedSync();
  const { activeUsers, recentCollaborationEvents } = useRealtimeCollaboration();
  
  const [pwaSettings, setPwaSettings] = useState({
    enableNotifications: true,
    autoSync: true,
    offlineMode: true,
    collaborationAlerts: true,
    cacheSize: '50MB',
    syncInterval: 300 // 5 minutes
  });

  // PWA installation management
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('App installed successfully!');
        setIsInstallable(false);
      }
      
      setDeferredPrompt(null);
    }
  };

  const clearOfflineCache = async () => {
    try {
      // Clear query cache
      queryClient.clear();
      
      // Clear service worker cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      toast.success('Offline cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast.error('Failed to clear cache');
    }
  };

  const forceFullSync = async () => {
    try {
      // Clear local cache and force fresh data
      queryClient.clear();
      await performAdvancedSync(true);
      toast.success('Full synchronization completed');
    } catch (error) {
      console.error('Full sync failed:', error);
      toast.error('Full synchronization failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">PWA Management</h2>
        <Badge variant={isOnline ? 'default' : 'secondary'} className="text-sm">
          {isOnline ? 'Online' : 'Offline Mode'}
        </Badge>
      </div>

      <Tabs defaultValue="status" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="sync">Sync</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Connection Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {isOnline ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
                  Connection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant={isOnline ? 'default' : 'destructive'}>
                    {isOnline ? 'Connected' : 'Offline'}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {isOnline ? 'Real-time sync enabled' : 'Working in offline mode'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sync Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  Data Sync
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={pendingCount > 0 ? 'secondary' : 'default'}>
                      {pendingCount} pending
                    </Badge>
                    {isSyncing && <RefreshCw className="h-3 w-3 animate-spin" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {lastSyncTime ? `Last sync: ${formatDistanceToNow(new Date(lastSyncTime))} ago` : 'Never synced'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Collaboration */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="outline">
                    {activeUsers.length} online
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {recentCollaborationEvents.length} recent changes
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PWA Installation */}
          {isInstallable && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Install this app for the best experience</span>
                <Button size="sm" onClick={handleInstallPWA}>
                  Install App
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Offline Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Offline Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Works Offline</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Auto Sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Real-time Updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Conflict Resolution</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Manual Sync Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => performAdvancedSync(true)}
                  disabled={!isOnline || isSyncing}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
                
                <Button 
                  onClick={forceFullSync}
                  disabled={!isOnline}
                  variant="outline"
                  className="w-full"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Force Full Sync
                </Button>
                
                <Button 
                  onClick={clearOfflineCache}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear Cache
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sync Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasConflicts && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Data conflicts detected. Manual resolution may be required.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pending Changes</span>
                    <span>{pendingCount}</span>
                  </div>
                  {isSyncing && (
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{syncProgress.current}/{syncProgress.total}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="collaboration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Collaborators</CardTitle>
            </CardHeader>
            <CardContent>
              {activeUsers.length > 0 ? (
                <div className="space-y-3">
                  {activeUsers.map(user => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Working on {user.current_table || 'dashboard'}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {formatDistanceToNow(new Date(user.last_seen))} ago
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No other users currently active
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentCollaborationEvents.length > 0 ? (
                <div className="space-y-2">
                  {recentCollaborationEvents.slice(0, 5).map((event, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-muted rounded">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm">{event.type} in {event.table}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.timestamp))} ago
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PWA Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for important updates
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={pwaSettings.enableNotifications}
                  onCheckedChange={(checked) => 
                    setPwaSettings(prev => ({ ...prev, enableNotifications: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoSync">Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync when connection is restored
                  </p>
                </div>
                <Switch
                  id="autoSync"
                  checked={pwaSettings.autoSync}
                  onCheckedChange={(checked) => 
                    setPwaSettings(prev => ({ ...prev, autoSync: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="collaboration">Collaboration Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Show alerts when others make changes
                  </p>
                </div>
                <Switch
                  id="collaboration"
                  checked={pwaSettings.collaborationAlerts}
                  onCheckedChange={(checked) => 
                    setPwaSettings(prev => ({ ...prev, collaborationAlerts: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="syncInterval">Sync Interval (seconds)</Label>
                <Input
                  id="syncInterval"
                  type="number"
                  value={pwaSettings.syncInterval}
                  onChange={(e) => 
                    setPwaSettings(prev => ({ ...prev, syncInterval: parseInt(e.target.value) }))
                  }
                  min="60"
                  max="3600"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}