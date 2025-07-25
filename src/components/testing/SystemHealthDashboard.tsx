
/**
 * Phase 4: System Health Dashboard Component
 * Real-time system monitoring and health visualization
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Database, 
  Fingerprint, 
  Shield, 
  Gauge, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  Play,
  Clock
} from 'lucide-react';
import { systemIntegrationManager, SystemHealthStatus, IntegrationTestResult } from '@/services/systemIntegrationManager';
import { toast } from 'sonner';

export function SystemHealthDashboard() {
  const [healthStatus, setHealthStatus] = useState<SystemHealthStatus | null>(null);
  const [testResults, setTestResults] = useState<IntegrationTestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      await systemIntegrationManager.initialize();
      updateHealthStatus();
      updateTestResults();
    } catch (error) {
      toast.error('Failed to initialize system health dashboard');
      console.error('Dashboard initialization error:', error);
    }
  };

  const updateHealthStatus = () => {
    const status = systemIntegrationManager.getHealthStatus();
    setHealthStatus(status);
  };

  const updateTestResults = () => {
    const results = systemIntegrationManager.getTestResults();
    setTestResults(results);
  };

  const handleRefreshHealth = async () => {
    setIsRefreshing(true);
    try {
      await systemIntegrationManager.performHealthCheck();
      updateHealthStatus();
      toast.success('Health status refreshed');
    } catch (error) {
      toast.error('Failed to refresh health status');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      await systemIntegrationManager.runIntegrationTests();
      updateTestResults();
      toast.success('Integration tests completed');
    } catch (error) {
      toast.error('Integration tests failed');
    } finally {
      setIsRunningTests(false);
    }
  };

  const getHealthStatusColor = (status: SystemHealthStatus['overall']) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'ready':
      case 'active':
      case 'optimal':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
      case 'device-missing':
      case 'expired':
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
      case 'disconnected':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  if (!healthStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Initializing system health dashboard...</p>
        </div>
      </div>
    );
  }

  const passedTests = testResults.filter(t => t.passed).length;
  const testPassRate = testResults.length > 0 ? (passedTests / testResults.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overall Health Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-6 w-6" />
              <span>System Health Overview</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge className={getHealthStatusColor(healthStatus.overall)}>
                {healthStatus.overall.toUpperCase()}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshHealth}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg border">
              <Database className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Database</p>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(healthStatus.database)}
                  <span className="text-xs capitalize">{healthStatus.database}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border">
              <Fingerprint className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Biometric</p>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(healthStatus.biometric)}
                  <span className="text-xs capitalize">{healthStatus.biometric.replace('-', ' ')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border">
              <Shield className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium">Authentication</p>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(healthStatus.authentication)}
                  <span className="text-xs capitalize">{healthStatus.authentication}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border">
              <Gauge className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Performance</p>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(healthStatus.performance)}
                  <span className="text-xs capitalize">{healthStatus.performance}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            Last checked: {healthStatus.lastCheck.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tests">Integration Tests</TabsTrigger>
          <TabsTrigger value="details">System Details</TabsTrigger>
          <TabsTrigger value="monitoring">Real-time Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Integration Test Results</CardTitle>
                <Button
                  onClick={handleRunTests}
                  disabled={isRunningTests}
                  size="sm"
                >
                  <Play className={`h-4 w-4 mr-2 ${isRunningTests ? 'animate-spin' : ''}`} />
                  {isRunningTests ? 'Running Tests...' : 'Run Tests'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {testResults.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Test Pass Rate</p>
                      <p className="text-2xl font-bold">{Math.round(testPassRate)}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {passedTests} of {testResults.length} tests passed
                      </p>
                      <Progress value={testPassRate} className="w-32 mt-2" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {testResults.map((test, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          test.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {test.passed ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{test.testName}</p>
                            {test.error && (
                              <p className="text-xs text-red-600">{test.error}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{test.duration}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {testResults.length === 0 && (
                <div className="text-center py-8">
                  <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No tests run yet. Click "Run Tests" to begin.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(healthStatus.details).map(([key, value]) => (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <CardTitle className="capitalize text-base">{key} Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Alert>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              Real-time monitoring is active. System health checks run automatically every 5 minutes.
              Critical issues will trigger immediate alerts.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>System Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Database Response Time</p>
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={healthStatus.details.database?.responseTime ? 
                        Math.min(100, (1000 - healthStatus.details.database.responseTime) / 10) : 0
                      } 
                      className="flex-1" 
                    />
                    <span className="text-sm text-muted-foreground">
                      {healthStatus.details.database?.responseTime || 'N/A'}ms
                    </span>
                  </div>
                </div>

                {healthStatus.details.performance?.memory && (
                  <div>
                    <p className="text-sm font-medium mb-2">Memory Usage</p>
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={
                          (healthStatus.details.performance.memory.used / 
                           healthStatus.details.performance.memory.total) * 100
                        } 
                        className="flex-1" 
                      />
                      <span className="text-sm text-muted-foreground">
                        {Math.round(healthStatus.details.performance.memory.used / 1024 / 1024)}MB
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
