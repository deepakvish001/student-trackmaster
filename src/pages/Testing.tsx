
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  TestTube, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Zap,
  Database,
  Wifi,
  Shield,
  Clock,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Server,
  Globe,
  Lock,
  Users,
  Fingerprint,
  HardDrive,
  Cpu,
  BarChart3,
  LineChart,
  PieChart
} from 'lucide-react';

interface TestResult {
  id: string;
  name: string;
  category: 'database' | 'biometric' | 'network' | 'security' | 'performance';
  status: 'passed' | 'failed' | 'warning' | 'running';
  duration: number;
  lastRun: string;
  details: string;
  score: number;
}

export default function Testing() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [testProgress, setTestProgress] = useState<{[key: string]: number}>({});

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mock test data - replace with actual test results
  const mockTests: TestResult[] = [
    {
      id: '1',
      name: 'Database Connection Test',
      category: 'database',
      status: 'passed',
      duration: 245,
      lastRun: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      details: 'All database connections are healthy and responsive.',
      score: 98
    },
    {
      id: '2',
      name: 'Biometric Device Connectivity',
      category: 'biometric',
      status: 'warning',
      duration: 1200,
      lastRun: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
      details: 'MFS100 device connected but showing intermittent timeouts.',
      score: 75
    },
    {
      id: '3',
      name: 'Network Latency Test',
      category: 'network',
      status: 'passed',
      duration: 890,
      lastRun: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
      details: 'Network latency is within acceptable limits (< 50ms).',
      score: 94
    },
    {
      id: '4',
      name: 'Authentication Security Test',
      category: 'security',
      status: 'passed',
      duration: 1450,
      lastRun: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
      details: 'All authentication mechanisms are secure and functioning.',
      score: 100
    },
    {
      id: '5',
      name: 'Data Encryption Validation',
      category: 'security',
      status: 'passed',
      duration: 2100,
      lastRun: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      details: 'Biometric data encryption is working properly with AES-256.',
      score: 96
    },
    {
      id: '6',
      name: 'Performance Benchmark',
      category: 'performance',
      status: 'failed',
      duration: 3200,
      lastRun: new Date(Date.now() - 1200000).toISOString(), // 20 minutes ago
      details: 'Query response time exceeding threshold (> 2 seconds).',
      score: 45
    }
  ];

  const { data: tests = mockTests, isLoading, refetch } = useQuery({
    queryKey: ['system-tests'],
    queryFn: async () => {
      // In a real app, this would fetch actual test results
      return mockTests;
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Real-time statistics
  const stats = {
    totalTests: tests.length,
    passedTests: tests.filter(t => t.status === 'passed').length,
    failedTests: tests.filter(t => t.status === 'failed').length,
    warningTests: tests.filter(t => t.status === 'warning').length,
    averageScore: Math.round(tests.reduce((sum, t) => sum + t.score, 0) / tests.length),
    systemHealth: tests.filter(t => t.status === 'passed').length / tests.length * 100
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'database': return <Database className="h-5 w-5 text-electric-blue" />;
      case 'biometric': return <Fingerprint className="h-5 w-5 text-emerald-green" />;
      case 'network': return <Wifi className="h-5 w-5 text-sunset-orange" />;
      case 'security': return <Shield className="h-5 w-5 text-pink-rose" />;
      case 'performance': return <Zap className="h-5 w-5 text-vibrant-purple" />;
      default: return <TestTube className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'database': return 'text-electric-blue bg-electric-blue/10 border-electric-blue/20';
      case 'biometric': return 'text-emerald-green bg-emerald-green/10 border-emerald-green/20';
      case 'network': return 'text-sunset-orange bg-sunset-orange/10 border-sunset-orange/20';
      case 'security': return 'text-pink-rose bg-pink-rose/10 border-pink-rose/20';
      case 'performance': return 'text-vibrant-purple bg-vibrant-purple/10 border-vibrant-purple/20';
      default: return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed': 
        return <Badge className="bg-emerald-green/20 text-emerald-green border-emerald-green/30 font-bold">
          <CheckCircle className="h-3 w-3 mr-1" />PASSED
        </Badge>;
      case 'failed': 
        return <Badge className="bg-pink-rose/20 text-pink-rose border-pink-rose/30 font-bold">
          <XCircle className="h-3 w-3 mr-1" />FAILED
        </Badge>;
      case 'warning': 
        return <Badge className="bg-sunset-orange/20 text-sunset-orange border-sunset-orange/30 font-bold">
          <AlertTriangle className="h-3 w-3 mr-1" />WARNING
        </Badge>;
      case 'running': 
        return <Badge className="bg-electric-blue/20 text-electric-blue border-electric-blue/30 font-bold animate-pulse">
          <Activity className="h-3 w-3 mr-1" />RUNNING
        </Badge>;
      default: 
        return <Badge className="bg-muted/20 text-muted-foreground border-muted/30">UNKNOWN</Badge>;
    }
  };

  const runTest = (testId: string) => {
    if (runningTests.has(testId)) return;
    
    setRunningTests(prev => new Set([...prev, testId]));
    setTestProgress(prev => ({ ...prev, [testId]: 0 }));
    
    const progressInterval = setInterval(() => {
      setTestProgress(prev => {
        const current = prev[testId] || 0;
        if (current >= 100) {
          clearInterval(progressInterval);
          setRunningTests(prev => {
            const newSet = new Set(prev);
            newSet.delete(testId);
            return newSet;
          });
          setTimeout(() => {
            setTestProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[testId];
              return newProgress;
            });
            refetch();
          }, 1000);
          return prev;
        }
        return { ...prev, [testId]: current + Math.random() * 15 + 5 };
      });
    }, 500);
  };

  const runAllTests = () => {
    tests.forEach(test => {
      setTimeout(() => runTest(test.id), Math.random() * 2000);
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background flex items-center justify-center">
          <div className="glass-card p-12 text-center space-y-6">
            <div className="animate-spin w-16 h-16 border-4 border-electric-blue/30 border-t-electric-blue rounded-full mx-auto"></div>
            <div className="text-2xl font-bold text-electric-blue animate-pulse">Loading System Tests...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background">
        <div className="space-y-8 p-6 animate-fade-in-up">
          {/* Enhanced Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-electric-blue via-emerald-green to-pink-rose bg-clip-text text-transparent">
                🔬 System Testing Dashboard
              </h1>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-electric-blue animate-pulse" />
                  <span className="font-mono text-electric-blue text-lg">
                    {currentTime.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-emerald-green" />
                  <span className="text-emerald-green font-semibold">
                    System Health: {Math.round(stats.systemHealth)}%
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-sunset-orange" />
                  <span className="text-sunset-orange font-semibold">
                    Avg Score: {stats.averageScore}/100
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => refetch()}
                className="bg-gradient-to-r from-electric-blue to-vibrant-purple hover:scale-105 transition-all duration-300 shadow-glow"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={runAllTests}
                className="bg-gradient-to-r from-emerald-green to-lime-green hover:scale-105 transition-all duration-300 shadow-green-glow"
              >
                <Play className="h-4 w-4 mr-2" />
                Run All Tests
              </Button>
            </div>
          </div>

          {/* Real-time System Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            <Card className="glass-card border-electric-blue/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-electric-blue font-bold uppercase tracking-wide">Total Tests</p>
                    <p className="text-3xl font-bold text-electric-blue">{stats.totalTests}</p>
                  </div>
                  <TestTube className="h-8 w-8 text-electric-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-emerald-green/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-emerald-green font-bold uppercase tracking-wide">Passed</p>
                    <p className="text-3xl font-bold text-emerald-green">{stats.passedTests}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-emerald-green" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-sunset-orange/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-sunset-orange font-bold uppercase tracking-wide">Warnings</p>
                    <p className="text-3xl font-bold text-sunset-orange">{stats.warningTests}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-sunset-orange" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-pink-rose/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-pink-rose font-bold uppercase tracking-wide">Failed</p>
                    <p className="text-3xl font-bold text-pink-rose">{stats.failedTests}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-pink-rose" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-vibrant-purple/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-vibrant-purple font-bold uppercase tracking-wide">Avg Score</p>
                    <p className="text-3xl font-bold text-vibrant-purple">{stats.averageScore}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-vibrant-purple" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-lime-green/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-lime-green font-bold uppercase tracking-wide">Health</p>
                    <p className="text-2xl font-bold text-lime-green">{Math.round(stats.systemHealth)}%</p>
                  </div>
                  <Activity className="h-8 w-8 text-lime-green" />
                </div>
                <Progress value={stats.systemHealth} className="mt-2 h-2" />
              </CardContent>
            </Card>
          </div>

          {/* System Health Alert */}
          {stats.systemHealth < 80 && (
            <Alert className="glass border-pink-rose/30 bg-pink-rose/5">
              <AlertTriangle className="h-5 w-5 text-pink-rose" />
              <AlertDescription className="text-pink-rose font-medium text-lg">
                ⚠️ <strong>System Health Alert:</strong> Overall system health is below 80%. Please review failed tests and take corrective action.
              </AlertDescription>
            </Alert>
          )}

          {/* Enhanced Test Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tests.map((test) => (
              <Card 
                key={test.id} 
                className="glass-card border-foreground/10 hover-lift interactive-card overflow-hidden"
              >
                <CardHeader className="bg-gradient-to-r from-surface-darker/50 to-surface-dark/50 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-electric-blue/20 to-vibrant-purple/20 rounded-xl flex items-center justify-center">
                        {getCategoryIcon(test.category)}
                      </div>
                      <div>
                        <CardTitle className="text-lg text-foreground font-bold">{test.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">Duration: {test.duration}ms</p>
                      </div>
                    </div>
                    {runningTests.has(test.id) ? getStatusBadge('running') : getStatusBadge(test.status)}
                  </div>
                </CardHeader>
                
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className={`font-semibold px-3 py-1 ${getCategoryColor(test.category)}`}>
                      {test.category.toUpperCase()}
                    </Badge>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Score:</span>
                      <span className={`text-xl font-bold ${
                        test.score >= 90 ? 'text-emerald-green' :
                        test.score >= 70 ? 'text-sunset-orange' :
                        'text-pink-rose'
                      }`}>
                        {test.score}/100
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Progress value={test.score} className="h-3" />
                    <p className="text-sm text-muted-foreground">{test.details}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Last run: {new Date(test.lastRun).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {testProgress[test.id] !== undefined ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground">Running test...</span>
                        <span className="text-electric-blue font-semibold">{Math.round(testProgress[test.id])}%</span>
                      </div>
                      <Progress value={testProgress[test.id]} className="h-2" />
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => runTest(test.id)}
                        disabled={runningTests.has(test.id)}
                        className="flex-1 bg-gradient-to-r from-electric-blue to-vibrant-purple hover:scale-105 transition-all duration-300"
                        size="sm"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="glass border-emerald-green/30 text-emerald-green hover:bg-emerald-green/10"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* System Status Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="glass-card border-electric-blue/20">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-electric-blue flex items-center">
                  <Database className="h-6 w-6 mr-3" />
                  Database Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Connection Pool:</span>
                    <Badge className="bg-emerald-green/20 text-emerald-green border-emerald-green/30">Healthy</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Query Performance:</span>
                    <span className="text-emerald-green font-semibold">245ms avg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Active Connections:</span>
                    <span className="text-electric-blue font-semibold">12/50</span>
                  </div>
                </div>
                <Progress value={24} className="h-2" />
              </CardContent>
            </Card>

            <Card className="glass-card border-emerald-green/20">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-emerald-green flex items-center">
                  <Shield className="h-6 w-6 mr-3" />
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Encryption:</span>
                    <Badge className="bg-emerald-green/20 text-emerald-green border-emerald-green/30">AES-256 Active</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Authentication:</span>
                    <Badge className="bg-emerald-green/20 text-emerald-green border-emerald-green/30">Secure</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Session Timeout:</span>
                    <span className="text-emerald-green font-semibold">30 minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-sunset-orange/20">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-sunset-orange flex items-center">
                  <Fingerprint className="h-6 w-6 mr-3" />
                  Biometric Devices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">MFS100 Status:</span>
                    <Badge className="bg-sunset-orange/20 text-sunset-orange border-sunset-orange/30">Connected</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Device Health:</span>
                    <span className="text-sunset-orange font-semibold">75%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Last Sync:</span>
                    <span className="text-muted-foreground">2 minutes ago</span>
                  </div>
                </div>
                <Progress value={75} className="h-2" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
