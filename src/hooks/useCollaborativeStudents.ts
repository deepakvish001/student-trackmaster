import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineStudents } from './useOfflineStudents';
import { useRealtimeCollaboration } from './useRealtimeCollaboration';
import { useOfflineMutations } from './useOfflineMutations';

interface UseCollaborativeStudentsOptions {
  searchTerm?: string;
  selectedBatch?: string;
  sortBy?: 'created_at' | 'student_name';
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
  enabled?: boolean;
}

export function useCollaborativeStudents(options: UseCollaborativeStudentsOptions = {}) {
  const queryClient = useQueryClient();
  const { updatePresence } = useRealtimeCollaboration();
  const mutations = useOfflineMutations();
  
  // Get base student data with offline support
  const studentsQuery = useOfflineStudents(options);

  // Update presence when viewing students
  useEffect(() => {
    updatePresence('students');
    
    return () => {
      updatePresence('dashboard');
    };
  }, [updatePresence]);

  // Enhanced mutation functions with collaboration awareness
  const createStudent = useCallback(async (studentData: any) => {
    updatePresence('students', 'creating');
    
    try {
      await mutations.students.create.mutateAsync(studentData);
      
      // Optimistic update for immediate UI feedback
      queryClient.setQueryData(['offline-students'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          students: [{ ...studentData, id: 'temp-' + Date.now() }, ...oldData.students]
        };
      });
      
      updatePresence('students');
    } catch (error) {
      console.error('Failed to create student:', error);
      throw error;
    }
  }, [mutations.students, queryClient, updatePresence]);

  const updateStudent = useCallback(async (id: string, updates: any) => {
    updatePresence('students', id);
    
    try {
      await mutations.students.update.mutateAsync({ id, data: updates });
      
      // Optimistic update
      queryClient.setQueryData(['offline-students'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          students: oldData.students.map((student: any) => 
            student.id === id ? { ...student, ...updates } : student
          )
        };
      });
      
      updatePresence('students');
    } catch (error) {
      console.error('Failed to update student:', error);
      throw error;
    }
  }, [mutations.students, queryClient, updatePresence]);

  const deleteStudent = useCallback(async (id: string) => {
    updatePresence('students', id);
    
    try {
      await mutations.students.delete.mutateAsync(id);
      
      // Optimistic update
      queryClient.setQueryData(['offline-students'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          students: oldData.students.filter((student: any) => student.id !== id)
        };
      });
      
      updatePresence('students');
    } catch (error) {
      console.error('Failed to delete student:', error);
      throw error;
    }
  }, [mutations.students, queryClient, updatePresence]);

  const saveFingerprintData = useCallback(async (studentId: string, fingerprintData: any) => {
    updatePresence('students', studentId);
    
    try {
      await mutations.fingerprints.save.mutateAsync({ studentId, ...fingerprintData });
      
      // Refresh student data to show updated fingerprint status
      queryClient.invalidateQueries({ queryKey: ['offline-students'] });
      
      updatePresence('students');
    } catch (error) {
      console.error('Failed to save fingerprint:', error);
      throw error;
    }
  }, [mutations.fingerprints, queryClient, updatePresence]);

  return {
    // Original data and state
    ...studentsQuery,
    
    // Enhanced collaborative mutations
    createStudent,
    updateStudent,
    deleteStudent,
    saveFingerprintData,
    
    // Collaboration utilities
    updatePresence
  };
}