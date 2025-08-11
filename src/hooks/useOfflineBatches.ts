import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import { useOfflineSupabase } from './useOfflineSupabase';
import { useOnlineStatus } from './useOnlineStatus';
import { useOfflineSync } from './useOfflineSync';
import { Batch } from '@/types/index';

interface OfflineBatchesOptions {
  pageSize?: number;
  enablePrefetch?: boolean;
}

export const useOfflineBatches = (options: OfflineBatchesOptions = {}) => {
  const { pageSize = 50, enablePrefetch = true } = options;
  const { isOnline } = useOnlineStatus();
  const { updatePendingCount } = useOfflineSync();
  const offlineSupabase = useOfflineSupabase();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const queryKey = ['offline-batches', debouncedSearchTerm, statusFilter, currentPage];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const filters = [];

      // Apply search filter
      if (debouncedSearchTerm) {
        filters.push({
          column: 'batch_name',
          operator: 'ilike',
          value: `%${debouncedSearchTerm}%`
        });
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filters.push({
          column: 'is_enabled',
          operator: 'eq',
          value: statusFilter === 'active'
        });
      }

      const query = {
        select: '*, user_id',
        filters,
        orderBy: {
          column: 'created_at',
          ascending: false
        }
      };

      const { data: batchData, error } = await offlineSupabase.select('batches', query);
      
      if (error) {
        console.error('Error fetching batches:', error);
        throw error;
      }

      // Get student counts for each batch
      const batchIds = batchData?.map(batch => batch.id) || [];
      let studentCounts: Record<string, number> = {};
      
      if (batchIds.length > 0) {
        for (const batchId of batchIds) {
          const { data: students } = await offlineSupabase.select('students', {
            filters: [
              { column: 'batch_id', operator: 'eq', value: batchId },
              { column: 'is_enabled', operator: 'eq', value: true }
            ]
          });
          studentCounts[batchId] = students?.length || 0;
        }
      }

      const batchesWithCounts: Batch[] = (batchData || []).map(batch => ({
        ...batch,
        student_count: studentCounts[batch.id] || 0,
        user_id: batch.user_id || undefined
      }));

      // Client-side pagination
      const totalCount = batchesWithCounts.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize;
      const paginatedBatches = batchesWithCounts.slice(from, to);

      console.log(`✅ Fetched ${batchesWithCounts.length} batches (${isOnline ? 'online' : 'offline'})`);

      return {
        batches: paginatedBatches,
        totalCount,
        totalPages,
        currentPage,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
        allBatches: batchesWithCounts // For stats calculation
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (!isOnline) return false;
      return failureCount < 3;
    }
  });

  // Update pending count when data changes
  useEffect(() => {
    updatePendingCount();
  }, [data, updatePendingCount]);

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

  // Calculate statistics using all batches data
  const stats = useMemo(() => {
    const allBatches = data?.allBatches || [];
    return {
      totalBatches: allBatches.length,
      activeBatches: allBatches.filter(b => b.is_enabled).length,
      totalCapacity: allBatches.reduce((sum, b) => sum + b.max_students, 0),
      totalStudents: allBatches.reduce((sum, b) => sum + (b.student_count || 0), 0),
      utilizationRate: allBatches.length > 0 
        ? Math.round((allBatches.reduce((sum, b) => sum + (b.student_count || 0), 0) / 
            allBatches.reduce((sum, b) => sum + b.max_students, 0)) * 100) 
        : 0
    };
  }, [data?.allBatches]);

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
    isOnline,
  };
};