import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo } from 'react';

interface UseOptimizedStudentsOptions {
  searchTerm?: string;
  selectedBatch?: string;
  sortBy?: 'student_name' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
  enabled?: boolean;
}

export function useOptimizedStudents(options: UseOptimizedStudentsOptions = {}) {
  const {
    searchTerm = '',
    selectedBatch = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc',
    pageSize = 25,
    enabled = true
  } = options;

  const [currentPage, setCurrentPage] = useState(0);
  const queryClient = useQueryClient();

  // Optimized students query with pagination
  const studentsQuery = useQuery({
    queryKey: ['students-optimized', searchTerm, selectedBatch, sortBy, sortOrder, currentPage],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select(`
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
          finger_5_image,
          batches:batch_id!inner (
            batch_name
          )
        `)
        .eq('is_enabled', true);

      // Apply filters efficiently
      if (searchTerm.trim()) {
        const searchQuery = searchTerm.trim();
        query = query.or(`student_name.ilike.%${searchQuery}%,mobile_number.ilike.%${searchQuery}%`);
      }

      if (selectedBatch !== 'all') {
        query = query.eq('batch_id', selectedBatch);
      }

      // Apply sorting and pagination
      const startIndex = currentPage * pageSize;
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(startIndex, startIndex + pageSize - 1);

      const { data, error, count } = await query;
      if (error) {
        console.error('Error fetching students:', error);
        throw error;
      }

      return {
        students: data || [],
        totalCount: count || 0,
        hasMore: (data?.length || 0) === pageSize
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });

  // Separate lightweight query for getting total count efficiently
  const countQuery = useQuery({
    queryKey: ['students-count', searchTerm, selectedBatch],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('id', { count: 'exact' })
        .eq('is_enabled', true);

      if (searchTerm.trim()) {
        const searchQuery = searchTerm.trim();
        query = query.or(`student_name.ilike.%${searchQuery}%,mobile_number.ilike.%${searchQuery}%`);
      }

      if (selectedBatch !== 'all') {
        query = query.eq('batch_id', selectedBatch);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
  });

  // Optimized batches query
  const batchesQuery = useQuery({
    queryKey: ['batches-optimized'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('is_enabled', true)
        .order('batch_name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Computed stats for better performance
  const stats = useMemo(() => {
    const students = studentsQuery.data?.students || [];
    return {
      totalStudents: countQuery.data || 0,
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
  }, [studentsQuery.data?.students, countQuery.data]);

  // Pagination helpers
  const totalPages = Math.ceil((countQuery.data || 0) / pageSize);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPreviousPage = currentPage > 0;

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

  // Reset page when filters change
  const resetPage = () => setCurrentPage(0);

  // Prefetch next page for better UX
  const prefetchNextPage = () => {
    if (hasNextPage) {
      queryClient.prefetchQuery({
        queryKey: ['students-optimized', searchTerm, selectedBatch, sortBy, sortOrder, currentPage + 1],
        staleTime: 2 * 60 * 1000, // 2 minutes
      });
    }
  };

  return {
    // Data
    students: studentsQuery.data?.students || [],
    batches: batchesQuery.data || [],
    stats,
    totalCount: countQuery.data || 0,
    
    // Loading states
    isLoading: studentsQuery.isLoading || countQuery.isLoading,
    isLoadingStudents: studentsQuery.isLoading,
    isLoadingCount: countQuery.isLoading,
    isLoadingBatches: batchesQuery.isLoading,
    
    // Error states
    error: studentsQuery.error || countQuery.error || batchesQuery.error,
    
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
    prefetchNextPage,
    
    // Actions
    refetch: () => {
      studentsQuery.refetch();
      countQuery.refetch();
    },
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: ['students-optimized'] });
      queryClient.invalidateQueries({ queryKey: ['students-count'] });
    }
  };
}