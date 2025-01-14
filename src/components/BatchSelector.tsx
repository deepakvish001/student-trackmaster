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

interface BatchSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function BatchSelector({ value, onChange }: BatchSelectorProps) {
  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('is_enabled', true)
        .order('batch_name');
      
      if (error) throw error;
      return data as Batch[];
    },
  });

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select batch" />
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