
/**
 * Phase 4: Automated Test Runner Component
 * Interactive test execution and results display
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Play, 
  Square, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  TestTube,
  Zap,
  Shield
} from 'lucide-react';
import { systemIntegrationManager, IntegrationTestResult } from '@/services/systemIntegrationManager';
import { toast } from 'sonner';

interface TestSuite {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  category: 'database' | 'biometric' | 'auth' | 'performance';
}

const TEST_SUITES: TestSuite[] = [
  {
    id: 'database',
    name: 'Database Operations',
    description: 'Test database connectivity, CRUD operations, and performance',
    icon: <Shield className="h-4 w-4" />,
    enabled: true,
    category: 'database'
  },
  {
    id: 'biometric',
    name: 'Biometric Integration',
    description: 'Test MFS100 device connection and fingerprint operations',
    icon: <TestTube className="h-4 w-4" />,
    enabled: true,
    category: 'biometric'
  },
  {
    id: 'authentication',
    name: 'Authentication Flow',
    description: 'Test user authentication, sessions, and security',
    icon: <Shield className="h-4 w-4" />,
    enabled: true,
    category: 'auth'
  },
  {
    id: 'performance',
    name: 'Performance Optimization',
    description: 'Test system performance, memory usage, and optimization',
    icon: <Zap className="h-4 w-4" />,
    enabled: true,
    category: 'performance'
  }
];

export function TestRunner() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>(TEST_SUITES);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<IntegrationTestResult[]>([]);
  const [testProgress, setTestProgress] = useState(0);

  const enabledSuites = testSuites.filter(suite => suite.enabled);
  const passedTests = testResults.filter(result => result.passed).length;
  const failedTests = testResults.filter(result => !result.passed).length;

  const handleToggleTestSuite = (suiteId: string) => {
    setTestSuites(prev => prev.map(suite => 
      suite.id === suiteId ? { ...suite, enabled: !suite.enabled } : suite
    ));
  };

  const handleRunTests = async () => {
    if (enabledSuites.length === 0) {
      toast.error('Please select at least one test suite to run');
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    setTestProgress(0);

    try {
      // Simulate progressive test execution
      for (let i = 0; i < enabledSuites.length; i++) {
        const suite = enabledSuites[i];
        setCurrentTest(suite.name);
        setTestProgress(((i + 1) / enabledSuites.length) * 100);

        // Add delay to show progress
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Run actual integration tests
      const results = await systemIntegrationManager.runIntegrationTests();
      setTestResults(results);

      const passedCount = results.filter(r => r.passed).length;
      const totalCount = results.length;

      if (passedCount === totalCount) {
        toast.success(`All ${totalCount} tests passed successfully!`);
      } else {
        toast.warning(`${passedCount}/${totalCount} tests passed. Check failed tests for details.`);
      }

    } catch (error) {
      toast.error('Test execution failed');
      console.error('Test execution error:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
      setTestProgress(0);
    }
  };

  const handleStopTests = () => {
    setIsRunning(false);
    setCurrentTest(null);
    setTestProgress(0);
    toast.info('Test execution stopped');
  };

  const handleClearResults = () => {
    setTestResults([]);
    toast.info('Test results cleared');
  };

  const getCategoryColor = (category: TestSuite['category']) => {
    switch (category) {
      case 'database': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'biometric': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'auth': return 'bg-green-100 text-green-800 border-green-200';
      case 'performance': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Suite Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <TestTube className="h-5 w-5" />
              <span>Test Suite Configuration</span>
            </CardTitle>
            <Badge variant="outline">
              {enabledSuites.length} of {testSuites.length} enabled
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testSuites.map((suite) => (
              <div
                key={suite.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  suite.enabled 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted bg-muted/5'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={suite.enabled}
                    onCheckedChange={() => handleToggleTestSuite(suite.id)}
                    disabled={isRunning}
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      {suite.icon}
                      <h3 className="font-medium">{suite.name}</h3>
                      <Badge className={getCategoryColor(suite.category)} variant="outline">
                        {suite.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{suite.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Execution Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Execution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Control Buttons */}
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleRunTests}
                disabled={isRunning || enabledSuites.length === 0}
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                Run Selected Tests
              </Button>

              {isRunning && (
                <Button
                  onClick={handleStopTests}
                  variant="destructive"
                  size="lg"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Tests
                </Button>
              )}

              {testResults.length > 0 && !isRunning && (
                <Button
                  onClick={handleClearResults}
                  variant="outline"
                  size="lg"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear Results
                </Button>
              )}
            </div>

            {/* Progress Indicator */}
            {isRunning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {currentTest ? `Running: ${currentTest}` : 'Initializing tests...'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(testProgress)}%
                  </span>
                </div>
                <Progress value={testProgress} className="w-full" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Test Results</CardTitle>
              <div className="flex items-center space-x-4">
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {passedTests} Passed
                </Badge>
                {failedTests > 0 && (
                  <Badge className="bg-red-100 text-red-800">
                    <XCircle className="h-3 w-3 mr-1" />
                    {failedTests} Failed
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    result.passed 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {result.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <h4 className="font-medium">{result.testName}</h4>
                        {result.error && (
                          <p className="text-sm text-red-600 mt-1">{result.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{result.duration}ms</span>
                    </div>
                  </div>

                  {result.details && (
                    <div className="mt-3 pt-3 border-t border-current/10">
                      <details className="cursor-pointer">
                        <summary className="text-sm font-medium">Test Details</summary>
                        <pre className="text-xs mt-2 p-2 bg-black/5 rounded overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {testResults.length === 0 && !isRunning && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <TestTube className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">Ready to Run Tests</h3>
                <p className="text-muted-foreground">
                  Select your test suites and click "Run Selected Tests" to begin integration testing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
