import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Cpu, 
  Database, 
  HardDrive, 
  Network, 
  Users, 
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  Server,
  Wifi
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSystemHealthMonitoring } from '@/hooks/useSystemHealthMonitoring';

interface SystemMetrics {
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  };
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
  security: {
    activeThreats: number;
    blockedAttempts: number;
    riskScore: number;
    lastScan: string;
  };
  users: {
    activeUsers: number;
    totalSessions: number;
    peakConcurrency: number;
    averageSessionTime: number;
  };
}

export function RealTimeSystemMonitor() {
  const { isOnline } = useOnlineStatus();
  const { metrics: healthMetrics, isChecking, performHealthCheck } = useSystemHealthMonitoring();
  const [metrics, setMetrics] = useState<SystemMetrics>({
    performance: {
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      uptime: 99.9
    },
    resources: {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkLatency: 0
    },
    security: {
      activeThreats: 0,
      blockedAttempts: 0,
      riskScore: 0,
      lastScan: new Date().toISOString()
    },
    users: {
      activeUsers: 0,
      totalSessions: 0,
      peakConcurrency: 0,
      averageSessionTime: 0
    }
  });

  // Simulate real-time metrics updates
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(prev => ({
        performance: {
          responseTime: Math.max(50, prev.performance.responseTime + (Math.random() - 0.5) * 20),
          throughput: Math.max(0, prev.performance.throughput + (Math.random() - 0.5) * 100),
          errorRate: Math.max(0, Math.min(5, prev.performance.errorRate + (Math.random() - 0.5) * 0.5)),
          uptime: Math.max(95, Math.min(100, prev.performance.uptime + (Math.random() - 0.5) * 0.1))
        },
        resources: {
          cpuUsage: Math.max(10, Math.min(90, prev.resources.cpuUsage + (Math.random() - 0.5) * 10)),
          memoryUsage: Math.max(20, Math.min(85, prev.resources.memoryUsage + (Math.random() - 0.5) * 8)),
          diskUsage: Math.max(30, Math.min(80, prev.resources.diskUsage + (Math.random() - 0.5) * 2)),
          networkLatency: Math.max(10, prev.resources.networkLatency + (Math.random() - 0.5) * 5)
        },
        security: {
          activeThreats: Math.max(0, prev.security.activeThreats + Math.floor((Math.random() - 0.8) * 2)),
          blockedAttempts: prev.security.blockedAttempts + Math.floor(Math.random() * 2),
          riskScore: Math.max(0, Math.min(100, prev.security.riskScore + (Math.random() - 0.5) * 5)),
          lastScan: prev.security.lastScan
        },
        users: {
          activeUsers: Math.max(1, prev.users.activeUsers + Math.floor((Math.random() - 0.5) * 3)),
          totalSessions: prev.users.totalSessions + Math.floor(Math.random() * 2),
          peakConcurrency: Math.max(prev.users.peakConcurrency, prev.users.activeUsers + Math.floor(Math.random() * 5)),
          averageSessionTime: Math.max(300, prev.users.averageSessionTime + (Math.random() - 0.5) * 60)
        }
      }));
    };

    // Initialize with realistic values
    setMetrics({
      performance: {
        responseTime: 120 + Math.random() * 80,
        throughput: 850 + Math.random() * 300,
        errorRate: Math.random() * 2,
        uptime: 99.8 + Math.random() * 0.2
      },
      resources: {
        cpuUsage: 35 + Math.random() * 30,
        memoryUsage: 55 + Math.random() * 20,
        diskUsage: 45 + Math.random() * 15,
        networkLatency: 25 + Math.random() * 20
      },
      security: {
        activeThreats: Math.floor(Math.random() * 3),
        blockedAttempts: Math.floor(Math.random() * 50),
        riskScore: Math.random() * 30,
        lastScan: new Date().toISOString()
      },
      users: {
        activeUsers: 12 + Math.floor(Math.random() * 20),
        totalSessions: 156 + Math.floor(Math.random() * 100),
        peakConcurrency: 45 + Math.floor(Math.random() * 20),
        averageSessionTime: 1800 + Math.random() * 1200
      }
    });

    const interval = setInterval(updateMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-500';
    if (value <= thresholds.warning) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getProgressColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'bg-green-500';
    if (value <= thresholds.warning) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    return `${value.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="space-y-6">
      {/* System Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">System Monitor</h2>
            <p className="text-muted-foreground">Real-time system health and performance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isOnline ? 'default' : 'destructive'} className="gap-1">
            {isOnline ? <Wifi className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
          <Badge variant={isChecking ? 'default' : 'secondary'} className="gap-1">
            {isChecking ? (
              <>
                <TrendingUp className="w-3 h-3 animate-pulse" />
                Monitoring
              </>
            ) : (
              <>
                <Clock className="w-3 h-3" />
                Idle
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(metrics.performance.responseTime)}ms</div>
            <p className="text-xs text-muted-foreground">Average response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Throughput
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(metrics.performance.throughput)}</div>
            <p className="text-xs text-muted-foreground">Requests per minute</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.performance.errorRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Error percentage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.performance.uptime.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">System availability</p>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Resource Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-500" />
                  <span>CPU</span>
                </div>
                <span className={getStatusColor(metrics.resources.cpuUsage, { good: 50, warning: 80 })}>
                  {Math.round(metrics.resources.cpuUsage)}%
                </span>
              </div>
              <Progress 
                value={metrics.resources.cpuUsage} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-green-500" />
                  <span>Memory</span>
                </div>
                <span className={getStatusColor(metrics.resources.memoryUsage, { good: 60, warning: 80 })}>
                  {Math.round(metrics.resources.memoryUsage)}%
                </span>
              </div>
              <Progress 
                value={metrics.resources.memoryUsage} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-500" />
                  <span>Disk</span>
                </div>
                <span className={getStatusColor(metrics.resources.diskUsage, { good: 70, warning: 85 })}>
                  {Math.round(metrics.resources.diskUsage)}%
                </span>
              </div>
              <Progress 
                value={metrics.resources.diskUsage} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-orange-500" />
                  <span>Network</span>
                </div>
                <span className={getStatusColor(metrics.resources.networkLatency, { good: 50, warning: 100 })}>
                  {Math.round(metrics.resources.networkLatency)}ms
                </span>
              </div>
              <Progress 
                value={Math.min(100, metrics.resources.networkLatency)} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security and Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-red-500">{metrics.security.activeThreats}</div>
                <p className="text-xs text-muted-foreground">Active Threats</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-500">{metrics.security.blockedAttempts}</div>
                <p className="text-xs text-muted-foreground">Blocked Attempts</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Risk Score</span>
                <span className={getStatusColor(metrics.security.riskScore, { good: 30, warning: 70 })}>
                  {Math.round(metrics.security.riskScore)}/100
                </span>
              </div>
              <Progress 
                value={metrics.security.riskScore} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-500">{metrics.users.activeUsers}</div>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-500">{metrics.users.peakConcurrency}</div>
                <p className="text-xs text-muted-foreground">Peak Concurrent</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Sessions</span>
                <span className="font-medium">{metrics.users.totalSessions}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Session Time</span>
                <span className="font-medium">{formatTime(metrics.users.averageSessionTime)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Alerts */}
      {healthMetrics?.overall === 'critical' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            System health check failed: Critical system issues detected.
          </AlertDescription>
        </Alert>
      )}

      {metrics.security.activeThreats > 0 && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            {metrics.security.activeThreats} active security threat{metrics.security.activeThreats !== 1 ? 's' : ''} detected. 
            Please review security logs immediately.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}