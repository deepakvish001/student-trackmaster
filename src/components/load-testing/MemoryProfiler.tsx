import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MemoryStick, Play, Trash2, AlertTriangle } from "lucide-react";
import { useLoadTesting } from "@/hooks/useLoadTesting";
import { toast } from "sonner";

interface MemorySnapshot {
  timestamp: Date;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usage: number; // Percentage
}

export function MemoryProfiler() {
  const { state, startTest, updateProgress, completeTest, addError, getMemoryUsage } = useLoadTesting();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [snapshots, setSnapshots] = useState<MemorySnapshot[]>([]);
  const [currentSnapshot, setCurrentSnapshot] = useState<MemorySnapshot | null>(null);

  const takeMemorySnapshot = useCallback((): MemorySnapshot | null => {
    if (!('memory' in performance)) {
      return null;
    }

    const memory = (performance as any).memory;
    const snapshot: MemorySnapshot = {
      timestamp: new Date(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };

    setCurrentSnapshot(snapshot);
    return snapshot;
  }, []);

  const formatBytes = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getMemoryStatus = (usage: number): { color: string; label: string } => {
    if (usage > 80) return { color: 'bg-destructive', label: 'Critical' };
    if (usage > 60) return { color: 'bg-warning', label: 'High' };
    if (usage > 40) return { color: 'bg-accent', label: 'Moderate' };
    return { color: 'bg-success', label: 'Normal' };
  };

  const startMemoryMonitoring = useCallback(() => {
    setIsMonitoring(true);
    setSnapshots([]);
    
    const interval = setInterval(() => {
      const snapshot = takeMemorySnapshot();
      if (snapshot) {
        setSnapshots(prev => [...prev.slice(-50), snapshot]); // Keep last 50 snapshots
      }
    }, 1000);

    // Stop monitoring after 60 seconds
    setTimeout(() => {
      clearInterval(interval);
      setIsMonitoring(false);
      toast.success("Memory monitoring completed");
    }, 60000);

    return () => clearInterval(interval);
  }, [takeMemorySnapshot]);

  const runMemoryStressTest = async () => {
    const testName = "Memory Stress Test";
    startTest(testName);

    const startTime = performance.now();
    const initialSnapshot = takeMemorySnapshot();
    let peakMemory = initialSnapshot?.usedJSHeapSize || 0;
    let memoryLeakDetected = false;

    try {
      // Phase 1: Create memory pressure with large objects
      updateProgress(10);
      const largeArrays: any[][] = [];
      
      for (let i = 0; i < 10; i++) {
        const largeArray = new Array(100000).fill(0).map(() => ({
          id: Math.random(),
          data: new Array(100).fill(Math.random().toString(36)),
          timestamp: new Date()
        }));
        largeArrays.push(largeArray);
        
        const snapshot = takeMemorySnapshot();
        if (snapshot && snapshot.usedJSHeapSize > peakMemory) {
          peakMemory = snapshot.usedJSHeapSize;
        }
        
        updateProgress(10 + (i * 3));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      updateProgress(40);

      // Phase 2: Create DOM elements stress
      const elements: HTMLElement[] = [];
      for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        div.innerHTML = `<span>Test ${i}</span><button>Click ${i}</button>`;
        div.style.display = 'none';
        document.body.appendChild(div);
        elements.push(div);
        
        if (i % 100 === 0) {
          updateProgress(40 + (i / 1000) * 30);
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      updateProgress(70);

      // Phase 3: Clean up and check for leaks
      largeArrays.length = 0; // Clear arrays
      elements.forEach(el => document.body.removeChild(el));
      
      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc();
      }

      updateProgress(80);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for GC

      const finalSnapshot = takeMemorySnapshot();
      
      if (initialSnapshot && finalSnapshot) {
        const memoryIncrease = finalSnapshot.usedJSHeapSize - initialSnapshot.usedJSHeapSize;
        const increasePercentage = (memoryIncrease / initialSnapshot.usedJSHeapSize) * 100;
        
        if (increasePercentage > 50) {
          memoryLeakDetected = true;
          addError(`Potential memory leak detected: ${increasePercentage.toFixed(1)}% increase`);
        }
      }

      updateProgress(100);

      const totalDuration = performance.now() - startTime;
      const memoryEfficiency = memoryLeakDetected ? 50 : 95;

      completeTest({
        testName,
        duration: totalDuration,
        operationsPerSecond: 1000 / (totalDuration / 1000), // Operations simulated
        successRate: memoryEfficiency,
        errorCount: memoryLeakDetected ? 1 : 0,
        averageResponseTime: totalDuration / 3, // 3 phases
        memoryUsage: peakMemory / (1024 * 1024), // MB
        timestamp: new Date()
      });

      if (memoryLeakDetected) {
        toast.warning("Memory stress test completed with warnings");
      } else {
        toast.success("Memory stress test completed successfully");
      }
    } catch (error) {
      addError(`Memory stress test failed: ${error}`);
      toast.error("Memory stress test failed");
    }
  };

  const clearSnapshots = () => {
    setSnapshots([]);
    setCurrentSnapshot(null);
  };

  // Update current snapshot periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isMonitoring) {
        takeMemorySnapshot();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isMonitoring, takeMemorySnapshot]);

  const isTestRunning = state.isRunning && state.currentTest?.includes('Memory');
  const memoryStatus = currentSnapshot ? getMemoryStatus(currentSnapshot.usage) : { color: 'bg-muted', label: 'Unknown' };
  const isMemorySupported = 'memory' in performance;

  return (
    <Card className="border-warning/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MemoryStick className="h-5 w-5 text-warning" />
          Memory Profiler
        </CardTitle>
        <CardDescription>
          Monitor memory usage and detect potential memory leaks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isMemorySupported && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm">Memory API not supported in this browser</span>
          </div>
        )}

        {/* Current Memory Status */}
        {currentSnapshot && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Memory Usage</span>
              <Badge className={memoryStatus.color}>
                {memoryStatus.label} ({currentSnapshot.usage.toFixed(1)}%)
              </Badge>
            </div>
            
            <Progress value={currentSnapshot.usage} className="h-2" />
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Used: </span>
                <span className="font-mono">{formatBytes(currentSnapshot.usedJSHeapSize)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Limit: </span>
                <span className="font-mono">{formatBytes(currentSnapshot.jsHeapSizeLimit)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Progress Display */}
        {isTestRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Running memory stress test...</span>
              <span>{Math.round(state.progress)}%</span>
            </div>
            <Progress value={state.progress} className="h-2" />
          </div>
        )}

        {/* Monitoring Status */}
        {isMonitoring && (
          <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-sm">Memory monitoring active ({snapshots.length} snapshots)</span>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={startMemoryMonitoring}
            disabled={isTestRunning || isMonitoring || !isMemorySupported}
            variant="outline"
            size="sm"
          >
            <Play className="h-4 w-4 mr-1" />
            Monitor
          </Button>
          <Button
            onClick={runMemoryStressTest}
            disabled={isTestRunning || isMonitoring || !isMemorySupported}
            variant="outline"
            size="sm"
          >
            <MemoryStick className="h-4 w-4 mr-1" />
            Stress Test
          </Button>
          <Button
            onClick={clearSnapshots}
            disabled={isTestRunning || snapshots.length === 0}
            variant="outline"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>

        {/* Memory History */}
        {snapshots.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Memory History (Last {snapshots.length} samples)</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {snapshots.slice(-10).reverse().map((snapshot, index) => (
                <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
                  <span>{snapshot.timestamp.toLocaleTimeString()}</span>
                  <span className="font-mono">{formatBytes(snapshot.usedJSHeapSize)}</span>
                  <Badge 
                    variant="outline" 
                    className={`${getMemoryStatus(snapshot.usage).color} text-white text-xs`}
                  >
                    {snapshot.usage.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="text-xs text-muted-foreground bg-warning/10 p-2 rounded">
          💡 Memory monitoring helps identify memory leaks and optimize performance
        </div>
      </CardContent>
    </Card>
  );
}