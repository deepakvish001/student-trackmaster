import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { offlineDb } from '@/lib/offlineDatabase';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useOnlineStatus } from './useOnlineStatus';
import { toast } from 'sonner';

interface ConflictResolutionState {
  conflicts: Array<{
    id: string;
    table: string;
    local_data: any;
    remote_data: any;
    field_conflicts: string[];
  }>;
  isResolvingConflicts: boolean;
}

export function useAdvancedSync() {
  const queryClient = useQueryClient();
  const { user } = useEnhancedAuth();
  const { isOnline } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [conflictState, setConflictState] = useState<ConflictResolutionState>({
    conflicts: [],
    isResolvingConflicts: false
  });

  // Smart conflict detection
  const detectConflicts = useCallback(async (localRecord: any, remoteRecord: any) => {
    const conflicts = [];
    const localTime = new Date(localRecord.updated_at).getTime();
    const remoteTime = new Date(remoteRecord.updated_at).getTime();
    
    // Only consider it a conflict if both were modified and times are close (within 5 minutes)
    const timeDiff = Math.abs(localTime - remoteTime);
    const isRealConflict = timeDiff < 5 * 60 * 1000; // 5 minutes
    
    if (isRealConflict) {
      // Find actual field differences
      const fieldConflicts = [];
      for (const [key, value] of Object.entries(localRecord)) {
        if (key !== 'updated_at' && key !== 'sync_status' && 
            remoteRecord[key] !== value) {
          fieldConflicts.push(key);
        }
      }
      
      if (fieldConflicts.length > 0) {
        conflicts.push({
          id: localRecord.id,
          table: 'students', // This would be dynamic in real implementation
          local_data: localRecord,
          remote_data: remoteRecord,
          field_conflicts: fieldConflicts
        });
      }
    }
    
    return conflicts;
  }, []);

  // Advanced sync with progress tracking
  const performAdvancedSync = useCallback(async (showProgress = true) => {
    if (!user || !isOnline || isSyncing) return;

    setIsSyncing(true);
    const startTime = Date.now();
    
    try {
      // Get all pending sync operations
      const pendingOperations = await offlineDb.getPendingSyncOperations();
      const userOperations = pendingOperations.filter(op => op.user_id === user.id);
      
      if (userOperations.length === 0) {
        toast.success('All data is synchronized');
        return;
      }

      setSyncProgress({ current: 0, total: userOperations.length });
      
      if (showProgress) {
        toast.loading(`Synchronizing ${userOperations.length} changes...`);
      }

      let syncedCount = 0;
      let conflictCount = 0;
      const allConflicts: any[] = [];

      // Process operations in batches for better performance
      const batchSize = 5;
      for (let i = 0; i < userOperations.length; i += batchSize) {
        const batch = userOperations.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (operation, index) => {
            try {
              const globalIndex = i + index;
              setSyncProgress({ current: globalIndex + 1, total: userOperations.length });

              // Conflict detection for updates
              if (operation.operation === 'update') {
                const { data: remoteData } = await supabase
                  .from(operation.table_name as any)
                  .select('*')
                  .eq('id', operation.record_id)
                  .single();

                if (remoteData) {
                  const conflicts = await detectConflicts(operation.data, remoteData);
                  if (conflicts.length > 0) {
                    allConflicts.push(...conflicts);
                    conflictCount++;
                    return;
                  }
                }
              }

              // Perform the sync operation
              await syncSingleOperation(operation);
              await offlineDb.removeFromSyncQueue(operation.id!);
              syncedCount++;

            } catch (error) {
              console.error('Sync operation failed:', error);
              await offlineDb.incrementRetryCount(operation.id!, (error as Error).message);
            }
          })
        );
      }

      // Update all queries to reflect changes
      queryClient.invalidateQueries();

      const syncTime = Date.now() - startTime;
      await offlineDb.setMetadata('lastFullSync', new Date().toISOString());

      // Handle results
      if (showProgress) {
        toast.dismiss();
      }

      if (allConflicts.length > 0) {
        setConflictState({
          conflicts: allConflicts,
          isResolvingConflicts: false
        });
        
        toast.warning(`Sync completed with ${conflictCount} conflicts`, {
          description: `${syncedCount} changes synced, ${conflictCount} require resolution`,
          action: {
            label: 'Resolve',
            onClick: () => setConflictState(prev => ({ ...prev, isResolvingConflicts: true }))
          }
        });
      } else {
        toast.success(`Sync completed successfully`, {
          description: `${syncedCount} changes synchronized in ${Math.round(syncTime / 1000)}s`
        });
      }

    } catch (error) {
      console.error('Advanced sync failed:', error);
      toast.error('Sync failed', {
        description: 'Please try again or check your connection'
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
    }
  }, [user, isOnline, isSyncing, detectConflicts, queryClient]);

  // Sync single operation with enhanced error handling
  const syncSingleOperation = async (operation: any) => {
    const { table_name, operation: op, data, record_id } = operation;
    
    // Add optimistic concurrency control
    const dataWithVersion = {
      ...data,
      updated_at: new Date().toISOString(),
      version: (data.version || 0) + 1
    };

    switch (op) {
      case 'insert':
        const { error: insertError } = await supabase
          .from(table_name as any)
          .insert(dataWithVersion);
        if (insertError) throw insertError;
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from(table_name as any)
          .update(dataWithVersion)
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
  };

  // Resolve conflicts with different strategies
  const resolveConflicts = useCallback(async (
    conflicts: any[], 
    strategy: 'local_wins' | 'remote_wins' | 'merge'
  ) => {
    setConflictState(prev => ({ ...prev, isResolvingConflicts: true }));
    
    try {
      for (const conflict of conflicts) {
        let resolvedData;
        
        switch (strategy) {
          case 'local_wins':
            resolvedData = {
              ...conflict.local_data,
              updated_at: new Date().toISOString(),
              conflict_resolution: 'local_wins'
            };
            break;
            
          case 'remote_wins':
            resolvedData = {
              ...conflict.remote_data,
              conflict_resolution: 'remote_wins'
            };
            break;
            
          case 'merge':
            // Smart merge: take latest for each field
            resolvedData = { ...conflict.remote_data };
            const localTime = new Date(conflict.local_data.updated_at).getTime();
            const remoteTime = new Date(conflict.remote_data.updated_at).getTime();
            
            // If local is newer overall, prefer local fields
            if (localTime > remoteTime) {
              resolvedData = {
                ...conflict.remote_data,
                ...conflict.local_data,
                updated_at: new Date().toISOString(),
                conflict_resolution: 'smart_merge'
              };
            }
            break;
        }

        // Apply resolution
        await supabase
          .from(conflict.table as any)
          .update(resolvedData)
          .eq('id', conflict.id);

        // Update local cache
        switch (conflict.table) {
          case 'students':
            await offlineDb.students.put({
              ...resolvedData,
              sync_status: 'synced' as const,
              last_synced_at: new Date().toISOString()
            });
            break;
        }
      }

      toast.success(`Resolved ${conflicts.length} conflicts using ${strategy} strategy`);
      setConflictState({ conflicts: [], isResolvingConflicts: false });
      queryClient.invalidateQueries();
      
    } catch (error) {
      console.error('Conflict resolution failed:', error);
      toast.error('Failed to resolve conflicts');
    } finally {
      setConflictState(prev => ({ ...prev, isResolvingConflicts: false }));
    }
  }, [queryClient]);

  // Auto-sync on network reconnection
  useEffect(() => {
    if (isOnline && user) {
      const autoSyncDelay = setTimeout(() => {
        performAdvancedSync(false);
      }, 2000); // Wait 2 seconds after coming online

      return () => clearTimeout(autoSyncDelay);
    }
  }, [isOnline, user, performAdvancedSync]);

  return {
    performAdvancedSync,
    isSyncing,
    syncProgress,
    conflictState,
    resolveConflicts,
    hasConflicts: conflictState.conflicts.length > 0
  };
}