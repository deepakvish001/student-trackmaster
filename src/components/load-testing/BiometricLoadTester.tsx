import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Play, TrendingUp } from "lucide-react";
import { useLoadTesting } from "@/hooks/useLoadTesting";
import { useGlobalMFS100 } from "@/hooks/useGlobalMFS100";
import { toast } from "sonner";

export function BiometricLoadTester() {
  const { state, startTest, updateProgress, completeTest, addError, measureOperation, abortSignal } = useLoadTesting();
  const { isConnected, captureFingerprint } = useGlobalMFS100();
  const [testConfig, setTestConfig] = useState({
    consecutiveCaptures: 10,
    simultaneousFingers: 3,
    qualityThreshold: 60
  });

  const runConsecutiveCaptureTest = async () => {
    if (!isConnected) {
      toast.error("MFS100 device not connected");
      return;
    }

    const testName = `Consecutive Captures (${testConfig.consecutiveCaptures})`;
    startTest(testName);

    const startTime = performance.now();
    let successCount = 0;
    let totalResponseTime = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < testConfig.consecutiveCaptures; i++) {
        if (abortSignal?.aborted) break;

        updateProgress((i / testConfig.consecutiveCaptures) * 100);

        try {
          const { result, duration } = await measureOperation(
            () => captureFingerprint(testConfig.qualityThreshold, 10),
            abortSignal
          );

          if (result.success) {
            successCount++;
          } else {
            errors.push(`Capture ${i + 1}: ${result.message}`);
          }
          totalResponseTime += duration;
        } catch (error) {
          errors.push(`Capture ${i + 1}: ${error}`);
          addError(`Capture ${i + 1} failed: ${error}`);
        }

        // Small delay between captures to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const totalDuration = performance.now() - startTime;
      const averageResponseTime = totalResponseTime / testConfig.consecutiveCaptures;
      const successRate = (successCount / testConfig.consecutiveCaptures) * 100;
      const operationsPerSecond = (testConfig.consecutiveCaptures / totalDuration) * 1000;

      completeTest({
        testName,
        duration: totalDuration,
        operationsPerSecond,
        successRate,
        errorCount: errors.length,
        averageResponseTime,
        timestamp: new Date()
      });

      toast.success(`Biometric test completed: ${successRate.toFixed(1)}% success rate`);
    } catch (error) {
      addError(`Test failed: ${error}`);
      toast.error("Biometric test failed");
    }
  };

  const runQualityStressTest = async () => {
    if (!isConnected) {
      toast.error("MFS100 device not connected");
      return;
    }

    const testName = "Quality Analysis Stress Test";
    startTest(testName);

    const qualityLevels = [40, 50, 60, 70, 80];
    const capturesPerLevel = 3;
    const totalCaptures = qualityLevels.length * capturesPerLevel;

    const startTime = performance.now();
    let successCount = 0;
    let totalResponseTime = 0;
    let captureIndex = 0;

    try {
      for (const quality of qualityLevels) {
        for (let i = 0; i < capturesPerLevel; i++) {
          if (abortSignal?.aborted) break;

          updateProgress((captureIndex / totalCaptures) * 100);

          try {
            const { result, duration } = await measureOperation(
              () => captureFingerprint(quality, 15),
              abortSignal
            );

            if (result.success && result.quality && result.quality >= quality) {
              successCount++;
            }
            totalResponseTime += duration;
          } catch (error) {
            addError(`Quality test ${quality}% failed: ${error}`);
          }

          captureIndex++;
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      const totalDuration = performance.now() - startTime;
      const averageResponseTime = totalResponseTime / totalCaptures;
      const successRate = (successCount / totalCaptures) * 100;
      const operationsPerSecond = (totalCaptures / totalDuration) * 1000;

      completeTest({
        testName,
        duration: totalDuration,
        operationsPerSecond,
        successRate,
        errorCount: totalCaptures - successCount,
        averageResponseTime,
        timestamp: new Date()
      });

      toast.success(`Quality stress test completed: ${successRate.toFixed(1)}% success rate`);
    } catch (error) {
      addError(`Quality stress test failed: ${error}`);
      toast.error("Quality stress test failed");
    }
  };

  const isTestRunning = state.isRunning && state.currentTest?.includes('Capture');

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-primary" />
          Biometric Load Testing
        </CardTitle>
        <CardDescription>
          Test fingerprint capture performance under various load conditions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Device Status */}
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "destructive"}>
            Device: {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>

        {/* Test Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="consecutive">Consecutive Captures</Label>
            <Input
              id="consecutive"
              type="number"
              value={testConfig.consecutiveCaptures}
              onChange={(e) => setTestConfig(prev => ({
                ...prev,
                consecutiveCaptures: parseInt(e.target.value) || 10
              }))}
              disabled={isTestRunning}
              min="1"
              max="50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quality">Quality Threshold (%)</Label>
            <Input
              id="quality"
              type="number"
              value={testConfig.qualityThreshold}
              onChange={(e) => setTestConfig(prev => ({
                ...prev,
                qualityThreshold: parseInt(e.target.value) || 60
              }))}
              disabled={isTestRunning}
              min="30"
              max="90"
            />
          </div>
        </div>

        {/* Progress Display */}
        {isTestRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Testing in progress...</span>
              <span>{Math.round(state.progress)}%</span>
            </div>
            <Progress value={state.progress} className="h-2" />
          </div>
        )}

        {/* Test Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={runConsecutiveCaptureTest}
            disabled={!isConnected || isTestRunning}
            variant="outline"
          >
            <Play className="h-4 w-4 mr-2" />
            Consecutive Test
          </Button>
          <Button
            onClick={runQualityStressTest}
            disabled={!isConnected || isTestRunning}
            variant="outline"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Quality Stress Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}