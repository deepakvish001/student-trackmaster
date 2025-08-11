import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUltraFastRealTime } from './useUltraFastRealTime';

/**
 * Optimistic mutations hook for ultra-fast UI updates
 * Provides immediate feedback while operations are in progress
 */
export function useOptimisticMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { performOptimisticUpdate, forceRefresh } = useUltraFastRealTime();

  // Student operations
  const createStudent = useMutation({
    mutationFn: async (studentData: any) => {
      const { data, error } = await supabase
        .from('students')
        .insert([studentData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async (newStudent) => {
      // Optimistic update - show immediately
      const tempId = `temp-${Date.now()}`;
      performOptimisticUpdate('students', 'add', { ...newStudent, id: tempId });
      
      return { tempId };
    },
    onSuccess: (data, variables, context) => {
      // Replace temp data with real data
      forceRefresh(['students']);
      toast({
        title: "Success",
        description: "Student added successfully",
        duration: 2000
      });
    },
    onError: (error, variables, context) => {
      // Remove optimistic update on error
      forceRefresh(['students']);
      toast({
        title: "Error",
        description: "Failed to add student",
        variant: "destructive"
      });
    }
  });

  const updateStudent = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      // Optimistic update
      performOptimisticUpdate('students', 'update', updates, id);
    },
    onSuccess: () => {
      forceRefresh(['students']);
      toast({
        title: "Success",
        description: "Student updated successfully",
        duration: 2000
      });
    },
    onError: () => {
      forceRefresh(['students']);
      toast({
        title: "Error", 
        description: "Failed to update student",
        variant: "destructive"
      });
    }
  });

  const deleteStudent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .update({ is_enabled: false })
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      // Optimistic update - remove from UI immediately
      performOptimisticUpdate('students', 'delete', null, id);
    },
    onSuccess: () => {
      forceRefresh(['students']);
      toast({
        title: "Success",
        description: "Student removed successfully",
        duration: 2000
      });
    },
    onError: () => {
      forceRefresh(['students']);
      toast({
        title: "Error",
        description: "Failed to remove student",
        variant: "destructive"
      });
    }
  });

  // Batch operations
  const createBatch = useMutation({
    mutationFn: async (batchData: any) => {
      const { data, error } = await supabase
        .from('batches')
        .insert([batchData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async (newBatch) => {
      const tempId = `temp-${Date.now()}`;
      performOptimisticUpdate('batches', 'add', { ...newBatch, id: tempId });
    },
    onSuccess: () => {
      forceRefresh(['batches']);
      toast({
        title: "Success",
        description: "Batch created successfully",
        duration: 2000
      });
    },
    onError: () => {
      forceRefresh(['batches']);
      toast({
        title: "Error",
        description: "Failed to create batch",
        variant: "destructive"
      });
    }
  });

  const updateBatch = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('batches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      performOptimisticUpdate('batches', 'update', updates, id);
    },
    onSuccess: () => {
      forceRefresh(['batches']);
      toast({
        title: "Success",
        description: "Batch updated successfully",
        duration: 2000
      });
    },
    onError: () => {
      forceRefresh(['batches']);
      toast({
        title: "Error",
        description: "Failed to update batch",
        variant: "destructive"
      });
    }
  });

  const deleteBatch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('batches')
        .update({ is_enabled: false })
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      performOptimisticUpdate('batches', 'delete', null, id);
    },
    onSuccess: () => {
      forceRefresh(['batches']);
      toast({
        title: "Success",
        description: "Batch removed successfully", 
        duration: 2000
      });
    },
    onError: () => {
      forceRefresh(['batches']);
      toast({
        title: "Error",
        description: "Failed to remove batch",
        variant: "destructive"
      });
    }
  });

  return {
    students: {
      create: createStudent,
      update: updateStudent,
      delete: deleteStudent
    },
    batches: {
      create: createBatch,
      update: updateBatch,
      delete: deleteBatch
    }
  };
}