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
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile Responsive */}
      <Card className="border-accent/20 bg-gradient-to-r from-background to-accent/5">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <BarChart3 className="h-5 w-5 text-primary" />
                Load Testing & Stress Testing Suite
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Comprehensive performance testing for biometric capture, real-time sync, and database operations
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <Badge variant={getOverallHealth() === 'Excellent' ? 'default' : 'destructive'} className="text-xs">
                System Health: {getOverallHealth()}
              </Badge>
              <div className="flex gap-2">
                {state.isRunning && (
                  <Button variant="outline" size="sm" onClick={stopTest} className="touch-manipulation">
                    <Square className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Stop Test</span>
                  </Button>
                )}
                {state.results.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearResults} className="touch-manipulation">
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Clear Results</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        {state.isRunning && (
          <CardContent className="p-4 sm:p-6">
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Test Results Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {state.results.map((result, index) => (
                  <div key={index} className="space-y-2 p-3 border rounded-lg bg-card">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium truncate text-sm">{result.testName}</h4>
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

      {/* Test Components - Mobile Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <BiometricLoadTester />
        <RealTimeStressTester />
        <DatabaseLoadTester />
        <MemoryProfiler />
      </div>
    </div>
  );
}