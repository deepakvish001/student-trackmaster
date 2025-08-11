import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Database, Play, Search, BarChart } from "lucide-react";
import { useLoadTesting } from "@/hooks/useLoadTesting";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function DatabaseLoadTester() {
  const { state, startTest, updateProgress, completeTest, addError, measureOperation, abortSignal } = useLoadTesting();
  const [testConfig, setTestConfig] = useState({
    queryIterations: 50,
    complexJoins: 10,
    batchSize: 100
  });

  const runQueryPerformanceTest = async () => {
    const testName = `Query Performance (${testConfig.queryIterations} iterations)`;
    startTest(testName);

    const startTime = performance.now();
    let successCount = 0;
    let totalResponseTime = 0;

    try {
      const queries = [
        // Basic student queries
        () => supabase.from('students').select('*').limit(10),
        () => supabase.from('students').select('id, roll_number, first_name').limit(20),
        
        // Filtered queries
        () => supabase.from('students').select('*').ilike('first_name', '%test%'),
        () => supabase.from('students').select('*').order('created_at', { ascending: false }).limit(15),
        
        // Count queries
        () => supabase.from('students').select('*', { count: 'exact', head: true }),
        () => supabase.from('batches').select('*', { count: 'exact', head: true }),
        
        // Complex queries with RLS
        () => supabase.from('students').select(`
          *,
          batches!inner(name, description)
        `).limit(5)
      ];

      for (let i = 0; i < testConfig.queryIterations; i++) {
        if (abortSignal?.aborted) break;

        updateProgress((i / testConfig.queryIterations) * 100);

        const queryIndex = i % queries.length;
        const query = queries[queryIndex];

        try {
          const { duration } = await measureOperation(async () => {
            const { data, error } = await query();
            if (error) throw error;
            return data;
          }, abortSignal);

          successCount++;
          totalResponseTime += duration;
        } catch (error) {
          addError(`Query ${i + 1}: ${error}`);
        }

        // Small delay to simulate real usage patterns
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      const totalDuration = performance.now() - startTime;
      const averageResponseTime = totalResponseTime / testConfig.queryIterations;
      const successRate = (successCount / testConfig.queryIterations) * 100;
      const operationsPerSecond = (testConfig.queryIterations / totalDuration) * 1000;

      completeTest({
        testName,
        duration: totalDuration,
        operationsPerSecond,
        successRate,
        errorCount: testConfig.queryIterations - successCount,
        averageResponseTime,
        timestamp: new Date()
      });

      toast.success(`Database query test completed: ${successRate.toFixed(1)}% success rate`);
    } catch (error) {
      addError(`Query performance test failed: ${error}`);
      toast.error("Database query test failed");
    }
  };

  const runComplexJoinTest = async () => {
    const testName = `Complex Joins (${testConfig.complexJoins} queries)`;
    startTest(testName);

    const startTime = performance.now();
    let successCount = 0;
    let totalResponseTime = 0;

    try {
      const complexQueries = [
        // Student with batch info
        () => supabase.from('students').select(`
          id, roll_number, first_name, last_name,
          batches(id, name, description, created_at)
        `).limit(10),
        
        // Batch with student count
        () => supabase.from('batches').select(`
          id, name, description,
          students(count)
        `).limit(5),
        
        // Students with fingerprint data existence check
        () => supabase.from('students').select(`
          id, roll_number, first_name,
          student_fingerprints(id)
        `).limit(8),
        
        // Advanced filtering with joins
        () => supabase.from('students').select(`
          id, roll_number, first_name, last_name, phone
        `).limit(5)
      ];

      for (let i = 0; i < testConfig.complexJoins; i++) {
        if (abortSignal?.aborted) break;

        updateProgress((i / testConfig.complexJoins) * 100);

        const queryIndex = i % complexQueries.length;
        const query = complexQueries[queryIndex];

        try {
          const { duration } = await measureOperation(async () => {
            const { data, error } = await query();
            if (error) throw error;
            return data;
          }, abortSignal);

          successCount++;
          totalResponseTime += duration;
        } catch (error) {
          addError(`Complex query ${i + 1}: ${error}`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const totalDuration = performance.now() - startTime;
      const averageResponseTime = totalResponseTime / testConfig.complexJoins;
      const successRate = (successCount / testConfig.complexJoins) * 100;
      const operationsPerSecond = (testConfig.complexJoins / totalDuration) * 1000;

      completeTest({
        testName,
        duration: totalDuration,
        operationsPerSecond,
        successRate,
        errorCount: testConfig.complexJoins - successCount,
        averageResponseTime,
        timestamp: new Date()
      });

      toast.success(`Complex join test completed: ${successRate.toFixed(1)}% success rate`);
    } catch (error) {
      addError(`Complex join test failed: ${error}`);
      toast.error("Complex join test failed");
    }
  };

  const runIndexPerformanceTest = async () => {
    const testName = "Index Performance Analysis";
    startTest(testName);

    const startTime = performance.now();
    let successCount = 0;
    let totalResponseTime = 0;
    const testCount = 20;

    try {
      const indexTests = [
        // Test primary key lookups
        () => supabase.from('students').select('*').eq('id', 'test-id-that-wont-exist'),
        
        // Test unique constraint lookups
        () => supabase.from('students').select('*').eq('roll_number', 'NONEXISTENT123'),
        
        // Test timestamp range queries
        () => supabase.from('students').select('*')
          .gte('created_at', new Date(Date.now() - 86400000).toISOString())
          .order('created_at'),
        
        // Test ILIKE performance (should use index if available)
        () => supabase.from('students').select('*').ilike('first_name', 'A%').limit(10),
        
        // Test sorting performance
        () => supabase.from('students').select('*').order('roll_number').limit(10)
      ];

      for (let i = 0; i < testCount; i++) {
        if (abortSignal?.aborted) break;

        updateProgress((i / testCount) * 100);

        const testIndex = i % indexTests.length;
        const test = indexTests[testIndex];

        try {
          const { duration } = await measureOperation(async () => {
            const { data, error } = await test();
            if (error) throw error;
            return data;
          }, abortSignal);

          successCount++;
          totalResponseTime += duration;
        } catch (error) {
          addError(`Index test ${i + 1}: ${error}`);
        }

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const totalDuration = performance.now() - startTime;
      const averageResponseTime = totalResponseTime / testCount;
      const successRate = (successCount / testCount) * 100;
      const operationsPerSecond = (testCount / totalDuration) * 1000;

      completeTest({
        testName,
        duration: totalDuration,
        operationsPerSecond,
        successRate,
        errorCount: testCount - successCount,
        averageResponseTime,
        timestamp: new Date()
      });

      toast.success(`Index performance test completed: ${successRate.toFixed(1)}% success rate`);
    } catch (error) {
      addError(`Index performance test failed: ${error}`);
      toast.error("Index performance test failed");
    }
  };

  const isTestRunning = state.isRunning && (
    state.currentTest?.includes('Query') || 
    state.currentTest?.includes('Join') || 
    state.currentTest?.includes('Index')
  );

  return (
    <Card className="border-secondary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-secondary" />
          Database Load Testing
        </CardTitle>
        <CardDescription>
          Test database query performance, joins, and indexing under load
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="query-iterations">Query Iterations</Label>
            <Input
              id="query-iterations"
              type="number"
              value={testConfig.queryIterations}
              onChange={(e) => setTestConfig(prev => ({
                ...prev,
                queryIterations: parseInt(e.target.value) || 50
              }))}
              disabled={isTestRunning}
              min="10"
              max="200"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="complex-joins">Complex Joins</Label>
            <Input
              id="complex-joins"
              type="number"
              value={testConfig.complexJoins}
              onChange={(e) => setTestConfig(prev => ({
                ...prev,
                complexJoins: parseInt(e.target.value) || 10
              }))}
              disabled={isTestRunning}
              min="5"
              max="50"
            />
          </div>
        </div>

        {/* Progress Display */}
        {isTestRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Testing database performance...</span>
              <span>{Math.round(state.progress)}%</span>
            </div>
            <Progress value={state.progress} className="h-2" />
          </div>
        )}

        {/* Test Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={runQueryPerformanceTest}
            disabled={isTestRunning}
            variant="outline"
            size="sm"
          >
            <Play className="h-4 w-4 mr-1" />
            Query Test
          </Button>
          <Button
            onClick={runComplexJoinTest}
            disabled={isTestRunning}
            variant="outline"
            size="sm"
          >
            <Search className="h-4 w-4 mr-1" />
            Join Test
          </Button>
          <Button
            onClick={runIndexPerformanceTest}
            disabled={isTestRunning}
            variant="outline"
            size="sm"
          >
            <BarChart className="h-4 w-4 mr-1" />
            Index Test
          </Button>
        </div>

        {/* Database Stats */}
        <div className="text-xs text-muted-foreground bg-secondary/10 p-2 rounded">
          💾 Tests include RLS policy evaluation and real-world query patterns
        </div>
      </CardContent>
    </Card>
  );
}