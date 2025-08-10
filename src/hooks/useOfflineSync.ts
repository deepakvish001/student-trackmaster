import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { offlineStorage } from '@/services/offlineStorageService';
import { useNetworkStatus } from './useNetworkStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncStatus {
  isInitialized: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  syncErrors: string[];
}

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isInitialized: false,
    isSyncing: false,
    lastSyncTime: null,
    pendingOperations: 0,
    syncErrors: []
  });

  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();

  // Initialize offline storage on first load
  const initializeOfflineStorage = useCallback(async () => {
    try {
      await offlineStorage.initialize();
      
      const storageInfo = await offlineStorage.getStorageInfo();
      setSyncStatus(prev => ({
        ...prev,
        isInitialized: true,
        pendingOperations: storageInfo.pendingOperations
      }));

      console.log('📱 Offline storage initialized:', storageInfo);
    } catch (error) {
      console.error('❌ Failed to initialize offline storage:', error);
      setSyncStatus(prev => ({
        ...prev,
        syncErrors: [...prev.syncErrors, 'Failed to initialize offline storage']
      }));
    }
  }, []);

  // Sync data when coming back online
  const syncData = useCallback(async () => {
    if (!isOnline || !syncStatus.isInitialized) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncErrors: [] }));

    try {
      console.log('🔄 Starting offline data sync...');

      // Get pending operations
      const pendingOps = await offlineStorage.getPendingOperations();
      
      if (pendingOps.length === 0) {
        console.log('✅ No pending operations to sync');
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: new Date(),
          pendingOperations: 0
        }));
        return;
      }

      console.log(`🔄 Syncing ${pendingOps.length} pending operations...`);

      let successCount = 0;
      const errors: string[] = [];

      // Process each pending operation
      for (const operation of pendingOps) {
        try {
          await processPendingOperation(operation);
          await offlineStorage.removePendingOperation(operation.id);
          successCount++;
        } catch (error) {
          console.error('❌ Failed to sync operation:', operation.id, error);
          errors.push(`Failed to sync ${operation.type} ${operation.entity}: ${error}`);
        }
      }

      // Update sync status
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        pendingOperations: pendingOps.length - successCount,
        syncErrors: errors
      }));

      // Show sync results
      if (successCount > 0) {
        toast.success(`✅ Synced ${successCount} operations successfully`);
        
        // Invalidate queries to refresh UI with latest data
        queryClient.invalidateQueries({ queryKey: ['students'] });
        queryClient.invalidateQueries({ queryKey: ['batches'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }

      if (errors.length > 0) {
        toast.error(`❌ ${errors.length} operations failed to sync`);
      }

    } catch (error) {
      console.error('❌ Sync process failed:', error);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncErrors: [...prev.syncErrors, `Sync failed: ${error}`]
      }));
      toast.error('❌ Sync failed - will retry when connection improves');
    }
  }, [isOnline, syncStatus.isInitialized, queryClient]);

  // Process a single pending operation
  const processPendingOperation = async (operation: any) => {
    const { method, url, headers, body } = operation;

    // Create the request
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ Successfully synced operation:', operation.id);
    return response.json();
  };

  // Queue an operation for offline sync
  const queueOperation = useCallback(async (
    type: 'create' | 'update' | 'delete',
    entity: 'student' | 'batch' | 'fingerprint',
    data: any,
    apiPath: string,
    method: string = 'POST'
  ) => {
    if (!syncStatus.isInitialized) return;

    const operation = {
      id: `${type}_${entity}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      entity,
      data,
      url: `${window.location.origin}/api${apiPath}`,
      method,
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: method !== 'DELETE' ? data : undefined,
      created_at: Date.now()
    };

    await offlineStorage.addPendingOperation(operation);
    
    setSyncStatus(prev => ({
      ...prev,
      pendingOperations: prev.pendingOperations + 1
    }));

    console.log('📝 Queued operation for sync:', operation.type, operation.entity);

    // Try to sync immediately if online
    if (isOnline) {
      setTimeout(() => syncData(), 1000);
    }
  }, [syncStatus.isInitialized, isOnline, syncData]);

  // Cache data for offline access
  const cacheData = useCallback(async (
    entity: 'students' | 'batches' | 'fingerprints',
    data: any[]
  ) => {
    if (!syncStatus.isInitialized) return;

    try {
      await offlineStorage.bulkPut(entity, data);
      await offlineStorage.setLastSyncTime(entity, Date.now());
      console.log(`📦 Cached ${data.length} ${entity} records`);
    } catch (error) {
      console.error(`❌ Failed to cache ${entity}:`, error);
    }
  }, [syncStatus.isInitialized]);

  // Get cached data
  const getCachedData = useCallback(async (
    entity: 'students' | 'batches' | 'fingerprints'
  ) => {
    if (!syncStatus.isInitialized) return [];

    try {
      return await offlineStorage.getAll(entity);
    } catch (error) {
      console.error(`❌ Failed to get cached ${entity}:`, error);
      return [];
    }
  }, [syncStatus.isInitialized]);

  // Clear all offline data
  const clearOfflineData = useCallback(async () => {
    if (!syncStatus.isInitialized) return;

    try {
      await offlineStorage.clearAllData();
      setSyncStatus(prev => ({
        ...prev,
        pendingOperations: 0,
        syncErrors: []
      }));
      toast.success('🗑️ Cleared all offline data');
    } catch (error) {
      console.error('❌ Failed to clear offline data:', error);
      toast.error('❌ Failed to clear offline data');
    }
  }, [syncStatus.isInitialized]);

  // Initialize on mount
  useEffect(() => {
    initializeOfflineStorage();
  }, [initializeOfflineStorage]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && syncStatus.isInitialized && syncStatus.pendingOperations > 0) {
      console.log('🌐 Connection restored, starting auto-sync...');
      setTimeout(() => syncData(), 2000); // Small delay to ensure connection is stable
    }
  }, [isOnline, syncStatus.isInitialized, syncStatus.pendingOperations, syncData]);

  return {
    syncStatus,
    syncData,
    queueOperation,
    cacheData,
    getCachedData,
    clearOfflineData,
    isOfflineCapable: syncStatus.isInitialized
  };
}