import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Global real-time synchronization hook that ensures INSTANT updates
 * across all users and all operations throughout the entire application
 */
export function useGlobalRealTimeSync() {
  const queryClient = useQueryClient();

  const invalidateAllQueries = useCallback(() => {
    // Invalidate ALL student-related queries
    queryClient.invalidateQueries({ queryKey: ['students'] });
    queryClient.invalidateQueries({ queryKey: ['students-optimized'] });
    queryClient.invalidateQueries({ queryKey: ['ultra-fast-students'] });
    queryClient.invalidateQueries({ queryKey: ['students-count'] });
    queryClient.invalidateQueries({ queryKey: ['students-list'] });
    queryClient.invalidateQueries({ queryKey: ['restricted-students'] });
    queryClient.invalidateQueries({ queryKey: ['collaborative-students'] });
    queryClient.invalidateQueries({ queryKey: ['offline-students'] });
    
    // Invalidate ALL batch-related queries
    queryClient.invalidateQueries({ queryKey: ['batches'] });
    queryClient.invalidateQueries({ queryKey: ['batches-optimized'] });
    queryClient.invalidateQueries({ queryKey: ['ultra-fast-batches'] });
    queryClient.invalidateQueries({ queryKey: ['restricted-batches'] });
    queryClient.invalidateQueries({ queryKey: ['restricted-batches-selector'] });
    queryClient.invalidateQueries({ queryKey: ['offline-batches'] });
    
    // Invalidate fingerprint queries
    queryClient.invalidateQueries({ queryKey: ['student-fingerprints'] });
    queryClient.invalidateQueries({ queryKey: ['fingerprints'] });
    
    // Invalidate user and access queries
    queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    queryClient.invalidateQueries({ queryKey: ['user-batch-access'] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    
    // Invalidate dashboard and analytics
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['system-health'] });
    queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    queryClient.invalidateQueries({ queryKey: ['system-settings'] });
  }, [queryClient]);

  const forceRefreshCriticalData = useCallback(() => {
    // Force immediate refetch of critical data
    queryClient.refetchQueries({ queryKey: ['students-optimized'] });
    queryClient.refetchQueries({ queryKey: ['ultra-fast-students'] });
    queryClient.refetchQueries({ queryKey: ['batches-optimized'] });
    queryClient.refetchQueries({ queryKey: ['ultra-fast-batches'] });
    queryClient.refetchQueries({ queryKey: ['restricted-batches-selector'] });
    queryClient.refetchQueries({ queryKey: ['dashboard-stats'] });
  }, [queryClient]);

  useEffect(() => {
    console.log('🌐 GLOBAL: Initializing comprehensive real-time sync...');

    const channels = [
      // Students table - Primary data
      supabase
        .channel('global-students-sync')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'students' },
          (payload) => {
            console.log('🔄 GLOBAL: Student change detected:', payload);
            invalidateAllQueries();
            forceRefreshCriticalData();
            
            const eventType = payload.eventType;
            const studentName = (payload.new as any)?.student_name || (payload.old as any)?.student_name || 'Student';
            
            if (eventType === 'INSERT') {
              toast.success(`✅ ${studentName} added - Updated across all users!`, { duration: 3000 });
            } else if (eventType === 'UPDATE') {
              toast.success(`✅ ${studentName} updated - Synced globally!`, { duration: 3000 });
            } else if (eventType === 'DELETE') {
              toast.success(`✅ ${studentName} deleted - Removed globally!`, { duration: 3000 });
            }
          }
        ),

      // Batches table - Critical for access control
      supabase
        .channel('global-batches-sync')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'batches' },
          (payload) => {
            console.log('🔄 GLOBAL: Batch change detected:', payload);
            invalidateAllQueries();
            forceRefreshCriticalData();
            
            const eventType = payload.eventType;
            const batchName = (payload.new as any)?.batch_name || (payload.old as any)?.batch_name || 'Batch';
            
            if (eventType === 'INSERT') {
              toast.success(`📚 ${batchName} created - Available globally!`, { duration: 3000 });
            } else if (eventType === 'UPDATE') {
              toast.success(`📚 ${batchName} updated - Synced everywhere!`, { duration: 3000 });
            } else if (eventType === 'DELETE') {
              toast.success(`📚 ${batchName} deleted - Removed globally!`, { duration: 3000 });
            }
          }
        ),

      // Student fingerprints - Biometric data
      supabase
        .channel('global-fingerprints-sync')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'student_fingerprints' },
          (payload) => {
            console.log('🔄 GLOBAL: Fingerprint change detected:', payload);
            invalidateAllQueries();
            forceRefreshCriticalData();
            
            if (payload.eventType === 'INSERT') {
              toast.success('👆 Fingerprint captured - Updated globally!', { duration: 3000 });
            } else if (payload.eventType === 'UPDATE') {
              toast.success('👆 Fingerprint updated - Synced everywhere!', { duration: 3000 });
            }
          }
        ),

      // User profiles - User management
      supabase
        .channel('global-profiles-sync')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'user_profiles' },
          (payload) => {
            console.log('🔄 GLOBAL: User profile change detected:', payload);
            invalidateAllQueries();
            
            if (payload.eventType === 'INSERT') {
              toast.success('👤 New user added - Updated globally!', { duration: 3000 });
            } else if (payload.eventType === 'UPDATE') {
              toast.success('👤 User updated - Synced everywhere!', { duration: 3000 });
            }
          }
        ),

      // Batch access - Permissions
      supabase
        .channel('global-batch-access-sync')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'user_batch_access' },
          (payload) => {
            console.log('🔄 GLOBAL: Batch access change detected:', payload);
            invalidateAllQueries();
            forceRefreshCriticalData();
            
            if (payload.eventType === 'INSERT') {
              toast.success('🔑 Access granted - Updated globally!', { duration: 3000 });
            } else if (payload.eventType === 'DELETE') {
              toast.success('🔑 Access removed - Updated globally!', { duration: 3000 });
            }
          }
        ),

      // System settings - Configuration changes
      supabase
        .channel('global-settings-sync')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'system_settings' },
          (payload) => {
            console.log('🔄 GLOBAL: System settings change detected:', payload);
            invalidateAllQueries();
            
            toast.success('⚙️ Settings updated - Applied globally!', { duration: 3000 });
          }
        ),

      // Audit logs - Security monitoring
      supabase
        .channel('global-audit-sync')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'audit_logs' },
          (payload) => {
            console.log('🔄 GLOBAL: Audit log change detected:', payload);
            queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
          }
        ),
    ];

    // Subscribe to all channels with enhanced error handling
    channels.forEach((channel, index) => {
      channel.subscribe((status) => {
        console.log(`🔗 GLOBAL Channel ${index + 1} status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ GLOBAL Channel ${index + 1} active - Real-time sync enabled!`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ GLOBAL Channel ${index + 1} error - Attempting reconnection...`);
          // Auto-reconnect with exponential backoff
          setTimeout(() => {
            console.log(`🔄 GLOBAL Reconnecting channel ${index + 1}...`);
            channel.subscribe();
          }, Math.pow(2, index) * 1000); // Exponential backoff
        } else if (status === 'TIMED_OUT') {
          console.warn(`⏰ GLOBAL Channel ${index + 1} timed out - Reconnecting...`);
          setTimeout(() => channel.subscribe(), 2000);
        }
      });
    });

    // Initial notification
    toast.success('🌐 Global real-time sync activated!', { duration: 2000 });

    // Cleanup function
    return () => {
      console.log('🧹 GLOBAL: Cleaning up all real-time subscriptions');
      channels.forEach(channel => {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('Error removing channel:', error);
        }
      });
    };
  }, [queryClient, invalidateAllQueries, forceRefreshCriticalData]);

  // Manual refresh functions
  const forceGlobalRefresh = useCallback(() => {
    console.log('🔄 GLOBAL: Manual force refresh triggered');
    invalidateAllQueries();
    forceRefreshCriticalData();
    toast.success('🔄 Global data refreshed!', { duration: 2000 });
  }, [invalidateAllQueries, forceRefreshCriticalData]);

  const emergencySync = useCallback(() => {
    console.log('🚨 GLOBAL: Emergency sync triggered');
    queryClient.clear(); // Clear all cache
    invalidateAllQueries();
    forceRefreshCriticalData();
    toast.success('🚨 Emergency sync complete!', { duration: 3000 });
  }, [queryClient, invalidateAllQueries, forceRefreshCriticalData]);

  return {
    forceGlobalRefresh,
    emergencySync,
    invalidateAllQueries,
    forceRefreshCriticalData
  };
}