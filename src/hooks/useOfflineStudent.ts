import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineSync } from './useOfflineSync';
import { useNetworkStatus } from './useNetworkStatus';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

interface StudentData {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  batch_id: string;
  fingerprint_data?: Record<string, any>;
  [key: string]: any;
}

export function useOfflineStudent() {
  const queryClient = useQueryClient();
  const { queueOperation, getCachedData, cacheData } = useOfflineSync();
  const { isOnline } = useNetworkStatus();

  // Enhanced student query with offline support
  const useStudents = (batchId?: string) => {
    return useQuery({
      queryKey: ['students', batchId],
      queryFn: async () => {
        if (!isOnline) {
          // Return cached data when offline
          const cachedStudents = await getCachedData('students');
          return batchId 
            ? cachedStudents.filter((s: any) => s.batch_id === batchId)
            : cachedStudents;
        }

        // Fetch from Supabase when online
        let query = supabase.from('students').select('*');
        if (batchId) {
          query = query.eq('batch_id', batchId);
        }
        
        const { data, error } = await query;
        if (error) throw error;

        // Cache the data for offline access
        await cacheData('students', data || []);
        
        return data || [];
      },
      staleTime: isOnline ? 2 * 60 * 1000 : Infinity, // 2 min when online, never stale when offline
      gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    });
  };

  // Create student with offline support
  const useCreateStudent = () => {
    return useMutation({
      mutationFn: async (studentData: StudentData) => {
        const studentId = uuidv4();
        const studentWithId = { ...studentData, id: studentId };

        if (!isOnline) {
          // Store locally and queue for sync
          const cachedStudents = await getCachedData('students');
          const updatedStudents = [...cachedStudents, studentWithId];
          await cacheData('students', updatedStudents);
          
          // Queue the operation for when we're back online
          await queueOperation(
            'create',
            'student', 
            studentWithId,
            '/students',
            'POST'
          );

          toast.success('📱 Student added offline - will sync when connected');
          return studentWithId;
        }

        // Create online  
        const { data, error } = await supabase
          .from('students')
          .insert([{
            ...studentWithId,
            student_name: `${studentWithId.first_name} ${studentWithId.last_name}`
          }])
          .select()
          .single();

        if (error) throw error;

        toast.success('✅ Student created successfully');
        return data;
      },
      onSuccess: (data) => {
        // Update the cache with the new student
        queryClient.setQueryData(['students'], (old: any) => {
          return old ? [...old, data] : [data];
        });
        
        // Also update batch-specific queries
        if (data.batch_id) {
          queryClient.setQueryData(['students', data.batch_id], (old: any) => {
            return old ? [...old, data] : [data];
          });
        }

        // Invalidate to refresh lists
        queryClient.invalidateQueries({ queryKey: ['students'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      },
      onError: (error) => {
        console.error('Failed to create student:', error);
        toast.error('❌ Failed to create student');
      }
    });
  };

  // Update student with offline support
  const useUpdateStudent = () => {
    return useMutation({
      mutationFn: async ({ id, ...updates }: StudentData & { id: string }) => {
        if (!isOnline) {
          // Update locally and queue for sync
          const cachedStudents = await getCachedData('students');
          const updatedStudents = cachedStudents.map((student: any) =>
            student.id === id ? { ...student, ...updates } : student
          );
          await cacheData('students', updatedStudents);
          
          // Queue the operation
          await queueOperation(
            'update',
            'student',
            { id, ...updates },
            `/students/${id}`,
            'PATCH'
          );

          toast.success('📱 Student updated offline - will sync when connected');
          return { id, ...updates };
        }

        // Update online
        const { data, error } = await supabase
          .from('students')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        toast.success('✅ Student updated successfully');
        return data;
      },
      onSuccess: (data) => {
        // Update all relevant queries
        queryClient.setQueryData(['students'], (old: any) => {
          return old ? old.map((student: any) => 
            student.id === data.id ? data : student
          ) : [data];
        });
        
        if (data.batch_id) {
          queryClient.setQueryData(['students', data.batch_id], (old: any) => {
            return old ? old.map((student: any) => 
              student.id === data.id ? data : student
            ) : [data];
          });
        }

        queryClient.invalidateQueries({ queryKey: ['students'] });
      }
    });
  };

  // Delete student with offline support
  const useDeleteStudent = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        if (!isOnline) {
          // Remove locally and queue for sync
          const cachedStudents = await getCachedData('students');
          const updatedStudents = cachedStudents.filter((student: any) => student.id !== id);
          await cacheData('students', updatedStudents);
          
          // Queue the operation
          await queueOperation(
            'delete',
            'student',
            { id },
            `/students/${id}`,
            'DELETE'
          );

          toast.success('📱 Student deleted offline - will sync when connected');
          return { id };
        }

        // Delete online
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast.success('✅ Student deleted successfully');
        return { id };
      },
      onSuccess: (data) => {
        // Remove from all queries
        queryClient.setQueryData(['students'], (old: any) => {
          return old ? old.filter((student: any) => student.id !== data.id) : [];
        });
        
        // Also remove from batch-specific queries
        queryClient.getQueryCache().findAll({ queryKey: ['students'] }).forEach(query => {
          if (query.queryKey.length === 2) { // ['students', batchId]
            queryClient.setQueryData(query.queryKey, (old: any) => {
              return old ? old.filter((student: any) => student.id !== data.id) : [];
            });
          }
        });

        queryClient.invalidateQueries({ queryKey: ['students'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      }
    });
  };

  // Save fingerprint data with offline support
  const useSaveFingerprint = () => {
    return useMutation({
      mutationFn: async ({ studentId, fingerprintData }: { 
        studentId: string; 
        fingerprintData: Record<string, any> 
      }) => {
        const fingerprintRecord = {
          id: uuidv4(),
          student_id: studentId,
          template_data: fingerprintData,
          captured_at: new Date().toISOString(),
        };

        if (!isOnline) {
          // Store locally and queue for sync
          const cachedFingerprints = await getCachedData('fingerprints');
          const updatedFingerprints = [...cachedFingerprints, fingerprintRecord];
          await cacheData('fingerprints', updatedFingerprints);
          
          // Also update the student record
          const cachedStudents = await getCachedData('students');
          const updatedStudents = cachedStudents.map((student: any) =>
            student.id === studentId 
              ? { ...student, fingerprint_data: fingerprintData }
              : student
          );
          await cacheData('students', updatedStudents);
          
          // Queue the operation
          await queueOperation(
            'create',
            'fingerprint',
            fingerprintRecord,
            '/fingerprints',
            'POST'
          );

          toast.success('📱 Fingerprint saved offline - will sync when connected');
          return fingerprintRecord;
        }

        // Save online
        const { data, error } = await supabase
          .from('student_fingerprints')
          .insert([{
            ...fingerprintRecord,
            finger_index: 1,
            pid_data: JSON.stringify(fingerprintData)
          }])
          .select()
          .single();

        if (error) throw error;

        toast.success('✅ Fingerprint saved successfully');
        return data;
      },
      onSuccess: (data) => {
        // Invalidate student queries to refresh fingerprint status
        queryClient.invalidateQueries({ queryKey: ['students'] });
        queryClient.invalidateQueries({ queryKey: ['fingerprints'] });
      }
    });
  };

  return {
    useStudents,
    useCreateStudent,
    useUpdateStudent,
    useDeleteStudent,
    useSaveFingerprint,
    isOfflineCapable: true
  };
}