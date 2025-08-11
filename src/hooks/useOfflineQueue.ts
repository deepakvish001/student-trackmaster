import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { toast } from 'sonner';

interface QueueItem {
  id: string;
  type: 'biometric' | 'student' | 'batch' | 'sync';
  action: string;
  data: any;
  timestamp: number;
  retries: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface OfflineQueueState {
  queue: QueueItem[];
  processing: boolean;
  syncInProgress: boolean;
  lastSyncTime: Date | null;
  failedItems: QueueItem[];
}

export function useOfflineQueue() {
  const [state, setState] = useState<OfflineQueueState>({
    queue: [],
    processing: false,
    syncInProgress: false,
    lastSyncTime: null,
    failedItems: []
  });
  
  const isOnline = useOnlineStatus();

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('offline-queue');
    const savedFailedItems = localStorage.getItem('failed-queue-items');
    
    if (savedQueue) {
      try {
        const parsedQueue = JSON.parse(savedQueue);
        setState(prev => ({ 
          ...prev, 
          queue: parsedQueue,
          failedItems: savedFailedItems ? JSON.parse(savedFailedItems) : []
        }));
      } catch (error) {
        console.error('Failed to load offline queue:', error);
      }
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('offline-queue', JSON.stringify(state.queue));
    localStorage.setItem('failed-queue-items', JSON.stringify(state.failedItems));
  }, [state.queue, state.failedItems]);

  // Process queue when coming online
  useEffect(() => {
    if (isOnline && state.queue.length > 0 && !state.processing) {
      processQueue();
    }
  }, [isOnline, state.queue.length, state.processing]);

  const addToQueue = useCallback((item: Omit<QueueItem, 'id' | 'timestamp' | 'retries'>) => {
    const queueItem: QueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0
    };

    setState(prev => ({
      ...prev,
      queue: [...prev.queue, queueItem].sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
    }));

    console.log('Added to offline queue:', queueItem);
    
    if (!isOnline) {
      toast.info('Action queued for when you\'re back online');
    }

    return queueItem.id;
  }, [isOnline]);

  const removeFromQueue = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      queue: prev.queue.filter(item => item.id !== id)
    }));
  }, []);

  const moveToFailed = useCallback((item: QueueItem) => {
    setState(prev => ({
      ...prev,
      queue: prev.queue.filter(q => q.id !== item.id),
      failedItems: [...prev.failedItems, { ...item, retries: item.retries + 1 }]
    }));
  }, []);

  const retryFailedItem = useCallback((id: string) => {
    setState(prev => {
      const failedItem = prev.failedItems.find(item => item.id === id);
      if (!failedItem) return prev;

      return {
        ...prev,
        failedItems: prev.failedItems.filter(item => item.id !== id),
        queue: [...prev.queue, { ...failedItem, retries: 0 }]
      };
    });
  }, []);

  const clearFailedItems = useCallback(() => {
    setState(prev => ({ ...prev, failedItems: [] }));
    toast.success('Failed items cleared');
  }, []);

  const processQueue = useCallback(async () => {
    if (!isOnline || state.processing || state.queue.length === 0) {
      return;
    }

    setState(prev => ({ ...prev, processing: true, syncInProgress: true }));
    
    console.log('Processing offline queue:', state.queue.length, 'items');
    toast.info(`Syncing ${state.queue.length} pending actions...`);

    const maxRetries = 3;
    let processedCount = 0;
    let failedCount = 0;

    for (const item of state.queue) {
      try {
        await processQueueItem(item);
        removeFromQueue(item.id);
        processedCount++;
        
        // Small delay between items to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Failed to process queue item:', item, error);
        
        if (item.retries >= maxRetries) {
          moveToFailed(item);
          failedCount++;
        } else {
          // Retry with exponential backoff
          const updatedItem = { ...item, retries: item.retries + 1 };
          setState(prev => ({
            ...prev,
            queue: prev.queue.map(q => q.id === item.id ? updatedItem : q)
          }));
        }
      }
    }

    setState(prev => ({
      ...prev,
      processing: false,
      syncInProgress: false,
      lastSyncTime: new Date()
    }));

    if (processedCount > 0) {
      toast.success(`Successfully synced ${processedCount} actions`);
    }
    
    if (failedCount > 0) {
      toast.error(`${failedCount} actions failed to sync`);
    }

    console.log('Queue processing complete:', { processedCount, failedCount });
  }, [isOnline, state.processing, state.queue, removeFromQueue, moveToFailed]);

  const processQueueItem = async (item: QueueItem): Promise<void> => {
    switch (item.type) {
      case 'biometric':
        return processBiometricItem(item);
      case 'student':
        return processStudentItem(item);
      case 'batch':
        return processBatchItem(item);
      case 'sync':
        return processSyncItem(item);
      default:
        throw new Error(`Unknown queue item type: ${item.type}`);
    }
  };

  const processBiometricItem = async (item: QueueItem): Promise<void> => {
    // Implement biometric data sync
    console.log('Processing biometric item:', item);
    
    switch (item.action) {
      case 'capture':
        // Upload fingerprint data
        const response = await fetch('/api/biometric/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload biometric data: ${response.statusText}`);
        }
        break;
        
      default:
        throw new Error(`Unknown biometric action: ${item.action}`);
    }
  };

  const processStudentItem = async (item: QueueItem): Promise<void> => {
    // Implement student data sync
    console.log('Processing student item:', item);
    
    switch (item.action) {
      case 'create':
      case 'update':
      case 'delete':
        const method = item.action === 'create' ? 'POST' : 
                      item.action === 'update' ? 'PUT' : 'DELETE';
        
        const response = await fetch(`/api/students${item.action !== 'create' ? `/${item.data.id}` : ''}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to ${item.action} student: ${response.statusText}`);
        }
        break;
        
      default:
        throw new Error(`Unknown student action: ${item.action}`);
    }
  };

  const processBatchItem = async (item: QueueItem): Promise<void> => {
    // Implement batch data sync
    console.log('Processing batch item:', item);
    
    switch (item.action) {
      case 'create':
      case 'update':
      case 'delete':
        const method = item.action === 'create' ? 'POST' : 
                      item.action === 'update' ? 'PUT' : 'DELETE';
        
        const response = await fetch(`/api/batches${item.action !== 'create' ? `/${item.data.id}` : ''}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to ${item.action} batch: ${response.statusText}`);
        }
        break;
        
      default:
        throw new Error(`Unknown batch action: ${item.action}`);
    }
  };

  const processSyncItem = async (item: QueueItem): Promise<void> => {
    // Implement general sync operations
    console.log('Processing sync item:', item);
    
    switch (item.action) {
      case 'full_sync':
        // Trigger a full data synchronization
        const response = await fetch('/api/sync/full', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to perform full sync: ${response.statusText}`);
        }
        break;
        
      default:
        throw new Error(`Unknown sync action: ${item.action}`);
    }
  };

  const getQueueStats = useCallback(() => {
    return {
      total: state.queue.length,
      byType: state.queue.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: state.queue.reduce((acc, item) => {
        acc[item.priority] = (acc[item.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      failed: state.failedItems.length,
      processing: state.processing,
      lastSync: state.lastSyncTime
    };
  }, [state]);

  return {
    addToQueue,
    removeFromQueue,
    retryFailedItem,
    clearFailedItems,
    processQueue,
    getQueueStats,
    queue: state.queue,
    failedItems: state.failedItems,
    isProcessing: state.processing,
    isSyncing: state.syncInProgress,
    lastSyncTime: state.lastSyncTime
  };
}