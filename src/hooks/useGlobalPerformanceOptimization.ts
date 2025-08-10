import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Global performance optimization hook
 * Provides real-time subscriptions and cache management across the entire app
 */
export function useGlobalPerformanceOptimization() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('🚀 Initializing global performance optimization...');

    // Create channels for all critical tables
    const channels = [
      // Students real-time updates
      supabase
        .channel('students-global')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'students' },
          () => {
            console.log('📊 Students data changed - invalidating related queries');
            queryClient.invalidateQueries({ queryKey: ['students-list'] });
            queryClient.invalidateQueries({ queryKey: ['restricted-students'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          }
        ),

      // Batches real-time updates
      supabase
        .channel('batches-global')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'batches' },
          () => {
            console.log('🎓 Batches data changed - invalidating related queries');
            queryClient.invalidateQueries({ queryKey: ['batches'] });
            queryClient.invalidateQueries({ queryKey: ['restricted-batches'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          }
        ),

      // User profiles real-time updates
      supabase
        .channel('user-profiles-global')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'user_profiles' },
          () => {
            console.log('👤 User profiles changed - invalidating related queries');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['user-profile'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          }
        ),

      // Batch access real-time updates
      supabase
        .channel('batch-access-global')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'user_batch_access' },
          () => {
            console.log('🔐 Batch access changed - invalidating related queries');
            queryClient.invalidateQueries({ queryKey: ['restricted-batches'] });
            queryClient.invalidateQueries({ queryKey: ['restricted-students'] });
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          }
        ),

      // System settings real-time updates
      supabase
        .channel('system-settings-global')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'system_settings' },
          () => {
            console.log('⚙️ System settings changed - invalidating related queries');
            queryClient.invalidateQueries({ queryKey: ['system-settings'] });
          }
        ),

      // Audit logs real-time updates
      supabase
        .channel('audit-logs-global')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'audit_logs' },
          () => {
            console.log('📝 New audit log entry - invalidating audit queries');
            queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
          }
        ),
    ];

    // Subscribe to all channels
    channels.forEach(channel => channel.subscribe());

    console.log('✅ Global performance optimization active with real-time subscriptions');

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up global performance optimization...');
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [queryClient]);

  // Provide cache management utilities
  const optimizeCache = () => {
    console.log('🗄️ Optimizing cache...');
    
    // Remove stale queries older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    queryClient.getQueryCache().getAll().forEach(query => {
      if (query.state.dataUpdatedAt < oneHourAgo) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
    
    console.log('✅ Cache optimization completed');
  };

  const prefetchCriticalData = async () => {
    console.log('⚡ Prefetching critical data...');
    
    // Prefetch commonly accessed data
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['dashboard-stats'],
        staleTime: Infinity,
      }),
      queryClient.prefetchQuery({
        queryKey: ['restricted-batches'],
        staleTime: Infinity,
      }),
      queryClient.prefetchQuery({
        queryKey: ['user-profile'],
        staleTime: Infinity,
      }),
    ]);
    
    console.log('✅ Critical data prefetch completed');
  };

  return {
    optimizeCache,
    prefetchCriticalData,
  };
}