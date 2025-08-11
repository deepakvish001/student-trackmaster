import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, BarChart3, Play, Square, Trash2 } from "lucide-react";
import { useLoadTesting } from "@/hooks/useLoadTesting";
import { BiometricLoadTester } from "./BiometricLoadTester";
import { RealTimeStressTester } from "./RealTimeStressTester";
import { DatabaseLoadTester } from "./DatabaseLoadTester";
import { MemoryProfiler } from "./MemoryProfiler";

export function LoadTestingPanel() {
  const { state, stopTest, clearResults } = useLoadTesting();

  const getStatusColor = (successRate: number) => {
    if (successRate >= 95) return 'bg-success';
    if (successRate >= 85) return 'bg-warning';
    return 'bg-destructive';
  };

  const getOverallHealth = () => {
    if (state.results.length === 0) return 'Unknown';
    const avgSuccessRate = state.results.reduce((sum, r) => sum + r.successRate, 0) / state.results.length;
    if (avgSuccessRate >= 95) return 'Excellent';
    if (avgSuccessRate >= 85) return 'Good';
    if (avgSuccessRate >= 70) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-accent/20 bg-gradient-to-r from-background to-accent/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Load Testing & Stress Testing Suite
              </CardTitle>
              <CardDescription>
                Comprehensive performance testing for biometric capture, real-time sync, and database operations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getOverallHealth() === 'Excellent' ? 'default' : 'destructive'}>
                System Health: {getOverallHealth()}
              </Badge>
              {state.isRunning && (
                <Button variant="outline" size="sm" onClick={stopTest}>
                  <Square className="h-4 w-4 mr-1" />
                  Stop Test
                </Button>
              )}
              {state.results.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearResults}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear Results
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {state.isRunning && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Running: {state.currentTest}</span>
                <span>{Math.round(state.progress)}%</span>
              </div>
              <Progress value={state.progress} className="h-2" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Error Display */}
      {state.errors.length > 0 && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Test Errors ({state.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {state.errors.map((error, index) => (
                <div key={index} className="text-sm text-muted-foreground bg-destructive/10 p-2 rounded">
                  {error}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {state.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {state.results.map((result, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium truncate">{result.testName}</h4>
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(result.successRate)}`} />
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>Success: {result.successRate.toFixed(1)}%</div>
                    <div>Ops/sec: {result.operationsPerSecond.toFixed(1)}</div>
                    <div>Avg time: {result.averageResponseTime.toFixed(0)}ms</div>
                    {result.memoryUsage && (
                      <div>Memory: {result.memoryUsage}MB</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BiometricLoadTester />
        <RealTimeStressTester />
        <DatabaseLoadTester />
        <MemoryProfiler />
      </div>
    </div>
  );
}