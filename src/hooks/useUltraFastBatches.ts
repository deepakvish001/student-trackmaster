import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './useDebounce';
import { Batch } from '@/types/index';

interface UltraFastBatchesOptions {
  pageSize?: number;
  enablePrefetch?: boolean;
  enableRealTime?: boolean;
}

/**
 * Ultra-fast batches hook with aggressive caching and optimized queries
 * Designed for instant loading with minimal database overhead
 */
export const useUltraFastBatches = (options: UltraFastBatchesOptions = {}) => {
  const { pageSize = 50, enablePrefetch = true, enableRealTime = true } = options;
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 200);

  const queryKey = ['ultra-fast-batches', debouncedSearchTerm, statusFilter, currentPage];

  // Main batches query with ultra-fast optimizations
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      console.log('🚀 Fetching ultra-fast batches...');
      
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('batches')
        .select(`
          id,
          batch_name,
          serial_number,
          admin_name,
          username,
          max_students,
          is_enabled,
          created_at,
          updated_at,
          user_id
        `, { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      // Apply search filters with index optimization
      if (debouncedSearchTerm) {
        query = query.or(`batch_name.ilike.%${debouncedSearchTerm}%,serial_number.ilike.%${debouncedSearchTerm}%,admin_name.ilike.%${debouncedSearchTerm}%`);
      }

      // Apply status filter efficiently
      if (statusFilter !== 'all') {
        query = query.eq('is_enabled', statusFilter === 'active');
      }

      const { data: batchData, error, count } = await query;
      
      if (error) {
        console.error('❌ Error fetching batches:', error);
        throw error;
      }

      // Get student counts efficiently in parallel
      const batchIds = batchData?.map(batch => batch.id) || [];
      let studentCounts: Record<string, number> = {};
      
      if (batchIds.length > 0) {
        console.log('📊 Fetching student counts for', batchIds.length, 'batches...');
        
        const { data: studentCountData } = await supabase
          .from('students')
          .select('batch_id')
          .in('batch_id', batchIds)
          .eq('is_enabled', true);
        
        // Efficiently count students per batch
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

      console.log('✅ Ultra-fast batches loaded:', batchesWithCounts.length, 'batches');

      return {
        batches: batchesWithCounts,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage,
        hasNextPage: currentPage < Math.ceil((count || 0) / pageSize),
        hasPreviousPage: currentPage > 1
      };
    },
    staleTime: Infinity, // Never consider stale
    gcTime: Infinity, // Keep forever
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    networkMode: 'online',
    placeholderData: (previousData) => previousData,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!enableRealTime) return;
    
    console.log('🔄 Setting up real-time batches subscriptions...');
    
    const channels = [
      supabase
        .channel('ultra-fast-batches-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'batches' },
          () => {
            console.log('🎓 Batches data changed - invalidating cache');
            queryClient.invalidateQueries({ queryKey: ['ultra-fast-batches'] });
          }
        ),
      
      supabase
        .channel('ultra-fast-students-for-batches')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'students' },
          () => {
            console.log('📊 Students data changed - invalidating batches cache');
            queryClient.invalidateQueries({ queryKey: ['ultra-fast-batches'] });
          }
        ),
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      console.log('🧹 Cleaning up batches subscriptions');
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [enableRealTime, queryClient]);

  // Prefetch next page for better UX
  useEffect(() => {
    if (enablePrefetch && data?.hasNextPage) {
      const nextPageKey = ['ultra-fast-batches', debouncedSearchTerm, statusFilter, currentPage + 1];
      
      const timer = setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: nextPageKey,
          staleTime: 2 * 60 * 1000, // 2 minutes
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [enablePrefetch, data?.hasNextPage, currentPage, debouncedSearchTerm, statusFilter, queryClient]);

  // Reset to first page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter]);

  // Memoized handlers for better performance
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleStatusFilter = useCallback((filter: string) => {
    setStatusFilter(filter);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Memoized statistics calculation
  const stats = useMemo(() => {
    if (!data) {
      return {
        totalBatches: 0,
        activeBatches: 0,
        totalCapacity: 0,
        totalStudents: 0,
        utilizationRate: 0
      };
    }

    const activeBatches = data.batches.filter(b => b.is_enabled).length;
    const totalCapacity = data.batches.reduce((sum, b) => sum + b.max_students, 0);
    const totalStudents = data.batches.reduce((sum, b) => sum + (b.student_count || 0), 0);
    const utilizationRate = totalCapacity > 0 
      ? Math.round((totalStudents / totalCapacity) * 100) 
      : 0;

    return {
      totalBatches: data.totalCount,
      activeBatches,
      totalCapacity,
      totalStudents,
      utilizationRate
    };
  }, [data]);

  return {
    // Data
    batches: data?.batches || [],
    stats,
    
    // Pagination
    pagination: {
      currentPage: data?.currentPage || 1,
      totalPages: data?.totalPages || 0,
      totalCount: data?.totalCount || 0,
      hasNextPage: data?.hasNextPage || false,
      hasPreviousPage: data?.hasPreviousPage || false,
    },
    
    // Filters
    filters: {
      searchTerm,
      statusFilter,
    },
    
    // Actions
    actions: {
      handleSearch,
      handleStatusFilter,
      handlePageChange,
      refetch,
    },
    
    // States
    loading: isLoading,
    error,
    
    // Cache management
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: ['ultra-fast-batches'] });
    },
    clearCache: () => {
      queryClient.removeQueries({ queryKey: ['ultra-fast-batches'] });
    }
  };
};