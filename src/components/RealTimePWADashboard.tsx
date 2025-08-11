import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Users, 
  Database, 
  Zap, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Gauge
} from 'lucide-react';
import { useRealTimePWA } from '@/hooks/useRealTimePWA';
import { formatDistanceToNow } from 'date-fns';

export function RealTimePWADashboard() {
  const {
    isConnected,
    lastSync,
    syncInProgress,
    activeUsers,
    dataVersion,
    performanceStats,
    forceSync,
    optimizePerformance,
    isOnline,
    queueStats
  } = useRealTimePWA();

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getConnectionStatus = () => {
    if (!isOnline) return { status: 'Offline', color: 'destructive', icon: WifiOff };
    if (!isConnected) return { status: 'Connecting', color: 'secondary', icon: RefreshCw };
    return { status: 'Connected', color: 'default', icon: Wifi };
  };

  const connectionStatus = getConnectionStatus();
  const StatusIcon = connectionStatus.icon;

  const getPerformanceLevel = () => {
    const { avgResponseTime, cacheHitRate } = performanceStats;
    if (avgResponseTime < 100 && cacheHitRate > 90) return 'Excellent';
    if (avgResponseTime < 300 && cacheHitRate > 80) return 'Good';
    if (avgResponseTime < 500 && cacheHitRate > 70) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Real-Time PWA Dashboard</h2>
          <p className="text-muted-foreground">Monitor live data synchronization and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon className="h-4 w-4" />
          <Badge variant={connectionStatus.color as any}>
            {connectionStatus.status}
          </Badge>
        </div>
      </div>

      {/* Real-time stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Currently online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Version</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">v{dataVersion}</div>
            <p className="text-xs text-muted-foreground">
              {lastSync ? formatDistanceToNow(lastSync, { addSuffix: true }) : 'Never synced'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getPerformanceLevel()}</div>
            <p className="text-xs text-muted-foreground">
              {performanceStats.avgResponseTime}ms avg response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Pending actions
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="realtime" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="sync">Sync Status</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Connection Status
                </CardTitle>
                <CardDescription>
                  Real-time synchronization status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Connection:</span>
                  <Badge variant={connectionStatus.color as any}>
                    {connectionStatus.status}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Status:</span>
                  <div className="flex items-center gap-2">
                    {syncInProgress ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-blue-600">Syncing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Up to date</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Update:</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(lastUpdate, { addSuffix: true })}
                  </span>
                </div>
                
                <Button 
                  onClick={forceSync} 
                  disabled={syncInProgress}
                  className="w-full"
                >
                  {syncInProgress ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Force Sync
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Active Users
                </CardTitle>
                <CardDescription>
                  Users currently online
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-center mb-4">
                  {activeUsers}
                </div>
                <div className="text-center text-muted-foreground">
                  Users active in the last 5 minutes
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Response Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {performanceStats.avgResponseTime}ms
                </div>
                <Progress value={Math.max(0, 100 - performanceStats.avgResponseTime / 10)} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Average response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Cache Hit Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {performanceStats.cacheHitRate}%
                </div>
                <Progress value={performanceStats.cacheHitRate} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Requests served from cache
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getPerformanceLevel()}
                </div>
                <Button 
                  onClick={optimizePerformance}
                  variant="outline"
                  className="w-full mt-4"
                >
                  Optimize Performance
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Synchronization History
              </CardTitle>
              <CardDescription>
                Recent sync activities and status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Data Synchronized</p>
                      <p className="text-sm text-muted-foreground">
                        {lastSync ? formatDistanceToNow(lastSync, { addSuffix: true }) : 'Never'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default">Success</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Real-time Connection</p>
                      <p className="text-sm text-muted-foreground">
                        Active and monitoring changes
                      </p>
                    </div>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                
                {queueStats.total > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium">Pending Actions</p>
                        <p className="text-sm text-muted-foreground">
                          {queueStats.total} actions waiting to sync
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{queueStats.total}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Offline Queue Status
              </CardTitle>
              <CardDescription>
                Actions queued for synchronization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{queueStats.total}</div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{queueStats.byType?.biometric || 0}</div>
                  <p className="text-xs text-muted-foreground">Biometric</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{queueStats.byType?.student || 0}</div>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{queueStats.failed}</div>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
              
              {queueStats.lastSync && (
                <div className="text-center text-sm text-muted-foreground">
                  Last sync: {formatDistanceToNow(queueStats.lastSync, { addSuffix: true })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}