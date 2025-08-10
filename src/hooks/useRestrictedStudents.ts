import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Student } from "@/types";

export function useRestrictedStudents() {
  return useQuery({
    queryKey: ['restricted-students'],
    queryFn: async () => {
      console.log('Fetching accessible students for current user...');
      
      // This query will automatically respect RLS policies
      // Users will only see students in batches they have access to
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          batches (
            batch_name
          )
        `)
        .eq('is_enabled', true)
        .order('student_name');
      
      if (error) {
        console.error('Error fetching accessible students:', error);
        throw error;
      }
      
      console.log('Accessible students:', data);
      return data as Student[];
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}