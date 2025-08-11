import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Ultra-fast real-time hook for instant student data updates
 * Ensures View Students page updates immediately when CRUD operations occur
 */
export function useInstantStudentUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('🚀 Setting up INSTANT real-time student updates...');

    // Multiple channels for maximum coverage
    const channels = [
      // Primary students channel
      supabase
        .channel('instant-students-updates')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'students' },
          (payload) => {
            console.log('📡 INSTANT Student change detected:', payload);
            
            // Immediate query invalidation
            queryClient.invalidateQueries({ queryKey: ['students-optimized'] });
            queryClient.invalidateQueries({ queryKey: ['ultra-fast-students'] });
            queryClient.invalidateQueries({ queryKey: ['students-count'] });
            queryClient.invalidateQueries({ queryKey: ['students-list'] });
            queryClient.invalidateQueries({ queryKey: ['restricted-students'] });
            
            // Force immediate refetch for instant display
            queryClient.refetchQueries({ queryKey: ['students-optimized'] });
            queryClient.refetchQueries({ queryKey: ['ultra-fast-students'] });
            
            // Show toast notification for user feedback
            if (payload.eventType === 'INSERT') {
              toast.success('✅ New student added successfully!', { duration: 2000 });
            } else if (payload.eventType === 'UPDATE') {
              toast.success('✅ Student updated successfully!', { duration: 2000 });
            } else if (payload.eventType === 'DELETE') {
              toast.success('✅ Student deleted successfully!', { duration: 2000 });
            }
          }
        ),

      // Batches channel for related updates
      supabase
        .channel('instant-batches-updates')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'batches' },
          (payload) => {
            console.log('📡 INSTANT Batch change detected:', payload);
            
            // Invalidate all student-related queries since batch changes affect student display
            queryClient.invalidateQueries({ queryKey: ['students-optimized'] });
            queryClient.invalidateQueries({ queryKey: ['ultra-fast-students'] });
            queryClient.invalidateQueries({ queryKey: ['batches-optimized'] });
            queryClient.invalidateQueries({ queryKey: ['restricted-batches'] });
            
            // Force refetch for instant updates
            queryClient.refetchQueries({ queryKey: ['students-optimized'] });
            queryClient.refetchQueries({ queryKey: ['batches-optimized'] });
          }
        ),

      // Fingerprints channel for biometric updates
      supabase
        .channel('instant-fingerprints-updates')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'student_fingerprints' },
          (payload) => {
            console.log('📡 INSTANT Fingerprint change detected:', payload);
            
            // Update student queries to reflect biometric status changes
            queryClient.invalidateQueries({ queryKey: ['students-optimized'] });
            queryClient.invalidateQueries({ queryKey: ['ultra-fast-students'] });
            
            // Force refetch for instant biometric status updates
            queryClient.refetchQueries({ queryKey: ['students-optimized'] });
          }
        ),
    ];

    // Subscribe to all channels
    channels.forEach(channel => {
      channel.subscribe((status) => {
        console.log(`🔗 Real-time channel status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Instant updates active - View Students page will update automatically!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time channel error - attempting reconnection...');
          // Attempt to reconnect after a brief delay
          setTimeout(() => {
            channel.subscribe();
          }, 2000);
        }
      });
    });

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up instant student update subscriptions');
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [queryClient]);

  // Manual refresh function for fallback
  const forceRefresh = () => {
    console.log('🔄 Manual force refresh triggered');
    queryClient.invalidateQueries({ queryKey: ['students-optimized'] });
    queryClient.invalidateQueries({ queryKey: ['ultra-fast-students'] });
    queryClient.invalidateQueries({ queryKey: ['students-count'] });
    queryClient.refetchQueries({ queryKey: ['students-optimized'] });
    queryClient.refetchQueries({ queryKey: ['ultra-fast-students'] });
    toast.success('🔄 Data refreshed!', { duration: 1500 });
  };

  return {
    forceRefresh
  };
}