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
  const [syncProgress, setSyncProgress] = useState({ completed: 0, total: 0 });

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

  // Enhanced sync with conflict detection and resolution
  const syncItem = async (item: SyncQueue): Promise<boolean> => {
    if (!user) return false;

    try {
      const { table_name, operation, data, record_id } = item;
      
      // Ensure user_id is set for the operation
      const dataWithUser = { ...data, user_id: user.id };

      switch (operation) {
        case 'insert':
          // Check if record already exists (could have been created by another user)
          const { data: existing } = await supabase
            .from(table_name as any)
            .select('id, updated_at')
            .eq('id', record_id)
            .single();

          if (existing) {
            // Record exists - convert to update
            console.log(`🔄 Converting insert to update for ${table_name}:${record_id}`);
            const { error: updateError } = await supabase
              .from(table_name as any)
              .update({ 
                ...dataWithUser, 
                updated_at: new Date().toISOString() 
              })
              .eq('id', record_id);
            
            if (updateError) throw updateError;
          } else {
            // Normal insert
            const { error: insertError } = await supabase
              .from(table_name as any)
              .insert(dataWithUser);
            
            if (insertError) throw insertError;
          }
          break;

        case 'update':
          // Get current remote version for conflict detection
          const { data: remoteData } = await supabase
            .from(table_name as any)
            .select('updated_at')
            .eq('id', record_id)
            .single();

          if (remoteData) {
            const localTimestamp = new Date(data.updated_at).getTime();
            const remoteTimestamp = new Date(remoteData.updated_at).getTime();

            if (remoteTimestamp > localTimestamp) {
              // Remote is newer - potential conflict
              console.log(`⚠️ Conflict detected for ${table_name}:${record_id}`);
              
              // Mark sync queue item with conflict
              await offlineDb.syncQueue.update(item.id, {
                conflict_detected: true,
                remote_version: remoteData
              });

              toast.warning('Data conflict detected', {
                description: 'Remote version is newer. Using latest timestamp strategy.',
                duration: 5000,
              });

              // Don't update - let the conflict resolution handle it
              return false;
            }
          }

          const { error: updateError } = await supabase
            .from(table_name as any)
            .update({ 
              ...dataWithUser, 
              updated_at: new Date().toISOString() 
            })
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

      // Update local record sync status
      await updateLocalRecordSyncStatus(table_name, record_id, 'synced');
      
      console.log(`✅ Synced ${operation} for ${table_name}:${record_id}`);
      return true;

    } catch (error: any) {
      console.error(`❌ Sync failed for ${item.table_name}:${item.record_id}:`, error);
      
      // Update retry count
      await offlineDb.syncQueue.update(item.id, {
        retry_count: item.retry_count + 1,
        last_error: error.message
      });

      // Mark local record with error
      await updateLocalRecordSyncStatus(item.table_name, item.record_id, 'error');
      
      return false;
    }
  };
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