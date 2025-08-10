import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBatchLimits(userId?: string) {
  return useQuery({
    queryKey: ['batch-limits', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const [profileResult, batchesResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('max_batches_allowed')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('batches')
          .select('id')
          .eq('user_id', userId)
          .eq('is_enabled', true)
      ]);

      if (profileResult.error) throw profileResult.error;
      if (batchesResult.error) throw batchesResult.error;

      return {
        maxAllowed: profileResult.data.max_batches_allowed,
        currentCount: batchesResult.data.length,
        canCreateMore: batchesResult.data.length < profileResult.data.max_batches_allowed
      };
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}