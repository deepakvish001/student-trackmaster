import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Batch } from "@/types";

export function useRestrictedBatches() {
  return useQuery({
    queryKey: ['restricted-batches'],
    queryFn: async () => {
      console.log('Fetching accessible batches for current user...');
      
      // This query will automatically respect RLS policies
      // Users will only see batches they have access to
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('is_enabled', true)
        .order('batch_name');
      
      if (error) {
        console.error('Error fetching accessible batches:', error);
        throw error;
      }
      
      console.log('Accessible batches:', data);
      return data as Batch[];
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}