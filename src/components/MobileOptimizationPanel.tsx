import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useUltraPerformanceOptimizer } from '@/hooks/useUltraPerformanceOptimizer';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Wifi, 
  WifiOff, 
  Battery, 
  Signal,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Settings,
  Zap
} from 'lucide-react';

export function MobileOptimizationPanel() {
  const { isOnline } = useOnlineStatus();
  const { pendingCount, isSyncing, syncToSupabase } = useOfflineSync();
  const { metrics, optimizeNow, isOptimizing } = useUltraPerformanceOptimizer();
  
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [networkInfo, setNetworkInfo] = useState<any>({});
  const [batteryInfo, setBatteryInfo] = useState<any>({});
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Detect device capabilities and performance
  useEffect(() => {
    const detectDevice = () => {
      const info = {
        type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
        screen: {
          width: screen.width,
          height: screen.height,
          pixelRatio: window.devicePixelRatio || 1
        },
        memory: (navigator as any).deviceMemory || 'unknown',
        cores: navigator.hardwareConcurrency || 'unknown',
        userAgent: navigator.userAgent,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      };
      setDeviceInfo(info);
    };

    const detectNetwork = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        setNetworkInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });
      }
    };

    const detectBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setBatteryInfo({
            level: Math.round(battery.level * 100),
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime
          });
        } catch (error) {
          console.log('Battery API not available');
        }
      }
    };

    detectDevice();
    detectNetwork();
    detectBattery();

    // Listen for network changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', detectNetwork);
      return () => connection.removeEventListener('change', detectNetwork);
    }
  }, []);

  // PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    }
  };

  const getDeviceIcon = () => {
    switch (deviceInfo.type) {
      case 'mobile': return <Smartphone className="w-5 h-5 text-blue-500" />;
      case 'tablet': return <Tablet className="w-5 h-5 text-green-500" />;
      default: return <Monitor className="w-5 h-5 text-purple-500" />;
    }
  };

  const getNetworkIcon = () => {
    if (!isOnline) return <WifiOff className="w-5 h-5 text-red-500" />;
    
    const signal = networkInfo.effectiveType;
    switch (signal) {
      case '4g': return <Signal className="w-5 h-5 text-green-500" />;
      case '3g': return <Signal className="w-5 h-5 text-yellow-500" />;
      case '2g': return <Signal className="w-5 h-5 text-red-500" />;
      default: return <Wifi className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBatteryColor = () => {
    if (batteryInfo.level > 50) return 'text-green-600';
    if (batteryInfo.level > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceGrade = () => {
    let score = 100;
    if (metrics.renderTime > 16) score -= 20;
    if (metrics.memoryUsage > 70) score -= 25;
    if (metrics.networkLatency > 500) score -= 30;
    
    if (score >= 90) return { grade: 'A+', color: 'text-green-600' };
    if (score >= 80) return { grade: 'A', color: 'text-green-600' };
    if (score >= 70) return { grade: 'B', color: 'text-blue-600' };
    if (score >= 60) return { grade: 'C', color: 'text-yellow-600' };
    return { grade: 'D', color: 'text-red-600' };
  };

  const performance = getPerformanceGrade();

  return (
    <div className="space-y-4">
      {/* Device Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {getDeviceIcon()}
            Device Optimization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Device Type and Performance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Device Type</p>
              <Badge variant="outline" className="w-fit">
                {deviceInfo.type?.charAt(0).toUpperCase() + deviceInfo.type?.slice(1)}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Performance Grade</p>
              <Badge 
                variant="outline" 
                className={`w-fit ${performance.color} border-current`}
              >
                {performance.grade}
              </Badge>
            </div>
          </div>

          {/* System Specs */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Memory</p>
              <p className="font-medium">{deviceInfo.memory}GB</p>
            </div>
            <div>
              <p className="text-muted-foreground">CPU Cores</p>
              <p className="font-medium">{deviceInfo.cores}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pixel Ratio</p>
              <p className="font-medium">{deviceInfo.screen?.pixelRatio}x</p>
            </div>
            <div>
              <p className="text-muted-foreground">Resolution</p>
              <p className="font-medium">
                {deviceInfo.screen?.width}×{deviceInfo.screen?.height}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network & Battery Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Network Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {getNetworkIcon()}
                <span className="font-medium">Network</span>
              </div>
              <Badge 
                variant={isOnline ? "default" : "destructive"}
                className={isOnline ? "bg-green-100 text-green-800" : ""}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
            
            {networkInfo.effectiveType && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connection</span>
                  <span className="font-medium uppercase">{networkInfo.effectiveType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Speed</span>
                  <span className="font-medium">{networkInfo.downlink} Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Latency</span>
                  <span className="font-medium">{networkInfo.rtt}ms</span>
                </div>
              </div>
            )}

            {pendingCount > 0 && (
              <Alert className="mt-3">
                <RefreshCw className="h-4 w-4" />
                <AlertDescription>
                  {pendingCount} items pending sync
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Battery Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Battery className={`w-5 h-5 ${getBatteryColor()}`} />
                <span className="font-medium">Battery</span>
              </div>
              {batteryInfo.level && (
                <Badge variant="outline" className={getBatteryColor()}>
                  {batteryInfo.level}%
                </Badge>
              )}
            </div>
            
            {batteryInfo.level && (
              <div className="space-y-3">
                <Progress value={batteryInfo.level} className="h-2" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">
                      {batteryInfo.charging ? 'Charging' : 'Battery'}
                    </span>
                  </div>
                  {batteryInfo.charging && batteryInfo.chargingTime !== Infinity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Full Charge</span>
                      <span className="font-medium">
                        {Math.round(batteryInfo.chargingTime / 60)}min
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-yellow-500" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Render Time</p>
              <p className="font-medium">{metrics.renderTime.toFixed(1)}ms</p>
            </div>
            <div>
              <p className="text-muted-foreground">Memory Usage</p>
              <p className="font-medium">{metrics.memoryUsage.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cache Hit Rate</p>
              <p className="font-medium">{metrics.cacheHitRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Network Latency</p>
              <p className="font-medium">{metrics.networkLatency.toFixed(0)}ms</p>
            </div>
          </div>

          <Button
            onClick={optimizeNow}
            disabled={isOptimizing}
            className="w-full"
            variant="outline"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Optimize Performance
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* PWA Features */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5 text-blue-500" />
            PWA Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Offline Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Auto Sync</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Push Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Background Sync</span>
            </div>
          </div>

          {installPrompt && (
            <Button
              onClick={handleInstallPWA}
              className="w-full"
              variant="default"
            >
              <Download className="w-4 h-4 mr-2" />
              Install App
            </Button>
          )}

          {isSyncing && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Syncing data in background...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}