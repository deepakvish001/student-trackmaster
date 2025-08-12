
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Batch } from "@/types";
import { useRealTimeBatchAccess } from "@/hooks/useRealTimeBatchAccess";
import { useGlobalRealTime } from "@/components/GlobalRealTimeProvider";

interface BatchSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function BatchSelector({ value, onChange, disabled = false }: BatchSelectorProps) {
  // Enable real-time updates
  useRealTimeBatchAccess();
  const { forceGlobalRefresh } = useGlobalRealTime();
  
  const { data: batches, isLoading } = useQuery({
    queryKey: ['restricted-batches-selector'],
    queryFn: async () => {
      // This will automatically respect user's batch access permissions
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('is_enabled', true)
        .order('batch_name');
      
      if (error) throw error;
      return data;
    },
    staleTime: 30000, // 30 seconds for instant updates
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return (
    <Select onValueChange={onChange} value={value} disabled={disabled || isLoading}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={isLoading ? "Loading batches..." : "Select batch"} />
      </SelectTrigger>
      <SelectContent>
        {batches?.map((batch) => (
          <SelectItem key={batch.id} value={batch.id.toString()}>
            {batch.batch_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
