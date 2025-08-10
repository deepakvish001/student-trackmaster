import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './useDebounce';
import { Batch } from '@/types/index';

interface OptimizedBatchesOptions {
  pageSize?: number;
  enablePrefetch?: boolean;
}

export const useOptimizedBatches = (options: OptimizedBatchesOptions = {}) => {
  const { pageSize = 50, enablePrefetch = true } = options;
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const queryKey = ['batches', debouncedSearchTerm, statusFilter, currentPage];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('batches')
        .select('*, user_id', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      if (debouncedSearchTerm) {
        query = query.or(`batch_name.ilike.%${debouncedSearchTerm}%,serial_number.ilike.%${debouncedSearchTerm}%,admin_name.ilike.%${debouncedSearchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('is_enabled', statusFilter === 'active');
      }

      const { data: batchData, error, count } = await query;
      
      if (error) {
        console.error('Error fetching batches:', error);
        throw error;
      }

      // Efficiently get student counts for all batches in a single query
      const batchIds = batchData?.map(batch => batch.id) || [];
      let studentCounts: Record<string, number> = {};
      
      if (batchIds.length > 0) {
        const { data: studentCountData } = await supabase
          .from('students')
          .select('batch_id')
          .in('batch_id', batchIds)
          .eq('is_enabled', true);
        
        // Count students per batch
        studentCounts = (studentCountData || []).reduce((acc, student) => {
          acc[student.batch_id] = (acc[student.batch_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }

      const batchesWithCounts: Batch[] = (batchData || []).map(batch => ({
        ...batch,
        student_count: studentCounts[batch.id] || 0,
        user_id: batch.user_id || undefined
      }));

      return {
        batches: batchesWithCounts,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage,
        hasNextPage: currentPage < Math.ceil((count || 0) / pageSize),
        hasPreviousPage: currentPage > 1
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 30000, // 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Prefetch next page
  useEffect(() => {
    if (enablePrefetch && data?.hasNextPage) {
      const nextPageKey = ['batches', debouncedSearchTerm, statusFilter, currentPage + 1];
      queryClient.prefetchQuery({
        queryKey: nextPageKey,
        queryFn: async () => {
          const from = currentPage * pageSize;
          const to = from + pageSize - 1;

          let query = supabase
            .from('batches')
            .select('*, user_id')
            .range(from, to)
            .order('created_at', { ascending: false });

          if (debouncedSearchTerm) {
            query = query.or(`batch_name.ilike.%${debouncedSearchTerm}%,serial_number.ilike.%${debouncedSearchTerm}%,admin_name.ilike.%${debouncedSearchTerm}%`);
          }

          if (statusFilter !== 'all') {
            query = query.eq('is_enabled', statusFilter === 'active');
          }

          const { data: batchData } = await query;
          
          const batchIds = batchData?.map(batch => batch.id) || [];
          let studentCounts: Record<string, number> = {};
          
          if (batchIds.length > 0) {
            const { data: studentCountData } = await supabase
              .from('students')
              .select('batch_id')
              .in('batch_id', batchIds)
              .eq('is_enabled', true);
            
            studentCounts = (studentCountData || []).reduce((acc, student) => {
              acc[student.batch_id] = (acc[student.batch_id] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
          }

          return (batchData || []).map(batch => ({
            ...batch,
            student_count: studentCounts[batch.id] || 0,
            user_id: batch.user_id || undefined
          }));
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [data?.hasNextPage, currentPage, debouncedSearchTerm, statusFilter, enablePrefetch, pageSize, queryClient]);

  // Reset to first page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleStatusFilter = (filter: string) => {
    setStatusFilter(filter);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate statistics
  const stats = data ? {
    totalBatches: data.totalCount,
    activeBatches: data.batches.filter(b => b.is_enabled).length,
    totalCapacity: data.batches.reduce((sum, b) => sum + b.max_students, 0),
    totalStudents: data.batches.reduce((sum, b) => sum + (b.student_count || 0), 0),
    utilizationRate: data.batches.length > 0 
      ? Math.round((data.batches.reduce((sum, b) => sum + (b.student_count || 0), 0) / 
          data.batches.reduce((sum, b) => sum + b.max_students, 0)) * 100) 
      : 0
  } : {
    totalBatches: 0,
    activeBatches: 0,
    totalCapacity: 0,
    totalStudents: 0,
    utilizationRate: 0
  };

  return {
    batches: data?.batches || [],
    stats,
    pagination: {
      currentPage: data?.currentPage || 1,
      totalPages: data?.totalPages || 0,
      totalCount: data?.totalCount || 0,
      hasNextPage: data?.hasNextPage || false,
      hasPreviousPage: data?.hasPreviousPage || false,
    },
    filters: {
      searchTerm,
      statusFilter,
    },
    actions: {
      handleSearch,
      handleStatusFilter,
      handlePageChange,
      refetch,
    },
    loading: isLoading,
    error,
  };
};