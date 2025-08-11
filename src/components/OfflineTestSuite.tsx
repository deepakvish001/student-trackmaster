import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Database,
  Clock,
  Activity,
  Smartphone,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';

export function OfflineTestSuite() {
  const { isOnline } = useOnlineStatus();
  const { pendingCount, isSyncing, syncToSupabase } = useOfflineSync();
  
  const [testResults, setTestResults] = useState<any>({});
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [connectionHistory, setConnectionHistory] = useState<any[]>([]);
  const [offlineActions, setOfflineActions] = useState<any[]>([]);

  // Monitor connection changes
  useEffect(() => {
    const logConnectionChange = () => {
      const timestamp = new Date();
      const newEntry = {
        timestamp,
        isOnline,
        type: isOnline ? 'ONLINE' : 'OFFLINE',
        pendingCount: pendingCount || 0
      };
      
      setConnectionHistory(prev => [newEntry, ...prev.slice(0, 9)]);
    };

    logConnectionChange();
  }, [isOnline, pendingCount]);

  // Simulate offline actions for testing
  const simulateOfflineAction = async (actionType: string) => {
    const timestamp = new Date();
    const action = {
      id: Math.random().toString(36).substr(2, 9),
      type: actionType,
      timestamp,
      status: 'pending',
      data: { test: true, action: actionType }
    };

    setOfflineActions(prev => [action, ...prev]);
    
    if (isOnline) {
      // Simulate immediate sync
      setTimeout(() => {
        setOfflineActions(prev => 
          prev.map(a => a.id === action.id ? { ...a, status: 'synced' } : a)
        );
      }, 1000);
    }

    toast.success(`${actionType} action queued ${isOnline ? '(will sync immediately)' : '(offline - will sync when online)'}`);
  };

  // Run comprehensive offline functionality tests
  const runOfflineTests = async () => {
    setIsRunningTests(true);
    const results: any = {};

    try {
      // Test 1: Check IndexedDB availability
      results.indexedDB = {
        available: 'indexedDB' in window,
        status: 'indexedDB' in window ? 'available' : 'unavailable'
      };

      // Test 2: Check Service Worker
      results.serviceWorker = {
        available: 'serviceWorker' in navigator,
        registered: false,
        controller: false
      };

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        results.serviceWorker.registered = !!registration;
        results.serviceWorker.controller = !!navigator.serviceWorker.controller;
      }

      // Test 3: Check Cache API
      results.cache = {
        available: 'caches' in window,
        cacheNames: []
      };

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        results.cache.cacheNames = cacheNames;
      }

      // Test 4: Test offline storage
      try {
        localStorage.setItem('offline_test', 'test_value');
        const retrieved = localStorage.getItem('offline_test');
        localStorage.removeItem('offline_test');
        results.localStorage = {
          available: true,
          working: retrieved === 'test_value'
        };
      } catch (error) {
        results.localStorage = {
          available: false,
          working: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Test 5: Test network detection
      results.networkDetection = {
        navigatorOnLine: navigator.onLine,
        customDetection: isOnline,
        matches: navigator.onLine === isOnline
      };

      // Test 6: Test Supabase offline capabilities
      try {
        const { error } = await supabase.from('user_profiles').select('id').limit(1);
        results.supabaseConnection = {
          working: !error,
          error: error?.message || null
        };
      } catch (error) {
        results.supabaseConnection = {
          working: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        };
      }

      setTestResults(results);
    } catch (error) {
      setTestResults({
        error: error instanceof Error ? error.message : 'Test suite failed'
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const getStatusIcon = (status: string | boolean) => {
    switch (status) {
      case true:
      case 'available':
      case 'working':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case false:
      case 'unavailable':
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            Offline Capability Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge 
                variant={isOnline ? "default" : "destructive"}
                className={isOnline ? "bg-green-100 text-green-800" : ""}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
              {pendingCount > 0 && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                  {pendingCount} pending sync
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={runOfflineTests}
                disabled={isRunningTests}
                variant="outline"
                size="sm"
              >
                {isRunningTests ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 mr-2" />
                    Run Tests
                  </>
                )}
              </Button>
              
              {isOnline && pendingCount > 0 && (
                <Button
                  onClick={() => syncToSupabase()}
                  disabled={isSyncing}
                  size="sm"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {Object.keys(testResults).length === 0 && (
            <Alert>
              <Activity className="h-4 w-4" />
              <AlertDescription>
                Click "Run Tests" to check offline capabilities and PWA features.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.error ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Test Error: {testResults.error}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Browser Features</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>IndexedDB</span>
                        {getStatusIcon(testResults.indexedDB?.available)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Service Worker</span>
                        {getStatusIcon(testResults.serviceWorker?.available)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>SW Registered</span>
                        {getStatusIcon(testResults.serviceWorker?.registered)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Cache API</span>
                        {getStatusIcon(testResults.cache?.available)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Local Storage</span>
                        {getStatusIcon(testResults.localStorage?.working)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Network & Sync</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Network Detection</span>
                        {getStatusIcon(testResults.networkDetection?.matches)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Supabase Connection</span>
                        {getStatusIcon(testResults.supabaseConnection?.working)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Cache Count</span>
                        <span className="font-medium">
                          {testResults.cache?.cacheNames?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {testResults.supabaseConnection?.error && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Supabase Error: {testResults.supabaseConnection.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Connection History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-500" />
            Connection History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {connectionHistory.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Connection changes will appear here...
              </p>
            ) : (
              connectionHistory.map((entry, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {entry.type === 'ONLINE' ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-500" />
                    )}
                    <span className="font-medium">{entry.type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {entry.pendingCount > 0 && (
                      <span>{entry.pendingCount} pending</span>
                    )}
                    <span>{entry.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Offline Action Simulator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-orange-500" />
            Offline Action Simulator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              onClick={() => simulateOfflineAction('CREATE_STUDENT')}
              variant="outline"
              size="sm"
            >
              Create Student
            </Button>
            <Button
              onClick={() => simulateOfflineAction('UPDATE_BATCH')}
              variant="outline"
              size="sm"
            >
              Update Batch
            </Button>
            <Button
              onClick={() => simulateOfflineAction('CAPTURE_FINGERPRINT')}
              variant="outline"
              size="sm"
            >
              Capture Print
            </Button>
            <Button
              onClick={() => simulateOfflineAction('AUDIT_LOG')}
              variant="outline"
              size="sm"
            >
              Log Event
            </Button>
          </div>

          {offlineActions.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <h4 className="font-semibold text-sm">Simulated Actions:</h4>
              {offlineActions.map((action) => (
                <div 
                  key={action.id}
                  className="flex items-center justify-between p-2 border rounded text-sm"
                >
                  <span>{action.type}</span>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={action.status === 'synced' ? 'default' : 'outline'}
                      className={action.status === 'synced' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {action.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {action.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}