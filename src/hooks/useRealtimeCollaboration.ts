import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { offlineDb } from '@/lib/offlineDatabase';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useOnlineStatus } from './useOnlineStatus';
import { toast } from 'sonner';

interface CollaborationEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: any;
  user_id: string;
  timestamp: string;
}

interface ActiveUser {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  last_seen: string;
  current_table?: string;
  current_record_id?: string;
}

export function useRealtimeCollaboration() {
  const queryClient = useQueryClient();
  const { user } = useEnhancedAuth();
  const { isOnline } = useOnlineStatus();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [recentCollaborationEvents, setRecentCollaborationEvents] = useState<CollaborationEvent[]>([]);

  // Conflict resolution based on timestamp
  const resolveConflict = useCallback(async (
    localRecord: any,
    remoteRecord: any,
    tableName: string
  ) => {
    const localTimestamp = new Date(localRecord.updated_at).getTime();
    const remoteTimestamp = new Date(remoteRecord.updated_at).getTime();
    
    console.log('🔄 Resolving conflict for', tableName, {
      local: localTimestamp,
      remote: remoteTimestamp,
      strategy: remoteTimestamp > localTimestamp ? 'remote_wins' : 'local_wins'
    });

    // Latest timestamp wins
    if (remoteTimestamp > localTimestamp) {
      // Remote wins - update local
      const updatedRecord = {
        ...remoteRecord,
        sync_status: 'synced' as const,
        last_synced_at: new Date().toISOString(),
        conflict_resolution: 'remote_wins' as const,
        version: (localRecord.version || 0) + 1
      };

      switch (tableName) {
        case 'students':
          await offlineDb.students.put(updatedRecord);
          break;
        case 'batches':
          await offlineDb.batches.put(updatedRecord);
          break;
        case 'student_fingerprints':
          await offlineDb.student_fingerprints.put(updatedRecord);
          break;
      }

      toast.info(`Record updated by another user in ${tableName}`, {
        description: 'Remote changes have been applied locally',
        duration: 3000
      });

      return 'remote_wins';
    } else {
      // Local wins - mark for sync
      await offlineDb.addToSyncQueue(
        tableName,
        localRecord.id,
        'update',
        localRecord,
        user?.id || ''
      );

      toast.warning(`Conflict detected in ${tableName}`, {
        description: 'Your local changes will be synced',
        duration: 3000
      });

      return 'local_wins';
    }
  }, [user]);

  // Handle real-time updates from other users
  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    if (!user || !isOnline) return;

    const { eventType, new: newRecord, old: oldRecord, schema, table } = payload;
    
    // Skip if this event was triggered by current user
    if (newRecord?.user_id === user.id || oldRecord?.user_id === user.id) {
      return;
    }

    console.log('👥 Collaboration event:', { eventType, table, user_id: newRecord?.user_id || oldRecord?.user_id });

    // Track collaboration event
    const collaborationEvent: CollaborationEvent = {
      type: eventType,
      table,
      record: newRecord || oldRecord,
      user_id: newRecord?.user_id || oldRecord?.user_id || 'unknown',
      timestamp: new Date().toISOString()
    };

    setRecentCollaborationEvents(prev => [collaborationEvent, ...prev.slice(0, 9)]);

    try {
      switch (eventType) {
        case 'INSERT':
          // Add new record to local cache
          const insertRecord = {
            ...newRecord,
            sync_status: 'synced' as const,
            last_synced_at: new Date().toISOString(),
            version: 1
          };

          switch (table) {
            case 'students':
              await offlineDb.students.put(insertRecord);
              queryClient.invalidateQueries({ queryKey: ['students'] });
              queryClient.invalidateQueries({ queryKey: ['offline-students'] });
              break;
            case 'batches':
              await offlineDb.batches.put(insertRecord);
              queryClient.invalidateQueries({ queryKey: ['batches'] });
              queryClient.invalidateQueries({ queryKey: ['offline-batches'] });
              break;
            case 'student_fingerprints':
              await offlineDb.student_fingerprints.put(insertRecord);
              queryClient.invalidateQueries({ queryKey: ['fingerprints'] });
              break;
          }

          toast.success(`New ${table.slice(0, -1)} added by collaborator`, {
            duration: 2000
          });
          break;

        case 'UPDATE':
          // Check for conflicts
          let localRecord;
          switch (table) {
            case 'students':
              localRecord = await offlineDb.students.where('id').equals(newRecord.id).first();
              break;
            case 'batches':
              localRecord = await offlineDb.batches.where('id').equals(newRecord.id).first();
              break;
            case 'student_fingerprints':
              localRecord = await offlineDb.student_fingerprints.where('id').equals(newRecord.id).first();
              break;
          }

          if (localRecord && localRecord.sync_status === 'pending') {
            // Conflict detected
            await resolveConflict(localRecord, newRecord, table);
          } else {
            // No conflict, apply update
            const updateRecord = {
              ...newRecord,
              sync_status: 'synced' as const,
              last_synced_at: new Date().toISOString(),
              version: (localRecord?.version || 0) + 1
            };

            switch (table) {
              case 'students':
                await offlineDb.students.put(updateRecord);
                queryClient.invalidateQueries({ queryKey: ['students'] });
                queryClient.invalidateQueries({ queryKey: ['offline-students'] });
                break;
              case 'batches':
                await offlineDb.batches.put(updateRecord);
                queryClient.invalidateQueries({ queryKey: ['batches'] });
                queryClient.invalidateQueries({ queryKey: ['offline-batches'] });
                break;
              case 'student_fingerprints':
                await offlineDb.student_fingerprints.put(updateRecord);
                queryClient.invalidateQueries({ queryKey: ['fingerprints'] });
                break;
            }

            toast.info(`${table.slice(0, -1)} updated by collaborator`, {
              duration: 2000
            });
          }
          break;

        case 'DELETE':
          // Remove from local cache
          switch (table) {
            case 'students':
              await offlineDb.students.where('id').equals(oldRecord.id).delete();
              queryClient.invalidateQueries({ queryKey: ['students'] });
              queryClient.invalidateQueries({ queryKey: ['offline-students'] });
              break;
            case 'batches':
              await offlineDb.batches.where('id').equals(oldRecord.id).delete();
              queryClient.invalidateQueries({ queryKey: ['batches'] });
              queryClient.invalidateQueries({ queryKey: ['offline-batches'] });
              break;
            case 'student_fingerprints':
              await offlineDb.student_fingerprints.where('id').equals(oldRecord.id).delete();
              queryClient.invalidateQueries({ queryKey: ['fingerprints'] });
              break;
          }

          toast.warning(`${table.slice(0, -1)} deleted by collaborator`, {
            duration: 2000
          });
          break;
      }
    } catch (error) {
      console.error('Error handling real-time update:', error);
      toast.error('Failed to sync collaborative change', {
        description: 'Please refresh to get latest data',
        duration: 3000
      });
    }
  }, [user, isOnline, resolveConflict, queryClient]);

  // Set up real-time subscriptions for collaboration
  useEffect(() => {
    if (!user || !isOnline) return;

    console.log('🚀 Setting up real-time collaboration...');

    const channels = [
      // Students collaboration
      supabase
        .channel('students-collaboration')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'students' }, 
          handleRealtimeUpdate
        )
        .subscribe(),

      // Batches collaboration  
      supabase
        .channel('batches-collaboration')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'batches' },
          handleRealtimeUpdate
        )
        .subscribe(),

      // Fingerprints collaboration
      supabase
        .channel('fingerprints-collaboration')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'student_fingerprints' },
          handleRealtimeUpdate
        )
        .subscribe(),
    ];

    return () => {
      console.log('🔄 Cleaning up collaboration channels');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, isOnline, handleRealtimeUpdate]);

  // Presence tracking for active users
  useEffect(() => {
    if (!user || !isOnline) return;

    const presenceChannel = supabase.channel('user-presence');

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users: ActiveUser[] = [];
        
        Object.keys(state).forEach(userId => {
          const presence = state[userId][0] as any;
          if (presence && userId !== user.id) {
            users.push({
              user_id: userId,
              full_name: presence.full_name || 'Unknown User',
              avatar_url: presence.avatar_url,
              last_seen: presence.last_seen,
              current_table: presence.current_table,
              current_record_id: presence.current_record_id
            });
          }
        });
        
        setActiveUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('👋 User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('👋 User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email,
            avatar_url: user.user_metadata?.avatar_url,
            last_seen: new Date().toISOString(),
            current_table: 'dashboard',
            current_record_id: null
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user, isOnline]);

  const updatePresence = useCallback(async (currentTable?: string, currentRecordId?: string) => {
    if (!user || !isOnline) return;

    const presenceChannel = supabase.channel('user-presence');
    await presenceChannel.track({
      user_id: user.id,
      full_name: user.user_metadata?.full_name || user.email,
      avatar_url: user.user_metadata?.avatar_url,
      last_seen: new Date().toISOString(),
      current_table: currentTable,
      current_record_id: currentRecordId
    });
  }, [user, isOnline]);

  return {
    activeUsers,
    recentCollaborationEvents,
    updatePresence,
    resolveConflict
  };
}