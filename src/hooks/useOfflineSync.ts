import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { offlineDb, type SyncQueue } from '@/lib/offlineDatabase';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { toast } from 'sonner';
import { useOnlineStatus } from './useOnlineStatus';

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const { user } = useEnhancedAuth();
  const { isOnline, wasOffline } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Update pending count when data changes
  const updatePendingCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const pending = await offlineDb.getPendingSyncOperations();
      const userPending = pending.filter(p => p.user_id === user.id);
      setPendingCount(userPending.length);
    } catch (error) {
      console.error('Error getting pending count:', error);
    }
  }, [user]);

  // Sync a single item to Supabase
  const syncItem = async (item: SyncQueue): Promise<boolean> => {
    if (!user) return false;

    try {
      const { table_name, operation, data, record_id } = item;
      
      // Ensure user_id is set for the operation
      const dataWithUser = { ...data, user_id: user.id };

      switch (operation) {
        case 'insert':
          const { error: insertError } = await supabase
            .from(table_name as any)
            .insert(dataWithUser);
          
          if (insertError) throw insertError;
          break;

        case 'update':
          const { error: updateError } = await supabase
            .from(table_name as any)
            .update(dataWithUser)
            .eq('id', record_id);
          
          if (updateError) throw updateError;
          break;

        case 'delete':
          const { error: deleteError } = await supabase
            .from(table_name as any)
            .delete()
            .eq('id', record_id);
          
          if (deleteError) throw deleteError;
          break;
      }

      // Update local record to mark as synced
      switch (table_name) {
        case 'students':
          await offlineDb.students.where('id').equals(record_id).modify({
            sync_status: 'synced' as const
          });
          break;
        case 'batches':
          await offlineDb.batches.where('id').equals(record_id).modify({
            sync_status: 'synced' as const
          });
          break;
        case 'student_fingerprints':
          await offlineDb.student_fingerprints.where('id').equals(record_id).modify({
            sync_status: 'synced' as const
          });
          break;
        case 'user_profiles':
          await offlineDb.user_profiles.where('id').equals(record_id).modify({
            sync_status: 'synced' as const
          });
          break;
        case 'user_batch_access':
          await offlineDb.user_batch_access.where('id').equals(record_id).modify({
            sync_status: 'synced' as const
          });
          break;
      }

      return true;
    } catch (error) {
      console.error('Error syncing item:', error);
      await offlineDb.incrementRetryCount(item.id!, (error as Error).message);
      return false;
    }
  };

  // Main sync function
  const syncToSupabase = useCallback(async (showToast = true): Promise<void> => {
    if (!isOnline || !user || isSyncing) return;

    setIsSyncing(true);
    
    try {
      const pendingItems = await offlineDb.getPendingSyncOperations();
      const userPendingItems = pendingItems.filter(item => item.user_id === user.id);
      
      if (userPendingItems.length === 0) {
        if (showToast) {
          toast.success('All data is already synced!');
        }
        return;
      }

      if (showToast) {
        toast.loading(`Syncing ${userPendingItems.length} items...`);
      }

      let successCount = 0;
      let errorCount = 0;

      // Process items in batches to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < userPendingItems.length; i += batchSize) {
        const batch = userPendingItems.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (item) => {
            // Skip items that have failed too many times
            if (item.retry_count >= 3) {
              errorCount++;
              return;
            }

            const success = await syncItem(item);
            if (success) {
              await offlineDb.removeFromSyncQueue(item.id!);
              successCount++;
            } else {
              errorCount++;
            }
          })
        );
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries();
      
      setLastSyncTime(new Date().toISOString());
      await offlineDb.setMetadata('lastSyncTime', new Date().toISOString());

      if (showToast) {
        toast.dismiss();
        if (errorCount === 0) {
          toast.success(`Successfully synced ${successCount} items!`);
        } else {
          toast.warning(`Synced ${successCount} items, ${errorCount} failed`);
        }
      }

    } catch (error) {
      console.error('Sync error:', error);
      if (showToast) {
        toast.dismiss();
        toast.error('Sync failed. Please try again.');
      }
    } finally {
      setIsSyncing(false);
      await updatePendingCount();
    }
  }, [isOnline, user, isSyncing, queryClient, updatePendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && user) {
      console.log('Back online - auto-syncing...');
      syncToSupabase(false);
    }
  }, [isOnline, wasOffline, user, syncToSupabase]);

  // Update pending count on mount and when user changes
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  // Load last sync time on mount
  useEffect(() => {
    const loadLastSyncTime = async () => {
      try {
        const time = await offlineDb.getMetadata('lastSyncTime');
        setLastSyncTime(time);
      } catch (error) {
        console.error('Error loading last sync time:', error);
      }
    };
    
    loadLastSyncTime();
  }, []);

  return {
    syncToSupabase,
    isSyncing,
    pendingCount,
    lastSyncTime,
    updatePendingCount
  };
}