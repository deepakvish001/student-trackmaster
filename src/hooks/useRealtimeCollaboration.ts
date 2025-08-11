import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { offlineDb, type SyncQueue, type RealtimeEvent } from '@/lib/offlineDatabase';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { toast } from 'sonner';
import { useOnlineStatus } from './useOnlineStatus';

interface CollaborationState {
  activeUsers: Set<string>;
  currentOperations: Map<string, any>;
  conflicts: any[];
  lastRealtimeEvent: RealtimeEvent | null;
}

export function useRealtimeCollaboration() {
  const queryClient = useQueryClient();
  const { user } = useEnhancedAuth();
  const { isOnline } = useOnlineStatus();
  const [collaborationState, setCollaborationState] = useState<CollaborationState>({
    activeUsers: new Set(),
    currentOperations: new Map(),
    conflicts: [],
    lastRealtimeEvent: null
  });

  // Handle real-time events from Supabase
  const handleRealtimeEvent = useCallback(async (payload: any) => {
    if (!user || !isOnline) return;

    const { eventType, table, new: newRecord, old: oldRecord } = payload;
    
    console.log('🔴 Real-time event received:', { eventType, table, newRecord, oldRecord });

    const realtimeEvent: RealtimeEvent = {
      id: crypto.randomUUID(),
      table,
      event_type: eventType,
      old_record: oldRecord,
      new_record: newRecord,
      timestamp: new Date().toISOString(),
      user_id: newRecord?.user_id || oldRecord?.user_id || 'unknown'
    };

    // Don't process events from the current user to avoid loops
    if (realtimeEvent.user_id === user.id) {
      console.log('🟡 Skipping own real-time event');
      return;
    }

    try {
      // Update local IndexedDB with real-time changes
      await updateLocalDataFromRealtime(realtimeEvent);
      
      // Update collaboration state
      setCollaborationState(prev => ({
        ...prev,
        lastRealtimeEvent: realtimeEvent,
        activeUsers: new Set([...prev.activeUsers, realtimeEvent.user_id])
      }));

      // Invalidate relevant queries to update UI
      queryClient.invalidateQueries({ queryKey: [table] });

      // Show collaboration notification
      if (realtimeEvent.user_id !== user.id) {
        const action = eventType.toLowerCase();
        const recordName = newRecord?.student_name || newRecord?.batch_name || 'record';
        toast.info(`Another user ${action}d ${recordName}`, {
          description: 'Data has been updated in real-time',
          duration: 3000,
        });
      }

    } catch (error) {
      console.error('Error handling real-time event:', error);
      toast.error('Failed to sync real-time update');
    }
  }, [user, isOnline, queryClient]);

  // Update IndexedDB with real-time data
  const updateLocalDataFromRealtime = async (event: RealtimeEvent) => {
    const { table, event_type, new_record, old_record } = event;

    switch (event_type) {
      case 'INSERT':
        if (new_record) {
          const recordWithSync = {
            ...new_record,
            sync_status: 'synced' as const,
            last_synced_at: new Date().toISOString(),
            last_sync_attempt: null,
            sync_retries: 0
          };

          if (table === 'students') {
            await offlineDb.students.put(recordWithSync);
          } else if (table === 'batches') {
            await offlineDb.batches.put(recordWithSync);
          }
        }
        break;

      case 'UPDATE':
        if (new_record) {
          // Check for conflicts with local pending changes
          const localRecord = table === 'students' 
            ? await offlineDb.students.get(new_record.id)
            : await offlineDb.batches.get(new_record.id);

          if (localRecord?.sync_status === 'pending') {
            // Conflict detected - apply conflict resolution
            await resolveConflict(table, localRecord, new_record);
          } else {
            // No conflict - apply remote update
            const recordWithSync = {
              ...new_record,
              sync_status: 'synced' as const,
              last_synced_at: new Date().toISOString(),
              last_sync_attempt: null,
              sync_retries: 0
            };

            if (table === 'students') {
              await offlineDb.students.put(recordWithSync);
            } else if (table === 'batches') {
              await offlineDb.batches.put(recordWithSync);
            }
          }
        }
        break;

      case 'DELETE':
        if (old_record) {
          if (table === 'students') {
            await offlineDb.students.delete(old_record.id);
          } else if (table === 'batches') {
            await offlineDb.batches.delete(old_record.id);
          }
        }
        break;
    }
  };

  // Resolve conflicts using \"latest timestamp wins\" strategy
  const resolveConflict = async (table: string, localRecord: any, remoteRecord: any) => {
    console.log('🔄 Resolving conflict for', table, localRecord.id);

    const localTimestamp = new Date(localRecord.updated_at).getTime();
    const remoteTimestamp = new Date(remoteRecord.updated_at).getTime();

    let resolvedRecord;
    let resolution: 'local_wins' | 'remote_wins';

    if (localTimestamp > remoteTimestamp) {
      // Local version is newer - keep local changes
      resolvedRecord = {
        ...localRecord,
        conflict_resolution: 'local_wins' as const,
        remote_updated_at: remoteRecord.updated_at
      };
      resolution = 'local_wins';
    } else {
      // Remote version is newer - accept remote changes
      resolvedRecord = {
        ...remoteRecord,
        sync_status: 'synced' as const,
        last_synced_at: new Date().toISOString(),
        conflict_resolution: 'remote_wins' as const
      };
      resolution = 'remote_wins';
    }

    // Update local record with resolution
    if (table === 'students') {
      await offlineDb.students.put(resolvedRecord);
    } else if (table === 'batches') {
      await offlineDb.batches.put(resolvedRecord);
    }

    // Log conflict resolution
    console.log(`✅ Conflict resolved: ${resolution} for ${table}:${localRecord.id}`);
    
    toast.info(`Conflict resolved: ${resolution.replace('_', ' ')}`, {
      description: `Updated ${table.slice(0, -1)} with ${resolution === 'local_wins' ? 'your' : 'remote'} changes`,
      duration: 5000,
    });

    // Update collaboration state
    setCollaborationState(prev => ({
      ...prev,
      conflicts: [...prev.conflicts, {
        id: crypto.randomUUID(),
        table,
        record_id: localRecord.id,
        resolution,
        local_timestamp: localRecord.updated_at,
        remote_timestamp: remoteRecord.updated_at,
        resolved_at: new Date().toISOString()
      }]
    }));
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !isOnline) return;

    console.log('🟢 Setting up real-time subscriptions');

    // Subscribe to students table
    const studentsChannel = supabase
      .channel('students-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        handleRealtimeEvent
      )
      .subscribe();

    // Subscribe to batches table
    const batchesChannel = supabase
      .channel('batches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batches'
        },
        handleRealtimeEvent
      )
      .subscribe();

    // Subscribe to user presence
    const presenceChannel = supabase
      .channel('collaboration-presence')
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();
        const activeUserIds = new Set<string>();
        
        Object.values(newState).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id !== user.id) {
              activeUserIds.add(presence.user_id);
            }
          });
        });

        setCollaborationState(prev => ({
          ...prev,
          activeUsers: activeUserIds
        }));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user presence
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      console.log('🔴 Cleaning up real-time subscriptions');
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(batchesChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user, isOnline, handleRealtimeEvent]);

  // Clear stale active users periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCollaborationState(prev => ({
        ...prev,
        activeUsers: new Set() // Reset active users - they'll be repopulated by presence
      }));
    }, 60000); // Clear every minute

    return () => clearInterval(interval);
  }, []);

  return {
    collaborationState,
    activeUsers: Array.from(collaborationState.activeUsers),
    conflictCount: collaborationState.conflicts.length,
    lastRealtimeEvent: collaborationState.lastRealtimeEvent,
    conflicts: collaborationState.conflicts
  };
}
