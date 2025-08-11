import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Smartphone, 
  Download, 
  Bell, 
  Database, 
  Wifi, 
  WifiOff, 
  Trash2,
  RefreshCw,
  Shield,
  Zap,
  Activity
} from 'lucide-react';
import { useAdvancedPWA } from '@/hooks/useAdvancedPWA';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { toast } from 'sonner';

export function PWAFeatureCenter() {
  const {
    pwaFeatures,
    updateInfo,
    installPWA,
    requestNotificationPermission,
    sendNotification,
    updateServiceWorker,
    clearAppCache,
    checkPWAStatus,
    canInstall
  } = useAdvancedPWA();
  
  const isOnline = useOnlineStatus();
  const [settings, setSettings] = useState({
    autoSync: true,
    backgroundSync: true,
    pushNotifications: true,
    offlineMode: true,
    dataSaver: false
  });

  useEffect(() => {
    checkPWAStatus();
  }, [checkPWAStatus]);

  const handleInstallApp = async () => {
    try {
      await installPWA();
      toast.success('App installation prompted');
    } catch (error) {
      toast.error('Installation failed');
    }
  };

  const handleEnableNotifications = async () => {
    try {
      await requestNotificationPermission();
      toast.success('Notification permission updated');
    } catch (error) {
      toast.error('Failed to enable notifications');
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendNotification('Test Notification', {
        body: 'PWA notifications are working!',
        icon: '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png'
      });
      toast.success('Test notification sent');
    } catch (error) {
      toast.error('Failed to send notification');
    }
  };

  const handleUpdateApp = async () => {
    try {
      await updateServiceWorker();
      toast.success('App update initiated');
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const handleClearCache = async () => {
    try {
      await clearAppCache();
      toast.success('Cache cleared successfully');
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  const ConnectionIndicator = () => (
    <div className="flex items-center gap-2">
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-500">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-500">Offline</span>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">PWA Control Center</h2>
          <p className="text-muted-foreground">Manage your app experience</p>
        </div>
        <ConnectionIndicator />
      </div>

      <Tabs defaultValue="status" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="install">Install</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Installation Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Installation</CardTitle>
                <Smartphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pwaFeatures.isInstalled ? 'Installed' : 'Web App'}
                </div>
                <Badge variant={pwaFeatures.isInstalled ? 'default' : 'secondary'}>
                  {pwaFeatures.isInstalled ? 'PWA Mode' : 'Browser Mode'}
                </Badge>
              </CardContent>
            </Card>

            {/* Notification Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Notifications</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pwaFeatures.hasNotificationPermission ? 'Enabled' : 'Disabled'}
                </div>
                <Badge variant={pwaFeatures.hasNotificationPermission ? 'default' : 'destructive'}>
                  {pwaFeatures.hasNotificationPermission ? 'Granted' : 'Denied'}
                </Badge>
              </CardContent>
            </Card>

            {/* Cache Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pwaFeatures.cacheSize ? `${(pwaFeatures.cacheSize / 1024 / 1024).toFixed(1)}MB` : 'Unknown'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last updated: {pwaFeatures.lastCacheUpdate || 'Never'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Service Worker Update */}
          {updateInfo.hasUpdate && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Update Available
                </CardTitle>
                <CardDescription>
                  A new version of the app is available. Update now for the latest features.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleUpdateApp} className="w-full">
                  Update Now
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="install" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Install BiometricHub
              </CardTitle>
              <CardDescription>
                Install the app on your device for the best experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pwaFeatures.isInstalled ? (
                <div className="text-center space-y-2">
                  <Badge variant="default" className="text-lg px-4 py-2">
                    ✓ App Installed
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    You're using the installed PWA version
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Benefits of installing:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Faster app loading</li>
                      <li>• Works offline</li>
                      <li>• Native app experience</li>
                      <li>• Push notifications</li>
                      <li>• Home screen access</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={handleInstallApp} 
                    disabled={!canInstall}
                    className="w-full"
                  >
                    {canInstall ? 'Install App' : 'Installation Not Available'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Notification Permission</span>
                  <Badge variant={pwaFeatures.hasNotificationPermission ? 'default' : 'destructive'}>
                    {pwaFeatures.hasNotificationPermission ? 'Granted' : 'Denied'}
                  </Badge>
                </div>
                
                {!pwaFeatures.hasNotificationPermission && (
                  <Button onClick={handleEnableNotifications} className="w-full">
                    Enable Notifications
                  </Button>
                )}
                
                {pwaFeatures.hasNotificationPermission && (
                  <Button onClick={handleTestNotification} variant="outline" className="w-full">
                    Test Notification
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Storage Management
              </CardTitle>
              <CardDescription>
                Manage app cache and offline data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Cache Size:</span>
                  <span>{pwaFeatures.cacheSize ? `${(pwaFeatures.cacheSize / 1024 / 1024).toFixed(1)}MB` : 'Unknown'}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Last Updated:</span>
                  <span>{pwaFeatures.lastCacheUpdate || 'Never'}</span>
                </div>
                
                <Progress value={75} className="w-full" />
                <p className="text-xs text-muted-foreground">Storage usage estimate</p>
                
                <Button 
                  onClick={handleClearCache} 
                  variant="destructive" 
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Cache
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                PWA Settings
              </CardTitle>
              <CardDescription>
                Configure app behavior and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Auto Sync</label>
                    <p className="text-xs text-muted-foreground">Automatically sync when online</p>
                  </div>
                  <Switch 
                    checked={settings.autoSync}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoSync: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Background Sync</label>
                    <p className="text-xs text-muted-foreground">Sync data in the background</p>
                  </div>
                  <Switch 
                    checked={settings.backgroundSync}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, backgroundSync: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Push Notifications</label>
                    <p className="text-xs text-muted-foreground">Receive push notifications</p>
                  </div>
                  <Switch 
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pushNotifications: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Offline Mode</label>
                    <p className="text-xs text-muted-foreground">Enable offline capabilities</p>
                  </div>
                  <Switch 
                    checked={settings.offlineMode}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, offlineMode: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Data Saver</label>
                    <p className="text-xs text-muted-foreground">Reduce data usage</p>
                  </div>
                  <Switch 
                    checked={settings.dataSaver}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, dataSaver: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}