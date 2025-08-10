import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdvancedOfflineOptimization } from '@/hooks/useAdvancedOfflineOptimization';
import { useAdvancedPWAFeatures } from '@/hooks/useAdvancedPWAFeatures';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { 
  Smartphone, 
  Zap, 
  Database, 
  Wifi, 
  Bell, 
  Share2, 
  Camera,
  Vibrate,
  RotateCw,
  Gauge,
  Settings,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

export function AdvancedOfflineExperience() {
  const { 
    metrics, 
    cacheStrategy, 
    setCacheStrategy, 
    optimizeCache, 
    performIntelligentCleanup 
  } = useAdvancedOfflineOptimization();
  
  const {
    capabilities,
    mobileFeatures,
    requestNotificationPermission,
    shareContent,
    provideFeedback,
    requestCameraAccess,
    lockOrientation
  } = useAdvancedPWAFeatures();
  
  const networkStatus = useNetworkStatus();
  const [autoOptimization, setAutoOptimization] = useState(true);

  const handleShareApp = async () => {
    await shareContent({
      title: 'Student TrackMaster',
      text: 'Check out this amazing offline-capable student management system!',
      url: window.location.origin
    });
    provideFeedback('success');
  };

  const handleVibrationTest = () => {
    provideFeedback('tap');
    toast.success('Vibration test completed!');
  };

  const handleCameraTest = async () => {
    const stream = await requestCameraAccess();
    if (stream) {
      // Stop the stream immediately after test
      stream.getTracks().forEach(track => track.stop());
      provideFeedback('success');
    }
  };

  const handleOrientationLock = async () => {
    await lockOrientation(capabilities.orientation === 'portrait' ? 'landscape' : 'portrait');
    provideFeedback('warning');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Advanced Offline Experience</h2>
        <p className="text-muted-foreground">
          Complete offline/online management with performance optimization and mobile enhancements
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="mobile">Mobile</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Connection Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Wifi className="h-4 w-4" />
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge 
                    variant={networkStatus.isOnline ? "default" : "destructive"}
                    className="w-full justify-center"
                  >
                    {networkStatus.isOnline ? '🌐 Online' : '📱 Offline'}
                  </Badge>
                  
                  {networkStatus.isOnline && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="capitalize">{networkStatus.effectiveType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Speed:</span>
                        <span>{networkStatus.downlink} Mbps</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Latency:</span>
                        <span>{networkStatus.rtt}ms</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* PWA Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Smartphone className="h-4 w-4" />
                  PWA Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Installable:</span>
                    <Badge variant={capabilities.isInstallable ? "default" : "secondary"}>
                      {capabilities.isInstallable ? '✅' : '❌'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Installed:</span>
                    <Badge variant={capabilities.isInstalled ? "default" : "secondary"}>
                      {capabilities.isInstalled ? '✅' : '❌'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Platform:</span>
                    <Badge variant="outline" className="capitalize">
                      {capabilities.platform}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cache Performance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4" />
                  Cache Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Hit Rate:</span>
                      <span>{metrics.cacheHitRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.cacheHitRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Storage Used:</span>
                      <span>{metrics.storageUsage.percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.storageUsage.percentage} className="h-2" />
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Avg Query: {metrics.avgQueryTime.toFixed(1)}ms
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Performance Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Cache Strategy</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="compression">Data Compression</Label>
                      <Switch
                        id="compression"
                        checked={cacheStrategy.compressionEnabled}
                        onCheckedChange={(checked) =>
                          setCacheStrategy(prev => ({ ...prev, compressionEnabled: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prefetch">Smart Prefetching</Label>
                      <Switch
                        id="prefetch"
                        checked={cacheStrategy.prefetchEnabled}
                        onCheckedChange={(checked) =>
                          setCacheStrategy(prev => ({ ...prev, prefetchEnabled: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-optimize">Auto Optimization</Label>
                      <Switch
                        id="auto-optimize"
                        checked={autoOptimization}
                        onCheckedChange={setAutoOptimization}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Performance Actions</h4>
                  
                  <div className="space-y-2">
                    <Button 
                      onClick={optimizeCache}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Optimize Cache
                    </Button>
                    
                    <Button 
                      onClick={performIntelligentCleanup}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Clean Storage
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold mb-4">Performance Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center space-y-1">
                    <div className="text-2xl font-bold text-emerald-green">
                      {metrics.cacheHitRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Cache Hit Rate</div>
                  </div>
                  
                  <div className="text-center space-y-1">
                    <div className="text-2xl font-bold text-electric-blue">
                      {metrics.avgQueryTime.toFixed(1)}ms
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Query Time</div>
                  </div>
                  
                  <div className="text-center space-y-1">
                    <div className="text-2xl font-bold text-sunset-orange">
                      {(metrics.storageUsage.used / 1024 / 1024).toFixed(1)}MB
                    </div>
                    <div className="text-xs text-muted-foreground">Storage Used</div>
                  </div>
                  
                  <div className="text-center space-y-1">
                    <div className="text-2xl font-bold text-vibrant-purple">
                      {metrics.syncPerformance.successRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Sync Success</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mobile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Mobile & PWA Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Device Capabilities</h4>
                  
                  <div className="space-y-2">
                    {Object.entries(mobileFeatures).map(([feature, supported]) => (
                      <div key={feature} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{feature.replace(/([A-Z])/g, ' $1')}</span>
                        <Badge variant={supported ? "default" : "secondary"}>
                          {supported ? '✅' : '❌'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Mobile Actions</h4>
                  
                  <div className="space-y-2">
                    <Button 
                      onClick={requestNotificationPermission}
                      variant="outline"
                      className="w-full justify-start"
                      disabled={capabilities.hasNotificationPermission}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      {capabilities.hasNotificationPermission ? 'Notifications Enabled' : 'Enable Notifications'}
                    </Button>
                    
                    <Button 
                      onClick={handleShareApp}
                      variant="outline"
                      className="w-full justify-start"
                      disabled={!capabilities.supportsSharing}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share App
                    </Button>
                    
                    <Button 
                      onClick={handleCameraTest}
                      variant="outline"
                      className="w-full justify-start"
                      disabled={!capabilities.hasCamera}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Test Camera
                    </Button>
                    
                    <Button 
                      onClick={handleVibrationTest}
                      variant="outline"
                      className="w-full justify-start"
                      disabled={!mobileFeatures.vibration}
                    >
                      <Vibrate className="h-4 w-4 mr-2" />
                      Test Vibration
                    </Button>
                    
                    <Button 
                      onClick={handleOrientationLock}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      Lock Orientation
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Offline Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Cache Strategy</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure how data is cached and optimized for offline use
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="cache-size">Max Cache Size</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          id="cache-size"
                          type="range"
                          min="10"
                          max="200"
                          value={cacheStrategy.maxSize / (1024 * 1024)}
                          onChange={(e) =>
                            setCacheStrategy(prev => ({
                              ...prev,
                              maxSize: parseInt(e.target.value) * 1024 * 1024
                            }))
                          }
                          className="flex-1"
                        />
                        <span className="text-sm w-16 text-right">
                          {(cacheStrategy.maxSize / (1024 * 1024)).toFixed(0)}MB
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="cache-age">Max Cache Age</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          id="cache-age"
                          type="range"
                          min="5"
                          max="120"
                          value={cacheStrategy.maxAge / (60 * 1000)}
                          onChange={(e) =>
                            setCacheStrategy(prev => ({
                              ...prev,
                              maxAge: parseInt(e.target.value) * 60 * 1000
                            }))
                          }
                          className="flex-1"
                        />
                        <span className="text-sm w-16 text-right">
                          {(cacheStrategy.maxAge / (60 * 1000)).toFixed(0)}min
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Feature Testing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                The comprehensive testing panel has been moved to a dedicated component.
                Access it through the main dashboard or navigation menu.
              </p>
              <Button variant="outline">
                Open Testing Panel
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}