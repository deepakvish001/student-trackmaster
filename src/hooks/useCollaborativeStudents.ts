import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { offlineDb, type OfflineStudent } from '@/lib/offlineDatabase';
import { toast } from 'sonner';

export function useCollaborativeStudents() {
  const { user } = useEnhancedAuth();
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();
  const { activeUsers } = useRealtimeCollaboration();

  // Enhanced query that combines online/offline data
  const studentsQuery = useQuery({
    queryKey: ['students', 'collaborative'],
    queryFn: async (): Promise<OfflineStudent[]> => {
      if (!user) return [];

      try {
        if (isOnline) {
          // Fetch from Supabase when online
          const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Update local cache
          if (data) {
            const studentsWithSync = data.map(student => ({
              ...student,
              sync_status: 'synced' as const,
              last_synced_at: new Date().toISOString(),
              last_sync_attempt: null,
              sync_retries: 0
            }));

            // Bulk update IndexedDB
            await offlineDb.students.bulkPut(studentsWithSync);
          }

          return data || [];
        } else {
          // Fetch from IndexedDB when offline
          const offlineStudents = await offlineDb.students
            .where('user_id')
            .equals(user.id)
            .toArray();

          console.log('📱 Loaded', offlineStudents.length, 'students from offline storage');
          return offlineStudents;
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        
        // Fallback to offline data
        try {
          const offlineStudents = await offlineDb.students
            .where('user_id')
            .equals(user.id)
            .toArray();
          
          if (offlineStudents.length > 0) {
            toast.info('Loaded data from offline cache', {
              description: `${offlineStudents.length} students available offline`
            });
          }
          
          return offlineStudents;
        } catch (offlineError) {
          console.error('Offline fallback failed:', offlineError);
          return [];
        }
      }
    },
    enabled: !!user,
    staleTime: isOnline ? 30000 : Infinity, // 30s when online, never stale when offline
    gcTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });

  // Enhanced mutation for collaborative editing
  const createStudent = async (studentData: Partial<OfflineStudent>) => {
    if (!user) throw new Error('User not authenticated');

    const now = new Date().toISOString();
    const studentId = crypto.randomUUID();
    
    const newStudent: OfflineStudent = {
      id: studentId,
      student_name: studentData.student_name || '',
      batch_id: studentData.batch_id || '',
      user_id: user.id,
      is_enabled: true,
      created_at: now,
      updated_at: now,
      finger_1: null,
      finger_2: null,
      finger_3: null,
      finger_4: null,
      finger_5: null,
      finger_1_image: null,
      finger_2_image: null,
      finger_3_image: null,
      finger_4_image: null,
      finger_5_image: null,
      mobile_number: studentData.mobile_number || null,
      address: studentData.address || null,
      sync_status: isOnline ? 'synced' : 'pending',
      last_synced_at: isOnline ? now : null,
      last_sync_attempt: null,
      sync_retries: 0,
      operation: 'insert'
    };

    try {
      if (isOnline) {
        // Create in Supabase first
        const { error } = await supabase
          .from('students')
          .insert(newStudent);

        if (error) throw error;

        // Update local cache
        await offlineDb.students.put({ ...newStudent, sync_status: 'synced' });
      } else {
        // Store locally with pending status
        await offlineDb.students.put(newStudent);
        
        // Add to sync queue
        await offlineDb.syncQueue.add({
          id: crypto.randomUUID(),
          table_name: 'students',
          record_id: studentId,
          operation: 'insert',
          data: newStudent,
          user_id: user.id,
          created_at: now,
          retry_count: 0,
          priority: 5
        });

        toast.info('Student saved offline', {
          description: 'Will sync when connection is restored'
        });
      }

      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: ['students'] });
      
      return newStudent;
    } catch (error) {
      console.error('Failed to create student:', error);
      throw error;
    }
  };

  const updateStudent = async (studentId: string, updates: Partial<OfflineStudent>) => {
    if (!user) throw new Error('User not authenticated');

    const now = new Date().toISOString();
    const updatedStudent = {
      ...updates,
      id: studentId,
      updated_at: now,
      sync_status: isOnline ? 'synced' : 'pending',
      last_sync_attempt: null,
      operation: 'update'
    };

    try {
      if (isOnline) {
        // Update in Supabase
        const { error } = await supabase
          .from('students')
          .update(updatedStudent)
          .eq('id', studentId);

        if (error) throw error;

        // Update local cache
        await offlineDb.students.update(studentId, { 
          ...updatedStudent, 
          sync_status: 'synced',
          last_synced_at: now 
        });
      } else {
        // Update locally
        await offlineDb.students.update(studentId, updatedStudent);
        
        // Add to sync queue
        await offlineDb.syncQueue.add({
          id: crypto.randomUUID(),
          table_name: 'students',
          record_id: studentId,
          operation: 'update',
          data: updatedStudent,
          user_id: user.id,
          created_at: now,
          retry_count: 0,
          priority: 5
        });

        toast.info('Changes saved offline', {
          description: 'Will sync when connection is restored'
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['students'] });
      
    } catch (error) {
      console.error('Failed to update student:', error);
      throw error;
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      if (isOnline) {
        // Delete from Supabase
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', studentId);

        if (error) throw error;

        // Remove from local cache
        await offlineDb.students.delete(studentId);
      } else {
        // Mark as deleted locally
        await offlineDb.students.update(studentId, {
          sync_status: 'pending',
          operation: 'delete',
          updated_at: new Date().toISOString()
        });
        
        // Add to sync queue
        await offlineDb.syncQueue.add({
          id: crypto.randomUUID(),
          table_name: 'students',
          record_id: studentId,
          operation: 'delete',
          data: { id: studentId },
          user_id: user.id,
          created_at: new Date().toISOString(),
          retry_count: 0,
          priority: 5
        });

        toast.info('Student marked for deletion', {
          description: 'Will be removed when connection is restored'
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['students'] });
      
    } catch (error) {
      console.error('Failed to delete student:', error);
      throw error;
    }
  };

  // Show collaboration status
  useEffect(() => {
    if (activeUsers.length > 0) {
      console.log(`👥 ${activeUsers.length} users are actively collaborating`);
    }
  }, [activeUsers]);

  return {
    students: studentsQuery.data || [],
    isLoading: studentsQuery.isLoading,
    error: studentsQuery.error,
    createStudent,
    updateStudent,
    deleteStudent,
    refetch: studentsQuery.refetch,
    activeCollaborators: activeUsers.length,
    isCollaborating: activeUsers.length > 0
  };
}