import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineSupabase } from './useOfflineSupabase';
import { useOfflineSync } from './useOfflineSync';
import { useOnlineStatus } from './useOnlineStatus';
import { toast } from 'sonner';

/**
 * Offline-capable mutations hook for ultra-fast UI updates
 * Works seamlessly online and offline with automatic sync
 */
export function useOfflineMutations() {
  const queryClient = useQueryClient();
  const offlineSupabase = useOfflineSupabase();
  const { updatePendingCount } = useOfflineSync();
  const { isOnline } = useOnlineStatus();

  // Student operations
  const createStudent = useMutation({
    mutationFn: async (studentData: any) => {
      const { data, error } = await offlineSupabase.insert('students', studentData);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['offline-students'] });
      queryClient.invalidateQueries({ queryKey: ['offline-batches'] });
      
      // Update pending count
      updatePendingCount();
      
      toast.success(
        isOnline ? 'Student added successfully' : 'Student saved offline - will sync when online'
      );
    },
    onError: (error) => {
      console.error('Error creating student:', error);
      toast.error('Failed to add student');
    }
  });

  const updateStudent = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await offlineSupabase.update('students', id, data);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline-students'] });
      updatePendingCount();
      
      toast.success(
        isOnline ? 'Student updated successfully' : 'Student updated offline - will sync when online'
      );
    },
    onError: (error) => {
      console.error('Error updating student:', error);
      toast.error('Failed to update student');
    }
  });

  const deleteStudent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await offlineSupabase.remove('students', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline-students'] });
      queryClient.invalidateQueries({ queryKey: ['offline-batches'] });
      updatePendingCount();
      
      toast.success(
        isOnline ? 'Student deleted successfully' : 'Student deleted offline - will sync when online'
      );
    },
    onError: (error) => {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  });

  // Batch operations
  const createBatch = useMutation({
    mutationFn: async (batchData: any) => {
      const { data, error } = await offlineSupabase.insert('batches', batchData);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline-batches'] });
      updatePendingCount();
      
      toast.success(
        isOnline ? 'Batch created successfully' : 'Batch saved offline - will sync when online'
      );
    },
    onError: (error) => {
      console.error('Error creating batch:', error);
      toast.error('Failed to create batch');
    }
  });

  const updateBatch = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await offlineSupabase.update('batches', id, data);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline-batches'] });
      updatePendingCount();
      
      toast.success(
        isOnline ? 'Batch updated successfully' : 'Batch updated offline - will sync when online'
      );
    },
    onError: (error) => {
      console.error('Error updating batch:', error);
      toast.error('Failed to update batch');
    }
  });

  const deleteBatch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await offlineSupabase.remove('batches', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline-batches'] });
      updatePendingCount();
      
      toast.success(
        isOnline ? 'Batch deleted successfully' : 'Batch deleted offline - will sync when online'
      );
    },
    onError: (error) => {
      console.error('Error deleting batch:', error);
      toast.error('Failed to delete batch');
    }
  });

  // Fingerprint operations
  const saveFingerprintData = useMutation({
    mutationFn: async (fingerprintData: any) => {
      const { data, error } = await offlineSupabase.insert('student_fingerprints', fingerprintData);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline-students'] });
      updatePendingCount();
      
      toast.success(
        isOnline ? 'Fingerprint saved successfully' : 'Fingerprint saved offline - will sync when online'
      );
    },
    onError: (error) => {
      console.error('Error saving fingerprint:', error);
      toast.error('Failed to save fingerprint');
    }
  });

  const updateFingerprintData = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await offlineSupabase.update('student_fingerprints', id, data);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline-students'] });
      updatePendingCount();
      
      toast.success(
        isOnline ? 'Fingerprint updated successfully' : 'Fingerprint updated offline - will sync when online'
      );
    },
    onError: (error) => {
      console.error('Error updating fingerprint:', error);
      toast.error('Failed to update fingerprint');
    }
  });

  return {
    // Student mutations
    students: {
      create: createStudent,
      update: updateStudent,
      delete: deleteStudent,
    },
    
    // Batch mutations
    batches: {
      create: createBatch,
      update: updateBatch,
      delete: deleteBatch,
    },

    // Fingerprint mutations
    fingerprints: {
      save: saveFingerprintData,
      update: updateFingerprintData,
    },

    // Status
    isOnline,
  };
}