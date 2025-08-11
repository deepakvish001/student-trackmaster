import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDb } from '@/lib/offlineDatabase';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useOnlineStatus } from './useOnlineStatus';
import { v4 as uuidv4 } from 'uuid';

type TableName = 'students' | 'batches' | 'student_fingerprints' | 'user_profiles' | 'user_batch_access';

export function useOfflineSupabase() {
  const { user } = useEnhancedAuth();
  const { isOnline } = useOnlineStatus();

  // Generic select function that works offline/online
  const select = useCallback(async (tableName: TableName, query?: any) => {
    if (!user) throw new Error('User not authenticated');

    try {
      if (isOnline) {
        // Try online first
        let supabaseQuery = supabase.from(tableName).select(query?.select || '*');
        
        // Apply filters if provided
        if (query?.filters) {
          for (const filter of query.filters) {
            supabaseQuery = supabaseQuery.filter(filter.column, filter.operator as any, filter.value);
          }
        }
        
        // Apply ordering if provided
        if (query?.orderBy) {
          supabaseQuery = supabaseQuery.order(query.orderBy.column, { ascending: query.orderBy.ascending });
        }
        
        const { data, error } = await supabaseQuery;
        
        if (error) throw error;
        
        // Cache the results offline
        if (data && Array.isArray(data)) {
          for (const item of data) {
            const offlineItem = Object.assign({}, item, { sync_status: 'synced' as const });
            
            switch (tableName) {
              case 'students':
                await offlineDb.students.put(offlineItem as any);
                break;
              case 'batches':
                await offlineDb.batches.put(offlineItem as any);
                break;
              case 'student_fingerprints':
                await offlineDb.student_fingerprints.put(offlineItem as any);
                break;
              case 'user_profiles':
                await offlineDb.user_profiles.put(offlineItem as any);
                break;
              case 'user_batch_access':
                await offlineDb.user_batch_access.put(offlineItem as any);
                break;
            }
          }
        }
        
        return { data, error: null };
      } else {
        // Offline mode - read from IndexedDB
        let data: any[] = [];
        
        switch (tableName) {
          case 'students':
            data = await offlineDb.students.where('user_id').equals(user.id).toArray();
            break;
          case 'batches':
            data = await offlineDb.batches.where('user_id').equals(user.id).toArray();
            break;
          case 'student_fingerprints':
            data = await offlineDb.student_fingerprints.where('user_id').equals(user.id).toArray();
            break;
          case 'user_profiles':
            data = await offlineDb.user_profiles.where('user_id').equals(user.id).toArray();
            break;
          case 'user_batch_access':
            data = await offlineDb.user_batch_access.where('user_id').equals(user.id).toArray();
            break;
        }
        
        // Apply basic client-side filtering
        if (query?.filters) {
          for (const filter of query.filters) {
            data = data.filter(item => {
              const value = item[filter.column];
              switch (filter.operator) {
                case 'eq': return value === filter.value;
                case 'neq': return value !== filter.value;
                case 'gt': return value > filter.value;
                case 'gte': return value >= filter.value;
                case 'lt': return value < filter.value;
                case 'lte': return value <= filter.value;
                case 'in': return filter.value.includes(value);
                case 'ilike': return value?.toLowerCase().includes(filter.value.toLowerCase());
                default: return true;
              }
            });
          }
        }
        
        // Apply basic client-side ordering
        if (query?.orderBy) {
          data.sort((a, b) => {
            const aVal = a[query.orderBy.column];
            const bVal = b[query.orderBy.column];
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return query.orderBy.ascending ? comparison : -comparison;
          });
        }
        
        return { data, error: null };
      }
    } catch (error) {
      console.error(`Error in ${tableName} select:`, error);
      return { data: null, error };
    }
  }, [user, isOnline]);

  // Generic insert function
  const insert = useCallback(async (tableName: TableName, data: any) => {
    if (!user) throw new Error('User not authenticated');

    const id = data.id || uuidv4();
    const timestamp = new Date().toISOString();
    const insertData = {
      ...data,
      id,
      user_id: user.id,
      created_at: data.created_at || timestamp,
      updated_at: data.updated_at || timestamp
    };

    try {
      if (isOnline) {
        // Try online first
        const { data: result, error } = await supabase
          .from(tableName)
          .insert(insertData)
          .select()
          .single();
        
        if (error) throw error;
        
        // Cache the result offline
        const offlineItem = { ...result, sync_status: 'synced' as const };
        
        switch (tableName) {
          case 'students':
            await offlineDb.students.put(offlineItem as any);
            break;
          case 'batches':
            await offlineDb.batches.put(offlineItem as any);
            break;
          case 'student_fingerprints':
            await offlineDb.student_fingerprints.put(offlineItem as any);
            break;
          case 'user_profiles':
            await offlineDb.user_profiles.put(offlineItem as any);
            break;
          case 'user_batch_access':
            await offlineDb.user_batch_access.put(offlineItem as any);
            break;
        }
        
        return { data: result, error: null };
      } else {
        // Offline mode - store locally and queue for sync
        const offlineItem = { ...insertData, sync_status: 'pending' as const, operation: 'insert' as const };
        
        switch (tableName) {
          case 'students':
            await offlineDb.students.put(offlineItem as any);
            break;
          case 'batches':
            await offlineDb.batches.put(offlineItem as any);
            break;
          case 'student_fingerprints':
            await offlineDb.student_fingerprints.put(offlineItem as any);
            break;
          case 'user_profiles':
            await offlineDb.user_profiles.put(offlineItem as any);
            break;
          case 'user_batch_access':
            await offlineDb.user_batch_access.put(offlineItem as any);
            break;
        }
        
        // Add to sync queue
        await offlineDb.addToSyncQueue(tableName, id, 'insert', insertData, user.id);
        
        return { data: insertData, error: null };
      }
    } catch (error) {
      console.error(`Error in ${tableName} insert:`, error);
      return { data: null, error };
    }
  }, [user, isOnline]);

  // Generic update function
  const update = useCallback(async (tableName: TableName, id: string, data: any) => {
    if (!user) throw new Error('User not authenticated');

    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };

    try {
      if (isOnline) {
        // Try online first
        const { data: result, error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        
        // Update offline cache
        const offlineItem = { ...result, sync_status: 'synced' as const };
        
        switch (tableName) {
          case 'students':
            await offlineDb.students.where('id').equals(id).modify(offlineItem as any);
            break;
          case 'batches':
            await offlineDb.batches.where('id').equals(id).modify(offlineItem as any);
            break;
          case 'student_fingerprints':
            await offlineDb.student_fingerprints.where('id').equals(id).modify(offlineItem as any);
            break;
          case 'user_profiles':
            await offlineDb.user_profiles.where('id').equals(id).modify(offlineItem as any);
            break;
          case 'user_batch_access':
            await offlineDb.user_batch_access.where('id').equals(id).modify(offlineItem as any);
            break;
        }
        
        return { data: result, error: null };
      } else {
        // Offline mode - update locally and queue for sync
        const updateItem = { ...updateData, sync_status: 'pending' as const, operation: 'update' as const };
        
        switch (tableName) {
          case 'students':
            await offlineDb.students.where('id').equals(id).modify(updateItem);
            break;
          case 'batches':
            await offlineDb.batches.where('id').equals(id).modify(updateItem);
            break;
          case 'student_fingerprints':
            await offlineDb.student_fingerprints.where('id').equals(id).modify(updateItem);
            break;
          case 'user_profiles':
            await offlineDb.user_profiles.where('id').equals(id).modify(updateItem);
            break;
          case 'user_batch_access':
            await offlineDb.user_batch_access.where('id').equals(id).modify(updateItem);
            break;
        }
        
        // Add to sync queue
        await offlineDb.addToSyncQueue(tableName, id, 'update', updateData, user.id);
        
        return { data: updateData, error: null };
      }
    } catch (error) {
      console.error(`Error in ${tableName} update:`, error);
      return { data: null, error };
    }
  }, [user, isOnline]);

  // Generic delete function
  const remove = useCallback(async (tableName: TableName, id: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      if (isOnline) {
        // Try online first
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        // Remove from offline cache
        switch (tableName) {
          case 'students':
            await offlineDb.students.where('id').equals(id).delete();
            break;
          case 'batches':
            await offlineDb.batches.where('id').equals(id).delete();
            break;
          case 'student_fingerprints':
            await offlineDb.student_fingerprints.where('id').equals(id).delete();
            break;
          case 'user_profiles':
            await offlineDb.user_profiles.where('id').equals(id).delete();
            break;
          case 'user_batch_access':
            await offlineDb.user_batch_access.where('id').equals(id).delete();
            break;
        }
        
        return { error: null };
      } else {
        // Offline mode - mark for deletion and queue for sync
        switch (tableName) {
          case 'students':
            await offlineDb.students.where('id').equals(id).modify({
              sync_status: 'pending' as const,
              operation: 'delete' as const
            });
            break;
          case 'batches':
            await offlineDb.batches.where('id').equals(id).modify({
              sync_status: 'pending' as const,
              operation: 'delete' as const
            });
            break;
          case 'student_fingerprints':
            await offlineDb.student_fingerprints.where('id').equals(id).modify({
              sync_status: 'pending' as const,
              operation: 'delete' as const
            });
            break;
          case 'user_profiles':
            await offlineDb.user_profiles.where('id').equals(id).modify({
              sync_status: 'pending' as const,
              operation: 'delete' as const
            });
            break;
          case 'user_batch_access':
            await offlineDb.user_batch_access.where('id').equals(id).modify({
              sync_status: 'pending' as const,
              operation: 'delete' as const
            });
            break;
        }
        
        // Add to sync queue
        await offlineDb.addToSyncQueue(tableName, id, 'delete', {}, user.id);
        
        return { error: null };
      }
    } catch (error) {
      console.error(`Error in ${tableName} delete:`, error);
      return { error };
    }
  }, [user, isOnline]);

  return {
    select,
    insert,
    update,
    remove,
    isOnline
  };
}