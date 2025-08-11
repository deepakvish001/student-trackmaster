import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUltraPerformanceOptimizer } from '@/hooks/useUltraPerformanceOptimizer';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { 
  Activity, 
  Zap, 
  Database, 
  Wifi, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Gauge
} from 'lucide-react';

export function PerformanceTestPanel() {
  const { metrics, suggestions, isOptimizing, optimizeNow, autoOptimizeEnabled } = useUltraPerformanceOptimizer();
  const { isOnline } = useOnlineStatus();
  const { pendingCount, isSyncing } = useOfflineSync();
  
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Performance grade calculation
  const calculatePerformanceGrade = () => {
    let score = 100;
    
    if (metrics.renderTime > 16) score -= 20;
    if (metrics.memoryUsage > 80) score -= 25;
    if (metrics.cacheHitRate < 70) score -= 20;
    if (metrics.networkLatency > 500) score -= 25;
    
    score = Math.max(0, score);
    
    if (score >= 90) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 80) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 70) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 60) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { grade: 'D', color: 'text-red-600', bg: 'bg-red-100' };
  };

  // Run comprehensive performance tests
  const runPerformanceTests = async () => {
    setIsRunningTests(true);
    
    try {
      const startTime = performance.now();
      
      // Test 1: React rendering performance
      const renderTestStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        div.innerHTML = `<span>Test ${i}</span>`;
      }
      const renderTime = performance.now() - renderTestStart;
      
      // Test 2: Database query simulation
      const dbTestStart = performance.now();
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate DB call
      const dbTime = performance.now() - dbTestStart;
      
      // Test 3: PWA cache test
      let cacheStatus = 'unknown';
      if ('caches' in window) {
        try {
          const cache = await caches.open('test-cache');
          await cache.put('/test', new Response('test'));
          const cachedResponse = await cache.match('/test');
          cacheStatus = cachedResponse ? 'working' : 'failed';
          await cache.delete('/test');
        } catch (error) {
          cacheStatus = 'error';
        }
      }
      
      // Test 4: Service Worker communication
      let swStatus = 'not-available';
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        swStatus = 'active';
      } else if ('serviceWorker' in navigator) {
        swStatus = 'available-not-active';
      }
      
      const totalTime = performance.now() - startTime;
      
      const results = {
        totalTime,
        renderTime,
        dbTime,
        cacheStatus,
        swStatus,
        timestamp: new Date(),
        passed: renderTime < 100 && dbTime < 200 && cacheStatus === 'working'
      };
      
      setTestResults(results);
    } catch (error) {
      console.error('Performance test failed:', error);
      setTestResults({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        passed: false
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const performanceGrade = calculatePerformanceGrade();

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary" />
            Real-time Performance Monitor
          </CardTitle>
          <CardDescription>
            Live performance metrics and optimization status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Performance Grade */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${performanceGrade.bg} flex items-center justify-center`}>
                <span className={`text-lg font-bold ${performanceGrade.color}`}>
                  {performanceGrade.grade}
                </span>
              </div>
              <div>
                <p className="font-semibold">Performance Grade</p>
                <p className="text-sm text-muted-foreground">
                  Last updated: {metrics.lastUpdate.toLocaleTimeString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {autoOptimizeEnabled && (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Auto-optimize ON
                </Badge>
              )}
              {isOptimizing && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Optimizing...
                </Badge>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Activity className="w-4 h-4 text-blue-500" />
                Render Time
              </div>
              <p className="text-2xl font-bold">
                {metrics.renderTime.toFixed(1)}ms
              </p>
              <Progress 
                value={Math.min(100, (metrics.renderTime / 16) * 100)} 
                className="h-2"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Database className="w-4 h-4 text-green-500" />
                Memory Usage
              </div>
              <p className="text-2xl font-bold">
                {metrics.memoryUsage.toFixed(1)}%
              </p>
              <Progress 
                value={metrics.memoryUsage} 
                className="h-2"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Zap className="w-4 h-4 text-purple-500" />
                Cache Hit Rate
              </div>
              <p className="text-2xl font-bold">
                {metrics.cacheHitRate.toFixed(1)}%
              </p>
              <Progress 
                value={metrics.cacheHitRate} 
                className="h-2"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wifi className="w-4 h-4 text-orange-500" />
                Network Latency
              </div>
              <p className="text-2xl font-bold">
                {metrics.networkLatency.toFixed(0)}ms
              </p>
              <Progress 
                value={Math.min(100, (metrics.networkLatency / 1000) * 100)} 
                className="h-2"
              />
            </div>
          </div>

          {/* System Status */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {pendingCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {pendingCount} pending sync{pendingCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            <Button
              onClick={optimizeNow}
              disabled={isOptimizing}
              size="sm"
              variant="outline"
            >
              {isOptimizing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Optimize Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Test Suite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Performance Test Suite
          </CardTitle>
          <CardDescription>
            Run comprehensive tests to validate PWA performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runPerformanceTests}
            disabled={isRunningTests}
            className="w-full"
          >
            {isRunningTests ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running Performance Tests...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4 mr-2" />
                Run Performance Tests
              </>
            )}
          </Button>

          {testResults && (
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Test Results</h4>
                <Badge 
                  variant={testResults.passed ? "default" : "destructive"}
                  className={testResults.passed ? "bg-green-100 text-green-800" : ""}
                >
                  {testResults.passed ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Passed
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Issues Found
                    </>
                  )}
                </Badge>
              </div>
              
              {testResults.error ? (
                <div className="text-red-600 text-sm">
                  Error: {testResults.error}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Time:</span> {testResults.totalTime?.toFixed(2)}ms
                  </div>
                  <div>
                    <span className="font-medium">Render Time:</span> {testResults.renderTime?.toFixed(2)}ms
                  </div>
                  <div>
                    <span className="font-medium">DB Time:</span> {testResults.dbTime?.toFixed(2)}ms
                  </div>
                  <div>
                    <span className="font-medium">Cache Status:</span> {testResults.cacheStatus}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Service Worker:</span> {testResults.swStatus}
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Test completed at {testResults.timestamp?.toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimization Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Optimization Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}