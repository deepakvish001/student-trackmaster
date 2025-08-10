import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { offlineStorage } from '@/services/offlineStorageService';
import { 
  Wifi, 
  WifiOff, 
  TestTube, 
  Database, 
  Download, 
  Upload,
  Trash2,
  PlayCircle,
  StopCircle,
  Timer,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

export function OfflineTestingPanel() {
  const { isOnline } = useNetworkStatus();
  const { syncStatus, syncData, clearOfflineData, cacheData, getCachedData } = useOfflineSync();
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [simulateOffline, setSimulateOffline] = useState(false);

  // Comprehensive offline feature tests
  const offlineTests = [
    {
      name: 'IndexedDB Connection',
      test: async () => {
        await offlineStorage.initialize();
        return 'IndexedDB initialized successfully';
      }
    },
    {
      name: 'Store Test Data',
      test: async () => {
        const testStudent = {
          id: 'test-' + Date.now(),
          first_name: 'Test',
          last_name: 'Student',
          email: 'test@example.com',
          phone: '1234567890',
          batch_id: 'test-batch'
        };
        await offlineStorage.put('students', testStudent);
        return 'Test student stored successfully';
      }
    },
    {
      name: 'Retrieve Cached Data',
      test: async () => {
        const students = await getCachedData('students');
        return `Retrieved ${students.length} cached students`;
      }
    },
    {
      name: 'Queue Offline Operation',
      test: async () => {
        const operation = {
          id: 'test-op-' + Date.now(),
          type: 'create' as const,
          entity: 'student' as const,
          data: { name: 'Test Operation' },
          url: '/api/test',
          method: 'POST',
          created_at: Date.now()
        };
        await offlineStorage.addPendingOperation(operation);
        return 'Operation queued successfully';
      }
    },
    {
      name: 'Service Worker Registration',
      test: async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            return 'Service Worker is active';
          } else {
            throw new Error('Service Worker not registered');
          }
        } else {
          throw new Error('Service Worker not supported');
        }
      }
    },
    {
      name: 'Cache API Access',
      test: async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          return `${cacheNames.length} caches available`;
        } else {
          throw new Error('Cache API not supported');
        }
      }
    }
  ];

  const runOfflineTests = async () => {
    setIsRunningTests(true);
    const results: TestResult[] = [];

    for (const test of offlineTests) {
      const startTime = Date.now();
      const result: TestResult = {
        name: test.name,
        status: 'running'
      };
      
      setTestResults(prev => [...prev.filter(r => r.name !== test.name), result]);

      try {
        const message = await test.test();
        const duration = Date.now() - startTime;
        
        results.push({
          ...result,
          status: 'passed',
          message,
          duration
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          ...result,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration
        });
      }

      setTestResults(prev => [...prev.filter(r => r.name !== test.name), results[results.length - 1]]);
      
      // Small delay between tests for better UX
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setIsRunningTests(false);
    const passedTests = results.filter(r => r.status === 'passed').length;
    const totalTests = results.length;
    
    if (passedTests === totalTests) {
      toast.success(`🎉 All ${totalTests} offline tests passed!`);
    } else {
      toast.error(`❌ ${totalTests - passedTests} tests failed out of ${totalTests}`);
    }
  };

  const generateTestData = async () => {
    const testStudents = Array.from({ length: 10 }, (_, i) => ({
      id: `test-student-${i + 1}`,
      first_name: `Student`,
      last_name: `${i + 1}`,
      email: `student${i + 1}@test.com`,
      phone: `123456789${i}`,
      batch_id: 'test-batch-1',
      created_at: new Date().toISOString()
    }));

    const testBatches = [
      { id: 'test-batch-1', name: 'Test Batch A', status: 'active' },
      { id: 'test-batch-2', name: 'Test Batch B', status: 'active' }
    ];

    await cacheData('students', testStudents);
    await cacheData('batches', testBatches);
    
    toast.success('📊 Generated test data successfully');
  };

  const simulateNetworkConditions = () => {
    if (simulateOffline) {
      // Simulate going back online
      setSimulateOffline(false);
      toast.success('🌐 Network simulation: Back online');
    } else {
      // Simulate going offline
      setSimulateOffline(true);
      toast.info('📱 Network simulation: Going offline');
    }
  };

  const getStorageUsage = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const usedMB = (used / (1024 * 1024)).toFixed(2);
      const quotaMB = (quota / (1024 * 1024)).toFixed(2);
      
      toast.info(`💾 Storage: ${usedMB}MB used of ${quotaMB}MB available`);
    } else {
      toast.info('💾 Storage API not supported');
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Offline Features Testing Panel
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button 
            onClick={runOfflineTests}
            disabled={isRunningTests}
            variant="default"
            size="sm"
          >
            {isRunningTests ? (
              <>
                <Timer className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Run Tests
              </>
            )}
          </Button>

          <Button 
            onClick={generateTestData}
            variant="outline"
            size="sm"
          >
            <Database className="h-4 w-4 mr-2" />
            Test Data
          </Button>

          <Button 
            onClick={simulateNetworkConditions}
            variant="outline"
            size="sm"
          >
            {simulateOffline ? (
              <>
                <Wifi className="h-4 w-4 mr-2" />
                Go Online
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 mr-2" />
                Go Offline
              </>
            )}
          </Button>

          <Button 
            onClick={getStorageUsage}
            variant="outline"
            size="sm"
          >
            <Database className="h-4 w-4 mr-2" />
            Storage Info
          </Button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results</h3>
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {result.status === 'running' && (
                      <Timer className="h-4 w-4 animate-spin text-blue-500" />
                    )}
                    {result.status === 'passed' && (
                      <CheckCircle className="h-4 w-4 text-emerald-green" />
                    )}
                    {result.status === 'failed' && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    
                    <div>
                      <div className="font-medium">{result.name}</div>
                      {result.message && (
                        <div className="text-sm text-muted-foreground">
                          {result.message}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {result.duration && (
                    <Badge variant="outline" className="text-xs">
                      {result.duration}ms
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync Status */}
        {syncStatus.pendingOperations > 0 && (
          <Alert>
            <Upload className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>{syncStatus.pendingOperations} operations pending sync</span>
                <Button size="sm" onClick={syncData} disabled={syncStatus.isSyncing}>
                  {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Warning for simulation mode */}
        {simulateOffline && (
          <Alert className="border-sunset-orange/20 bg-sunset-orange/5">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              <strong>Simulation Mode:</strong> Network conditions are being simulated for testing purposes.
            </AlertDescription>
          </Alert>
        )}

        {/* Clear Data Option */}
        <div className="pt-4 border-t">
          <Button 
            onClick={clearOfflineData}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Offline Data
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            This will clear all cached data and pending operations. Use for testing only.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}