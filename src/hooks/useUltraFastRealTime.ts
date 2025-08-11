import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Ultra-fast real-time synchronization hook
 * Ensures ALL data operations are immediately reflected across the entire application
 */
export function useUltraFastRealTime() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Optimistic update helpers
  const optimisticUpdate = useCallback((queryKey: string[], updater: (oldData: any) => any) => {
    queryClient.setQueryData(queryKey, updater);
  }, [queryClient]);

  // Force immediate refresh of all related queries
  const forceRefresh = useCallback((tables: string[]) => {
    const queryPatterns = {
      students: [
        ['students-optimized'],
        ['students-list'],
        ['students-count'],
        ['ultra-fast-students'],
        ['restricted-students'],
        ['dashboard-stats'],
        ['ultra-fast-dashboard-stats']
      ],
      batches: [
        ['batches'],
        ['batches-optimized'],
        ['ultra-fast-batches'],
        ['ultra-fast-batches-minimal'],
        ['restricted-batches'],
        ['dashboard-stats'],
        ['ultra-fast-dashboard-stats']
      ],
      user_profiles: [
        ['admin-users'],
        ['ultra-fast-admin-users'],
        ['user-profile'],
        ['dashboard-stats']
      ],
      user_batch_access: [
        ['user-batch-access'],
        ['ultra-fast-batch-access'],
        ['restricted-batches'],
        ['restricted-students']
      ],
      system_settings: [
        ['system-settings'],
        ['ultra-fast-system-settings']
      ],
      audit_logs: [
        ['audit-logs'],
        ['ultra-fast-audit-logs'],
        ['ultra-fast-recent-activity']
      ]
    };

    tables.forEach(table => {
      const patterns = queryPatterns[table as keyof typeof queryPatterns];
      if (patterns) {
        patterns.forEach(pattern => {
          queryClient.invalidateQueries({ queryKey: pattern });
        });
      }
    });
  }, [queryClient]);

  useEffect(() => {
    console.log('🚀 Ultra-fast real-time system initializing...');

    // Students table - immediate updates
    const studentsChannel = supabase
      .channel('ultra-fast-students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
        console.log('⚡ Student change detected:', payload.eventType);
        
        // Immediate cache invalidation
        forceRefresh(['students']);
        
        // Show immediate feedback
        const eventMessages = {
          INSERT: 'Student added successfully',
          UPDATE: 'Student updated successfully', 
          DELETE: 'Student removed successfully'
        };
        
        toast({
          title: "Data Updated",
          description: eventMessages[payload.eventType as keyof typeof eventMessages] || "Data synchronized",
          duration: 2000
        });
      })
      .subscribe();

    // Batches table - immediate updates
    const batchesChannel = supabase
      .channel('ultra-fast-batches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, (payload) => {
        console.log('⚡ Batch change detected:', payload.eventType);
        
        forceRefresh(['batches', 'students']);
        
        const eventMessages = {
          INSERT: 'Batch created successfully',
          UPDATE: 'Batch updated successfully',
          DELETE: 'Batch removed successfully'
        };
        
        toast({
          title: "Batch Updated",
          description: eventMessages[payload.eventType as keyof typeof eventMessages] || "Batch synchronized",
          duration: 2000
        });
      })
      .subscribe();

    // User profiles - immediate updates
    const userProfilesChannel = supabase
      .channel('ultra-fast-user-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, (payload) => {
        console.log('⚡ User profile change detected:', payload.eventType);
        forceRefresh(['user_profiles']);
      })
      .subscribe();

    // User batch access - immediate updates
    const batchAccessChannel = supabase
      .channel('ultra-fast-batch-access')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_batch_access' }, (payload) => {
        console.log('⚡ Batch access change detected:', payload.eventType);
        forceRefresh(['user_batch_access', 'batches', 'students']);
        
        const eventMessages = {
          INSERT: 'Access granted',
          DELETE: 'Access revoked'
        };
        
        toast({
          title: "Access Updated",
          description: eventMessages[payload.eventType as keyof typeof eventMessages] || "Access synchronized",
          duration: 2000
        });
      })
      .subscribe();

    // System settings - immediate updates
    const systemSettingsChannel = supabase
      .channel('ultra-fast-system-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, (payload) => {
        console.log('⚡ System settings change detected:', payload.eventType);
        forceRefresh(['system_settings']);
      })
      .subscribe();

    // Audit logs - immediate updates
    const auditLogsChannel = supabase
      .channel('ultra-fast-audit-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
        console.log('⚡ New audit log detected');
        forceRefresh(['audit_logs']);
      })
      .subscribe();

    console.log('✅ Ultra-fast real-time system active - all changes will be immediate');

    // Cleanup
    return () => {
      console.log('🔄 Ultra-fast real-time system cleanup');
      [
        studentsChannel,
        batchesChannel, 
        userProfilesChannel,
        batchAccessChannel,
        systemSettingsChannel,
        auditLogsChannel
      ].forEach(channel => supabase.removeChannel(channel));
    };
  }, [forceRefresh, toast]);

  // Immediate cache refresh utility
  const refreshAll = useCallback(() => {
    console.log('🔄 Force refreshing all data...');
    forceRefresh(['students', 'batches', 'user_profiles', 'user_batch_access', 'system_settings', 'audit_logs']);
  }, [forceRefresh]);

  // Optimistic updates for immediate UI feedback
  const performOptimisticUpdate = useCallback((
    table: string,
    operation: 'add' | 'update' | 'delete',
    data: any,
    id?: string
  ) => {
    console.log(`🎯 Performing optimistic ${operation} on ${table}`);
    
    // Update relevant query caches immediately
    const queryPatterns = {
      students: ['students-optimized', 'ultra-fast-students'],
      batches: ['batches', 'ultra-fast-batches'],
    };

    const patterns = queryPatterns[table as keyof typeof queryPatterns];
    if (patterns) {
      patterns.forEach(pattern => {
        queryClient.setQueryData([pattern], (oldData: any) => {
          if (!oldData) return oldData;
          
          switch (operation) {
            case 'add':
              return Array.isArray(oldData) ? [data, ...oldData] : oldData;
            case 'update':
              return Array.isArray(oldData) 
                ? oldData.map((item: any) => item.id === id ? { ...item, ...data } : item)
                : oldData;
            case 'delete':
              return Array.isArray(oldData)
                ? oldData.filter((item: any) => item.id !== id)
                : oldData;
            default:
              return oldData;
          }
        });
      });
    }
  }, [queryClient]);

  return {
    refreshAll,
    optimisticUpdate,
    performOptimisticUpdate,
    forceRefresh
  };
}