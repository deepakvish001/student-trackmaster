import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';

interface UseUltraFastStudentsOptions {
  searchTerm?: string;
  selectedBatch?: string;
  sortBy?: 'student_name' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
  enabled?: boolean;
}

/**
 * Ultra-fast students hook with aggressive caching, lazy loading, and real-time updates
 * Optimized for instant loading and minimal database queries
 */
export function useUltraFastStudents(options: UseUltraFastStudentsOptions = {}) {
  const {
    searchTerm = '',
    selectedBatch = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc',
    pageSize = 50, // Increased page size for better performance
    enabled = true
  } = options;

  const [currentPage, setCurrentPage] = useState(0);
  const queryClient = useQueryClient();

  // Ultra-fast debounce for search
  const debouncedSearchTerm = useDebounce(searchTerm.trim(), 150);

  // Main students query with ultra-fast optimizations
  const studentsQuery = useQuery({
    queryKey: ['ultra-fast-students', debouncedSearchTerm, selectedBatch, sortBy, sortOrder, currentPage],
    queryFn: async () => {
      console.log(`🚀 Fetching ultra-fast students page ${currentPage + 1}...`);
      
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
          batches:batch_id!inner (
            id,
            batch_name
          )
        `, { count: 'exact' })
        .eq('is_enabled', true);

      // Apply search filters with index optimization
      if (debouncedSearchTerm) {
        // Use text search for better performance with gin index
        if (debouncedSearchTerm.length > 2) {
          query = query.textSearch('student_name', debouncedSearchTerm);
        } else {
          // Fallback to ilike for short terms
          query = query.ilike('student_name', `${debouncedSearchTerm}%`);
        }
      }

      // Apply batch filter efficiently
      if (selectedBatch !== 'all') {
        query = query.eq('batch_id', selectedBatch);
      }

      // Apply sorting and pagination with index optimization
      const startIndex = currentPage * pageSize;
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(startIndex, startIndex + pageSize - 1);

      const { data, error, count } = await query;
      
      if (error) {
        console.error('❌ Error fetching students:', error);
        throw error;
      }

      console.log(`✅ Students page ${currentPage + 1} loaded:`, data?.length || 0, 'students');
      
      return {
        students: data || [],
        totalCount: count || 0,
        hasMore: (data?.length || 0) === pageSize,
        page: currentPage
      };
    },
    enabled,
    staleTime: Infinity, // Never consider stale
    gcTime: Infinity, // Keep forever
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    networkMode: 'online',
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });

  // Ultra-fast batches query with minimal data
  const batchesQuery = useQuery({
    queryKey: ['ultra-fast-batches-minimal'],
    queryFn: async () => {
      console.log('🎓 Fetching ultra-fast batches...');
      
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('is_enabled', true)
        .order('batch_name');
      
      if (error) throw error;
      
      console.log('✅ Batches loaded:', data?.length || 0);
      return data || [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Ultra-fast stats computation with memoization
  const stats = useMemo(() => {
    const students = studentsQuery.data?.students || [];
    
    if (students.length === 0) {
      return {
        totalStudents: studentsQuery.data?.totalCount || 0,
        completeBiometrics: 0,
        partialBiometrics: 0,
        noBiometrics: 0,
        currentPageStudents: 0
      };
    }

    const completeBiometrics = students.filter(s => 
      [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length === 5
    ).length;
    
    const partialBiometrics = students.filter(s => {
      const count = [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length;
      return count > 0 && count < 5;
    }).length;
    
    const noBiometrics = students.filter(s => 
      [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length === 0
    ).length;

    return {
      totalStudents: studentsQuery.data?.totalCount || 0,
      completeBiometrics,
      partialBiometrics,
      noBiometrics,
      currentPageStudents: students.length
    };
  }, [studentsQuery.data]);

  // Real-time subscriptions for instant updates
  useEffect(() => {
    console.log('🔄 Setting up real-time students subscriptions...');
    
    const channels = [
      supabase
        .channel('ultra-fast-students')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'students' },
          () => {
            console.log('📊 Students data changed - invalidating queries');
            queryClient.invalidateQueries({ queryKey: ['ultra-fast-students'] });
          }
        ),
      
      supabase
        .channel('ultra-fast-batches')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'batches' },
          () => {
            console.log('🎓 Batches data changed - invalidating queries');
            queryClient.invalidateQueries({ queryKey: ['ultra-fast-batches-minimal'] });
          }
        ),
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      console.log('🧹 Cleaning up students subscriptions');
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [queryClient]);

  // Pagination helpers with prefetching
  const totalPages = Math.ceil((studentsQuery.data?.totalCount || 0) / pageSize);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPreviousPage = currentPage > 0;

  const goToPage = useCallback((page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const goToPreviousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearchTerm, selectedBatch, sortBy, sortOrder]);

  // Prefetch next page for better UX
  const prefetchNextPage = useCallback(() => {
    if (hasNextPage) {
      const nextPageKey = ['ultra-fast-students', debouncedSearchTerm, selectedBatch, sortBy, sortOrder, currentPage + 1];
      queryClient.prefetchQuery({
        queryKey: nextPageKey,
        staleTime: 2 * 60 * 1000, // 2 minutes
      });
    }
  }, [hasNextPage, currentPage, debouncedSearchTerm, selectedBatch, sortBy, sortOrder, queryClient]);

  // Auto-prefetch on page load
  useEffect(() => {
    if (hasNextPage) {
      const timer = setTimeout(prefetchNextPage, 1000); // Prefetch after 1 second
      return () => clearTimeout(timer);
    }
  }, [hasNextPage, prefetchNextPage]);

  return {
    // Data
    students: studentsQuery.data?.students || [],
    batches: batchesQuery.data || [],
    stats,
    totalCount: studentsQuery.data?.totalCount || 0,
    
    // Loading states
    isLoading: studentsQuery.isLoading,
    isLoadingStudents: studentsQuery.isLoading,
    isLoadingBatches: batchesQuery.isLoading,
    
    // Error states
    error: studentsQuery.error || batchesQuery.error,
    
    // Pagination
    currentPage,
    totalPages,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    prefetchNextPage,
    
    // Actions
    refetch: () => {
      studentsQuery.refetch();
      batchesQuery.refetch();
    },
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: ['ultra-fast-students'] });
      queryClient.invalidateQueries({ queryKey: ['ultra-fast-batches-minimal'] });
    },
    
    // Cache management
    clearCache: () => {
      queryClient.removeQueries({ queryKey: ['ultra-fast-students'] });
      queryClient.removeQueries({ queryKey: ['ultra-fast-batches-minimal'] });
    }
  };
}