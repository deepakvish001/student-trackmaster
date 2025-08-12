import { useState, useCallback, useEffect, useMemo } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { offlineDb } from '@/lib/offlineDatabase';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BatchOperation {
  id: string;
  type: 'sync' | 'export' | 'import' | 'backup';
  table: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  totalItems: number;
  processedItems: number;
  priority: 'high' | 'medium' | 'low';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  resumeData?: any;
  estimatedTimeRemaining?: number;
}

interface BatchConfig {
  maxBatchSize: number;
  maxConcurrentBatches: number;
  retryAttempts: number;
  adaptiveBatching: boolean;
  priorityQueuing: boolean;
}

export function useBatchOperationsManager() {
  const { isOnline } = useOnlineStatus();
  const [operations, setOperations] = useState<BatchOperation[]>([]);
  const [config, setConfig] = useState<BatchConfig>({
    maxBatchSize: 50,
    maxConcurrentBatches: 3,
    retryAttempts: 3,
    adaptiveBatching: true,
    priorityQueuing: true
  });
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'poor'>('good');

  // Monitor network quality for adaptive batching
  useEffect(() => {
    if (!isOnline) return;

    const measureNetworkQuality = async () => {
      const startTime = Date.now();
      try {
        await supabase.from('students').select('id').limit(1);
        const latency = Date.now() - startTime;
        
        if (latency < 100) setNetworkQuality('excellent');
        else if (latency < 300) setNetworkQuality('good');
        else setNetworkQuality('poor');
      } catch (error) {
        setNetworkQuality('poor');
      }
    };

    measureNetworkQuality();
    const interval = setInterval(measureNetworkQuality, 30000);
    return () => clearInterval(interval);
  }, [isOnline]);

  // Adaptive batch sizing based on network quality
  const getOptimalBatchSize = useCallback((dataType: string): number => {
    const baseSize = config.maxBatchSize;
    const isBiometric = dataType.includes('fingerprint');
    
    let multiplier = 1;
    switch (networkQuality) {
      case 'excellent':
        multiplier = 1.5;
        break;
      case 'good':
        multiplier = 1;
        break;
      case 'poor':
        multiplier = 0.5;
        break;
    }
    
    // Reduce batch size for biometric data
    if (isBiometric) multiplier *= 0.6;
    
    return Math.max(10, Math.floor(baseSize * multiplier));
  }, [config.maxBatchSize, networkQuality]);

  const createBatchOperation = useCallback((
    type: BatchOperation['type'],
    table: string,
    totalItems: number,
    priority: BatchOperation['priority'] = 'medium'
  ): string => {
    const operation: BatchOperation = {
      id: `${type}_${table}_${Date.now()}`,
      type,
      table,
      status: 'pending',
      progress: 0,
      totalItems,
      processedItems: 0,
      priority
    };

    setOperations(prev => {
      const newOps = [...prev, operation];
      
      // Sort by priority if priority queuing is enabled
      if (config.priorityQueuing) {
        return newOps.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
      }
      
      return newOps;
    });

    return operation.id;
  }, [config.priorityQueuing]);

  const updateOperation = useCallback((id: string, updates: Partial<BatchOperation>) => {
    setOperations(prev => prev.map(op => 
      op.id === id ? { ...op, ...updates } : op
    ));
  }, []);

  const processBatchSync = useCallback(async (
    operationId: string,
    data: any[],
    table: string,
    onProgress?: (progress: number) => void
  ) => {
    const batchSize = getOptimalBatchSize(table);
    let processedCount = 0;
    
    updateOperation(operationId, {
      status: 'running',
      startedAt: new Date().toISOString()
    });

    try {
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        // Process batch with retry logic
        let retries = 0;
        while (retries < config.retryAttempts) {
          try {
            if (table === 'students') {
              await supabase.from('students').upsert(batch);
            } else if (table === 'batches') {
              await supabase.from('batches').upsert(batch);
            } else if (table === 'student_fingerprints') {
              await supabase.from('student_fingerprints').upsert(batch);
            }
            break;
          } catch (error) {
            retries++;
            if (retries >= config.retryAttempts) throw error;
            
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
          }
        }
        
        processedCount += batch.length;
        const progress = (processedCount / data.length) * 100;
        
        updateOperation(operationId, {
          progress,
          processedItems: processedCount
        });
        
        onProgress?.(progress);
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      updateOperation(operationId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        progress: 100
      });
      
      toast.success(`Synchronized ${processedCount} ${table} records`);
      
    } catch (error) {
      console.error(`Batch sync error for ${table}:`, error);
      updateOperation(operationId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        resumeData: { lastProcessedIndex: processedCount }
      });
      
      toast.error(`Failed to sync ${table} data`);
    }
  }, [getOptimalBatchSize, config.retryAttempts, updateOperation]);

  const pauseOperation = useCallback((operationId: string) => {
    updateOperation(operationId, { status: 'paused' });
  }, [updateOperation]);

  const resumeOperation = useCallback(async (operationId: string) => {
    const operation = operations.find(op => op.id === operationId);
    if (!operation || !operation.resumeData) return;

    updateOperation(operationId, { status: 'running' });
    
    // Resume from where it left off
    const { lastProcessedIndex } = operation.resumeData;
    
    try {
      // Get remaining data to process
      const allData = await offlineDb.table(operation.table).toArray();
      const remainingData = allData.slice(lastProcessedIndex);
      
      await processBatchSync(operationId, remainingData, operation.table);
    } catch (error) {
      updateOperation(operationId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Resume failed'
      });
    }
  }, [operations, updateOperation, processBatchSync]);

  const cancelOperation = useCallback((operationId: string) => {
    setOperations(prev => prev.filter(op => op.id !== operationId));
  }, []);

  const clearCompletedOperations = useCallback(() => {
    setOperations(prev => prev.filter(op => op.status !== 'completed'));
  }, []);

  // Auto-start operations when online
  useEffect(() => {
    if (!isOnline) return;

    const pendingOps = operations.filter(op => op.status === 'pending');
    const runningOps = operations.filter(op => op.status === 'running');
    
    if (runningOps.length >= config.maxConcurrentBatches) return;

    const opsToStart = pendingOps.slice(0, config.maxConcurrentBatches - runningOps.length);
    
    opsToStart.forEach(async (op) => {
      const data = await offlineDb.table(op.table).toArray();
      await processBatchSync(op.id, data, op.table);
    });
  }, [isOnline, operations, config.maxConcurrentBatches, processBatchSync]);

  const stats = useMemo(() => {
    const total = operations.length;
    const pending = operations.filter(op => op.status === 'pending').length;
    const running = operations.filter(op => op.status === 'running').length;
    const completed = operations.filter(op => op.status === 'completed').length;
    const failed = operations.filter(op => op.status === 'failed').length;
    const paused = operations.filter(op => op.status === 'paused').length;
    
    const totalProgress = operations.reduce((sum, op) => sum + op.progress, 0);
    const averageProgress = total > 0 ? totalProgress / total : 0;
    
    return {
      total,
      pending,
      running,
      completed,
      failed,
      paused,
      averageProgress,
      networkQuality
    };
  }, [operations, networkQuality]);

  return {
    operations,
    config,
    stats,
    createBatchOperation,
    updateOperation,
    processBatchSync,
    pauseOperation,
    resumeOperation,
    cancelOperation,
    clearCompletedOperations,
    setConfig,
    getOptimalBatchSize
  };
}