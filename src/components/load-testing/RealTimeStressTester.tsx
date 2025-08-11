import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Play, Zap } from "lucide-react";
import { useLoadTesting } from "@/hooks/useLoadTesting";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function RealTimeStressTester() {
  const { state, startTest, updateProgress, completeTest, addError, measureOperation, abortSignal } = useLoadTesting();
  const queryClient = useQueryClient();
  const [testConfig, setTestConfig] = useState({
    bulkOperations: 20,
    concurrentUsers: 3,
    operationDelay: 500
  });

  const createMockStudent = (index: number) => ({
    roll_number: `STRESS${Date.now()}${index}`,
    first_name: `Student${index}`,
    last_name: `Test`,
    phone: `999999${String(index).padStart(4, '0')}`,
    student_name: `Student${index} Test`,
    batch_id: '00000000-0000-0000-0000-000000000000'
  });

  const runBulkOperationTest = async () => {
    const testName = `Bulk Operations (${testConfig.bulkOperations})`;
    startTest(testName);

    const startTime = performance.now();
    let successCount = 0;
    let totalResponseTime = 0;
    const createdStudents: any[] = [];

    try {
      // Create phase
      for (let i = 0; i < testConfig.bulkOperations; i++) {
        if (abortSignal?.aborted) break;

        updateProgress((i / (testConfig.bulkOperations * 2)) * 100);

        try {
          const mockStudent = createMockStudent(i);
          const { result, duration } = await measureOperation(async () => {
            const { data, error } = await supabase
              .from('students')
              .insert(mockStudent)
              .select()
              .single();
            
            if (error) throw error;
            return data;
          }, abortSignal);

          createdStudents.push(result);
          successCount++;
          totalResponseTime += duration;

          // Trigger cache invalidation to test real-time sync
          await queryClient.invalidateQueries({ queryKey: ['students'] });
          
        } catch (error) {
          addError(`Create operation ${i + 1}: ${error}`);
        }

        await new Promise(resolve => setTimeout(resolve, testConfig.operationDelay));
      }

      // Update phase
      for (let i = 0; i < createdStudents.length; i++) {
        if (abortSignal?.aborted) break;

        updateProgress(((testConfig.bulkOperations + i) / (testConfig.bulkOperations * 2)) * 100);

        try {
          const { duration } = await measureOperation(async () => {
            const { error } = await supabase
              .from('students')
              .update({ 
                last_name: `Updated${i}`,
                updated_at: new Date().toISOString()
              })
              .eq('id', createdStudents[i].id);
            
            if (error) throw error;
            return true;
          }, abortSignal);

          totalResponseTime += duration;
          await queryClient.invalidateQueries({ queryKey: ['students'] });
          
        } catch (error) {
          addError(`Update operation ${i + 1}: ${error}`);
        }

        await new Promise(resolve => setTimeout(resolve, testConfig.operationDelay));
      }

      // Cleanup phase
      if (createdStudents.length > 0) {
        try {
          await supabase
            .from('students')
            .delete()
            .in('id', createdStudents.map(s => s.id));
          
          await queryClient.invalidateQueries({ queryKey: ['students'] });
        } catch (error) {
          addError(`Cleanup failed: ${error}`);
        }
      }

      const totalDuration = performance.now() - startTime;
      const totalOperations = testConfig.bulkOperations * 2; // Create + Update
      const averageResponseTime = totalResponseTime / totalOperations;
      const successRate = (successCount / testConfig.bulkOperations) * 100;
      const operationsPerSecond = (totalOperations / totalDuration) * 1000;

      completeTest({
        testName,
        duration: totalDuration,
        operationsPerSecond,
        successRate,
        errorCount: totalOperations - successCount,
        averageResponseTime,
        timestamp: new Date()
      });

      toast.success(`Real-time sync test completed: ${successRate.toFixed(1)}% success rate`);
    } catch (error) {
      addError(`Bulk operation test failed: ${error}`);
      toast.error("Real-time sync test failed");
    }
  };

  const runConcurrentUserTest = async () => {
    const testName = `Concurrent Users (${testConfig.concurrentUsers})`;
    startTest(testName);

    const startTime = performance.now();
    const operationsPerUser = 5;
    let totalOperations = 0;
    let successfulOperations = 0;
    let totalResponseTime = 0;

    try {
      const userPromises = Array.from({ length: testConfig.concurrentUsers }, async (_, userIndex) => {
        const userSuccesses: number[] = [];
        const userTimes: number[] = [];

        for (let opIndex = 0; opIndex < operationsPerUser; opIndex++) {
          if (abortSignal?.aborted) break;

          try {
            const mockStudent = createMockStudent(userIndex * 100 + opIndex);
            const { result, duration } = await measureOperation(async () => {
              const { data, error } = await supabase
                .from('students')
                .insert(mockStudent)
                .select()
                .single();
              
              if (error) throw error;
              
              // Immediate cleanup
              await supabase
                .from('students')
                .delete()
                .eq('id', data.id);
              
              return data;
            }, abortSignal);

            userSuccesses.push(1);
            userTimes.push(duration);
            
            // Trigger cache updates to test real-time performance
            await queryClient.invalidateQueries({ queryKey: ['students'] });
            
          } catch (error) {
            userSuccesses.push(0);
            addError(`User ${userIndex + 1}, Op ${opIndex + 1}: ${error}`);
          }

          totalOperations++;
          updateProgress((totalOperations / (testConfig.concurrentUsers * operationsPerUser)) * 100);
        }

        return { successes: userSuccesses, times: userTimes };
      });

      const results = await Promise.all(userPromises);
      
      results.forEach(userResult => {
        successfulOperations += userResult.successes.reduce((sum, s) => sum + s, 0);
        totalResponseTime += userResult.times.reduce((sum, t) => sum + t, 0);
      });

      const totalDuration = performance.now() - startTime;
      const averageResponseTime = totalResponseTime / totalOperations;
      const successRate = (successfulOperations / totalOperations) * 100;
      const operationsPerSecond = (totalOperations / totalDuration) * 1000;

      completeTest({
        testName,
        duration: totalDuration,
        operationsPerSecond,
        successRate,
        errorCount: totalOperations - successfulOperations,
        averageResponseTime,
        timestamp: new Date()
      });

      toast.success(`Concurrent user test completed: ${successRate.toFixed(1)}% success rate`);
    } catch (error) {
      addError(`Concurrent user test failed: ${error}`);
      toast.error("Concurrent user test failed");
    }
  };

  const isTestRunning = state.isRunning && (
    state.currentTest?.includes('Bulk') || state.currentTest?.includes('Concurrent')
  );

  return (
    <Card className="border-accent/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent" />
          Real-Time Sync Stress Testing
        </CardTitle>
        <CardDescription>
          Test real-time synchronization and cache invalidation under load
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-ops">Bulk Operations</Label>
            <Input
              id="bulk-ops"
              type="number"
              value={testConfig.bulkOperations}
              onChange={(e) => setTestConfig(prev => ({
                ...prev,
                bulkOperations: parseInt(e.target.value) || 20
              }))}
              disabled={isTestRunning}
              min="5"
              max="50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="concurrent">Concurrent Users</Label>
            <Input
              id="concurrent"
              type="number"
              value={testConfig.concurrentUsers}
              onChange={(e) => setTestConfig(prev => ({
                ...prev,
                concurrentUsers: parseInt(e.target.value) || 3
              }))}
              disabled={isTestRunning}
              min="1"
              max="10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="delay">Operation Delay (ms)</Label>
          <Input
            id="delay"
            type="number"
            value={testConfig.operationDelay}
            onChange={(e) => setTestConfig(prev => ({
              ...prev,
              operationDelay: parseInt(e.target.value) || 500
            }))}
            disabled={isTestRunning}
            min="100"
            max="2000"
          />
        </div>

        {/* Progress Display */}
        {isTestRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Testing real-time sync...</span>
              <span>{Math.round(state.progress)}%</span>
            </div>
            <Progress value={state.progress} className="h-2" />
          </div>
        )}

        {/* Test Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={runBulkOperationTest}
            disabled={isTestRunning}
            variant="outline"
          >
            <Play className="h-4 w-4 mr-2" />
            Bulk Operations
          </Button>
          <Button
            onClick={runConcurrentUserTest}
            disabled={isTestRunning}
            variant="outline"
          >
            <Zap className="h-4 w-4 mr-2" />
            Concurrent Users
          </Button>
        </div>

        {/* Performance Tip */}
        <div className="text-xs text-muted-foreground bg-accent/10 p-2 rounded">
          💡 These tests create temporary data that's automatically cleaned up
        </div>
      </CardContent>
    </Card>
  );
}