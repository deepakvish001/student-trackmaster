import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useRealTimeBatchAccess() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Subscribe to real-time changes in user_batch_access
    const channel = supabase
      .channel('batch-access-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_batch_access'
        },
        (payload) => {
          console.log('Batch access change detected:', payload);
          
          // Invalidate relevant queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['batches'] });
          queryClient.invalidateQueries({ queryKey: ['students'] });
          queryClient.invalidateQueries({ queryKey: ['user-batch-access'] });
          
          // Show notification based on the event type
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Batch Access Granted",
              description: "You now have access to a new batch",
            });
          } else if (payload.eventType === 'DELETE') {
            toast({
              title: "Batch Access Removed",
              description: "Your access to a batch has been removed",
              variant: "destructive"
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          console.log('Real-time batch access subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error');
          toast({
            title: "Connection Error",
            description: "Real-time updates may not work properly",
            variant: "destructive"
          });
        }
      });

    return () => {
      console.log('Cleaning up batch access subscription');
      supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
  }, [queryClient, toast]);

  return { isSubscribed };
}