import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone, 
  Download, 
  Bell, 
  Wifi, 
  WifiOff, 
  Settings, 
  RefreshCw,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useAdvancedPWA } from '@/hooks/useAdvancedPWA';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export function PWAControlCenter() {
  const {
    pwaFeatures,
    updateInfo,
    installPWA,
    requestNotificationPermission,
    sendNotification,
    updateServiceWorker,
    clearAppCache,
    canInstall
  } = useAdvancedPWA();

  const { logSecurityEvent } = useSecurityMonitoring();

  const [notificationSettings, setNotificationSettings] = useState({
    syncAlerts: true,
    collaborationUpdates: true,
    securityAlerts: true,
    offlineReminders: false
  });

  // Test notifications
  const testNotification = () => {
    sendNotification('PWA Test Notification', {
      body: 'This is a test notification from your PWA',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'test-notification'
    });
    
    logSecurityEvent(
      'data_access',
      'low',
      'User tested PWA notifications',
      { feature: 'notifications', action: 'test' }
    );
  };

  // Handle PWA installation
  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      logSecurityEvent(
        'data_access',
        'low',
        'PWA installed by user',
        { feature: 'pwa_install' }
      );
    }
  };

  // Handle cache clear
  const handleCacheClear = async () => {
    try {
      await clearAppCache();
      logSecurityEvent(
        'data_access',
        'medium',
        'User cleared PWA cache',
        { feature: 'cache_management' }
      );
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Smartphone className="h-6 w-6" />
          PWA Control Center
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant={pwaFeatures.isOnline ? 'default' : 'secondary'}>
            {pwaFeatures.isOnline ? 'Online' : 'Offline'}
          </Badge>
          {pwaFeatures.isInstalled && (
            <Badge variant="outline" className="text-green-600">
              Installed
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="status" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="install">Installation</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* PWA Features Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">PWA Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Installed</span>
                  {pwaFeatures.isInstalled ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Offline Storage</span>
                  {pwaFeatures.supportsOfflineStorage ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Background Sync</span>
                  {pwaFeatures.supportsBackgroundSync ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Push Notifications</span>
                  {pwaFeatures.supportsPushNotifications ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Connection Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {pwaFeatures.isOnline ? (
                    <Wifi className="h-4 w-4 text-green-600" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-600" />
                  )}
                  Connection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant={pwaFeatures.isOnline ? 'default' : 'destructive'}>
                    {pwaFeatures.isOnline ? 'Connected' : 'Offline'}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {pwaFeatures.isOnline 
                      ? 'Full functionality available'
                      : 'Limited to cached content'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cache Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Cache Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cached Items</span>
                    <Badge variant="outline">{pwaFeatures.cacheSize}</Badge>
                  </div>
                  {pwaFeatures.lastCacheUpdate && (
                    <p className="text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(pwaFeatures.lastCacheUpdate))} ago
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Updates Available */}
          {updateInfo.updateAvailable && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>A new version of the app is available</span>
                <Button 
                  size="sm" 
                  onClick={updateServiceWorker}
                  disabled={updateInfo.isUpdating}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${updateInfo.isUpdating ? 'animate-spin' : ''}`} />
                  {updateInfo.isUpdating ? 'Updating...' : 'Update'}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="install" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>App Installation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canInstall ? (
                <div className="space-y-4">
                  <Alert>
                    <Download className="h-4 w-4" />
                    <AlertDescription>
                      Install this app on your device for the best experience. You'll get faster loading, offline access, and native app features.
                    </AlertDescription>
                  </Alert>
                  
                  <Button onClick={handleInstall} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Install App
                  </Button>
                </div>
              ) : pwaFeatures.isInstalled ? (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">App Installed</h3>
                    <p className="text-sm text-muted-foreground">
                      You can now use this app offline and access it from your home screen
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center">
                    <Info className="h-12 w-12 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Installation Not Available</h3>
                    <p className="text-sm text-muted-foreground">
                      PWA installation is not currently available for your browser or device
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!pwaFeatures.hasNotificationPermission ? (
                <div className="space-y-4">
                  <Alert>
                    <Bell className="h-4 w-4" />
                    <AlertDescription>
                      Enable notifications to receive important updates about sync status, collaboration, and security alerts.
                    </AlertDescription>
                  </Alert>
                  
                  <Button onClick={requestNotificationPermission} className="w-full">
                    <Bell className="h-4 w-4 mr-2" />
                    Enable Notifications
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="syncAlerts">Sync Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when data sync completes or fails
                      </p>
                    </div>
                    <Switch
                      id="syncAlerts"
                      checked={notificationSettings.syncAlerts}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, syncAlerts: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="collaboration">Collaboration Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when others make changes to shared data
                      </p>
                    </div>
                    <Switch
                      id="collaboration"
                      checked={notificationSettings.collaborationUpdates}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, collaborationUpdates: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="security">Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify about security events and suspicious activity
                      </p>
                    </div>
                    <Switch
                      id="security"
                      checked={notificationSettings.securityAlerts}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, securityAlerts: checked }))
                      }
                    />
                  </div>

                  <Button onClick={testNotification} variant="outline" className="w-full">
                    <Bell className="h-4 w-4 mr-2" />
                    Test Notification
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cache Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cache Size</Label>
                  <div className="text-2xl font-bold">{pwaFeatures.cacheSize}</div>
                  <p className="text-sm text-muted-foreground">Cached items</p>
                </div>
                
                {pwaFeatures.lastCacheUpdate && (
                  <div className="space-y-2">
                    <Label>Last Update</Label>
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(pwaFeatures.lastCacheUpdate))} ago
                    </div>
                    <p className="text-sm text-muted-foreground">Cache refreshed</p>
                  </div>
                )}
              </div>

              <Alert>
                <RefreshCw className="h-4 w-4" />
                <AlertDescription>
                  Clearing cache will remove all offline data and require a fresh download when online. Use this if you're experiencing issues.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={handleCacheClear}
                variant="outline" 
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear All Cache
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}