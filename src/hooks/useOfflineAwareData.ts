import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { offlineDb } from '@/lib/offlineDatabase';
import { useOnlineStatus } from './useOnlineStatus';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { toast } from 'sonner';

interface OfflineAwareDataOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
}

export function useOfflineAwareData<T>(
  queryKey: string[],
  tableName: string,
  supabaseQuery: () => Promise<{ data: T[] | null; error: any }>,
  options: OfflineAwareDataOptions = {}
) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const { user } = useEnhancedAuth();
  const [lastOnlineSync, setLastOnlineSync] = useState<string | null>(null);

  // Enhanced query with offline-first strategy
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      console.log(`🔍 Fetching ${tableName}:`, { isOnline, user: user?.id });

      if (isOnline) {
        try {
          // Try online first
          const { data, error } = await supabaseQuery();
          
          if (error) {
            console.error(`Error fetching ${tableName} online:`, error);
            // Fall back to offline data
            const offlineData = await getOfflineData();
            if (offlineData.length > 0) {
              toast.warning(`Using offline data for ${tableName}`, {
                description: 'Online fetch failed, showing cached data'
              });
              return offlineData;
            }
            throw error;
          }

          if (data) {
            // Cache successful online fetch
            await cacheOnlineData(data);
            setLastOnlineSync(new Date().toISOString());
            
            // Show sync success if coming back online
            if (wasOffline) {
              toast.success(`${tableName} synced successfully`, {
                description: `Updated ${data.length} records from server`
              });
            }
            
            return data;
          }

          return [];
        } catch (error) {
          console.error(`Failed to fetch ${tableName} online:`, error);
          
          // Fall back to offline data
          const offlineData = await getOfflineData();
          if (offlineData.length > 0) {
            toast.info(`Using offline ${tableName}`, {
              description: 'Network unavailable, showing cached data'
            });
            return offlineData;
          }
          
          throw error;
        }
      } else {
        // Offline mode - use cached data
        console.log(`📱 Offline mode: using cached ${tableName}`);
        const offlineData = await getOfflineData();
        
        if (offlineData.length === 0) {
          toast.warning(`No offline ${tableName} available`, {
            description: 'Connect to internet to load data'
          });
        }
        
        return offlineData;
      }
    },
    staleTime: isOnline ? 30000 : Infinity, // 30s when online, never stale when offline
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnMount: options.refetchOnMount ?? isOnline,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!isOnline) return false;
      // Retry up to 2 times when online
      return failureCount < 2;
    },
    enabled: options.enabled ?? !!user,
  });

  // Helper to get offline data
  const getOfflineData = async (): Promise<T[]> => {
    if (!user) return [];

    try {
      switch (tableName) {
        case 'students':
          const students = await offlineDb.students
            .where('user_id')
            .equals(user.id)
            .or('batch_id')
            .anyOf(await getUserAccessibleBatches())
            .toArray();
          return students as T[];
        
        case 'batches':
          const batches = await offlineDb.batches
            .where('user_id')
            .equals(user.id)
            .toArray();
          return batches as T[];
        
        case 'student_fingerprints':
          const fingerprints = await offlineDb.student_fingerprints
            .where('user_id')
            .equals(user.id)
            .toArray();
          return fingerprints as T[];
        
        default:
          return [];
      }
    } catch (error) {
      console.error(`Error getting offline ${tableName}:`, error);
      return [];
    }
  };

  // Helper to cache online data
  const cacheOnlineData = async (data: T[]) => {
    if (!user || !Array.isArray(data)) return;

    try {
      // Clear existing cache for this user
      switch (tableName) {
        case 'students':
          await offlineDb.students.where('user_id').equals(user.id).delete();
          break;
        case 'batches':
          await offlineDb.batches.where('user_id').equals(user.id).delete();
          break;
        case 'student_fingerprints':
          await offlineDb.student_fingerprints.where('user_id').equals(user.id).delete();
          break;
      }

      // Add fresh data with sync status
      const enrichedData = data.map(item => ({
        ...item,
        sync_status: 'synced' as const,
        last_synced_at: new Date().toISOString(),
        user_id: user.id
      }));

      switch (tableName) {
        case 'students':
          await offlineDb.students.bulkAdd(enrichedData as any);
          break;
        case 'batches':
          await offlineDb.batches.bulkAdd(enrichedData as any);
          break;
        case 'student_fingerprints':
          await offlineDb.student_fingerprints.bulkAdd(enrichedData as any);
          break;
      }

      await offlineDb.setMetadata(`${tableName}_last_cache`, new Date().toISOString());
      console.log(`✅ Cached ${data.length} ${tableName} records offline`);
    } catch (error) {
      console.error(`Error caching ${tableName}:`, error);
    }
  };

  // Helper to get user accessible batches
  const getUserAccessibleBatches = async (): Promise<string[]> => {
    if (!user) return [];
    
    try {
      const access = await offlineDb.user_batch_access
        .where('user_id')
        .equals(user.id)
        .toArray();
      return access.map(a => a.batch_id);
    } catch (error) {
      console.error('Error getting accessible batches:', error);
      return [];
    }
  };

  return {
    ...query,
    isOnline,
    lastOnlineSync,
    cacheStatus: {
      hasOfflineData: query.data && query.data.length > 0,
      isFromCache: !isOnline,
      lastSync: lastOnlineSync
    }
  };
}