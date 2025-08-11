import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { useOfflineSupabase } from './useOfflineSupabase';
import { useOnlineStatus } from './useOnlineStatus';
import { useOfflineSync } from './useOfflineSync';

interface UseOfflineStudentsOptions {
  searchTerm?: string;
  selectedBatch?: string;
  sortBy?: 'student_name' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
  enabled?: boolean;
}

export function useOfflineStudents(options: UseOfflineStudentsOptions = {}) {
  const {
    searchTerm = '',
    selectedBatch = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc',
    pageSize = 1000,
    enabled = true
  } = options;

  const [currentPage, setCurrentPage] = useState(0);
  const { isOnline } = useOnlineStatus();
  const { updatePendingCount } = useOfflineSync();
  const offlineSupabase = useOfflineSupabase();

  // Debounce search term to prevent excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm.trim(), 300);

  // Offline-capable students query
  const studentsQuery = useQuery({
    queryKey: ['offline-students', debouncedSearchTerm, selectedBatch, sortBy, sortOrder, currentPage],
    queryFn: async () => {
      const filters = [];
      
      // Apply search filter
      if (debouncedSearchTerm) {
        filters.push({
          column: 'student_name',
          operator: 'ilike',
          value: `%${debouncedSearchTerm}%`
        });
      }

      // Apply batch filter
      if (selectedBatch !== 'all') {
        filters.push({
          column: 'batch_id',
          operator: 'eq',
          value: selectedBatch
        });
      }

      // Apply enabled filter
      filters.push({
        column: 'is_enabled',
        operator: 'eq',
        value: true
      });

      const query = {
        select: `
          id,
          student_name,
          mobile_number,
          address,
          created_at,
          updated_at,
          batch_id,
          is_enabled,
          user_id,
          finger_1,
          finger_2,
          finger_3,
          finger_4,
          finger_5,
          finger_1_image,
          finger_2_image,
          finger_3_image,
          finger_4_image,
          finger_5_image
        `,
        filters,
        orderBy: {
          column: sortBy,
          ascending: sortOrder === 'asc'
        }
      };

      const { data, error } = await offlineSupabase.select('students', query);
      
      if (error) {
        console.error('Error fetching students:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} students (${isOnline ? 'online' : 'offline'})`);

      return {
        students: data || [],
        totalCount: data?.length || 0,
        hasMore: false
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes when offline
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    // Retry strategy
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!isOnline) return false;
      return failureCount < 3;
    }
  });

  // Offline-capable batches query
  const batchesQuery = useQuery({
    queryKey: ['offline-batches'],
    queryFn: async () => {
      const { data, error } = await offlineSupabase.select('batches', {
        select: 'id, batch_name, is_enabled',
        orderBy: { column: 'batch_name', ascending: true }
      });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error) => {
      if (!isOnline) return false;
      return failureCount < 3;
    }
  });

  // Update pending count when data changes
  useEffect(() => {
    updatePendingCount();
  }, [studentsQuery.data, updatePendingCount]);

  // Computed stats for better performance using actual student data
  const stats = useMemo(() => {
    const students = studentsQuery.data?.students || [];
    const totalStudents = students.length;
    
    return {
      totalStudents,
      completeBiometrics: students.filter(s => 
        [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length === 5
      ).length,
      partialBiometrics: students.filter(s => {
        const count = [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length;
        return count > 0 && count < 5;
      }).length,
      noBiometrics: students.filter(s => 
        [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length === 0
      ).length
    };
  }, [studentsQuery.data?.students]);

  // Pagination helpers (simplified since we're showing all students)
  const totalPages = 1;
  const hasNextPage = false;
  const hasPreviousPage = false;

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPreviousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const resetPage = () => setCurrentPage(0);

  return {
    // Data
    students: studentsQuery.data?.students || [],
    batches: batchesQuery.data || [],
    stats,
    totalCount: studentsQuery.data?.students?.length || 0,
    
    // Loading states
    isLoading: studentsQuery.isLoading || batchesQuery.isLoading,
    isLoadingStudents: studentsQuery.isLoading,
    isLoadingBatches: batchesQuery.isLoading,
    
    // Error states
    error: studentsQuery.error || batchesQuery.error,
    
    // Online/offline status
    isOnline,
    
    // Pagination
    currentPage,
    totalPages,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    resetPage,
    
    // Actions
    refetch: () => {
      studentsQuery.refetch();
      batchesQuery.refetch();
    },
    invalidate: () => {
      // Query invalidation will be handled by the sync system
    }
  };
}