import Dexie, { Table } from 'dexie';
import type { Database } from '@/integrations/supabase/types';

// Define sync status type
export type SyncStatus = 'synced' | 'pending' | 'error';

// Define offline data types with sync metadata
export interface OfflineStudent {
  id: string;
  student_name: string;
  batch_id: string;
  user_id: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  finger_1: string | null;
  finger_2: string | null;
  finger_3: string | null;
  finger_4: string | null;
  finger_5: string | null;
  finger_1_image: string | null;
  finger_2_image: string | null;
  finger_3_image: string | null;
  finger_4_image: string | null;
  finger_5_image: string | null;
  mobile_number: string | null;
  address: string | null;
  sync_status: SyncStatus;
  local_id?: string;
  operation?: 'insert' | 'update' | 'delete';
  last_sync_attempt?: string;
}

export interface OfflineBatch {
  id: string;
  batch_name: string;
  admin_name: string;
  username: string;
  serial_number: string;
  max_students: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  sync_status: SyncStatus;
  local_id?: string;
  operation?: 'insert' | 'update' | 'delete';
  last_sync_attempt?: string;
}

export interface OfflineFingerprint {
  id: string;
  student_id: string;
  finger_index: number;
  pid_data: string;
  image_data: string | null;
  quality_score: number | null;
  capture_timestamp: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  sync_status: SyncStatus;
  local_id?: string;
  operation?: 'insert' | 'update' | 'delete';
  last_sync_attempt?: string;
}

export interface OfflineUserProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  max_batches_allowed: number;
  failed_login_attempts: number | null;
  locked_until: string | null;
  password_changed_at: string | null;
  session_token: string | null;
  sync_status: SyncStatus;
  local_id?: string;
  operation?: 'insert' | 'update' | 'delete';
  last_sync_attempt?: string;
}

export interface OfflineUserBatchAccess {
  id: string;
  user_id: string;
  batch_id: string;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
  local_id?: string;
  operation?: 'insert' | 'update' | 'delete';
  last_sync_attempt?: string;
}

export interface SyncQueue {
  id?: number;
  table_name: string;
  record_id: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  user_id: string;
  created_at: string;
  retry_count: number;
  last_error?: string;
}

export interface AppMetadata {
  key: string;
  value: any;
  updated_at: string;
}

class OfflineDatabase extends Dexie {
  students!: Table<OfflineStudent>;
  batches!: Table<OfflineBatch>;
  student_fingerprints!: Table<OfflineFingerprint>;
  user_profiles!: Table<OfflineUserProfile>;
  user_batch_access!: Table<OfflineUserBatchAccess>;
  sync_queue!: Table<SyncQueue>;
  app_metadata!: Table<AppMetadata>;

  constructor() {
    super('StudentManagementOfflineDB');
    
    this.version(1).stores({
      students: '++local_id, id, student_name, batch_id, user_id, sync_status, updated_at',
      batches: '++local_id, id, batch_name, user_id, sync_status, updated_at',
      student_fingerprints: '++local_id, id, student_id, finger_index, user_id, sync_status, updated_at',
      user_profiles: '++local_id, id, user_id, sync_status, updated_at',
      user_batch_access: '++local_id, id, user_id, batch_id, sync_status, updated_at',
      sync_queue: '++id, table_name, record_id, operation, user_id, created_at',
      app_metadata: 'key, updated_at'
    });
  }

  // Helper method to get pending sync operations
  async getPendingSyncOperations(): Promise<SyncQueue[]> {
    return await this.sync_queue.orderBy('created_at').toArray();
  }

  // Helper method to add item to sync queue
  async addToSyncQueue(
    tableName: string,
    recordId: string,
    operation: 'insert' | 'update' | 'delete',
    data: any,
    userId: string
  ): Promise<void> {
    await this.sync_queue.add({
      table_name: tableName,
      record_id: recordId,
      operation,
      data,
      user_id: userId,
      created_at: new Date().toISOString(),
      retry_count: 0
    });
  }

  // Helper method to remove from sync queue
  async removeFromSyncQueue(id: number): Promise<void> {
    await this.sync_queue.delete(id);
  }

  // Helper method to increment retry count
  async incrementRetryCount(id: number, error?: string): Promise<void> {
    const item = await this.sync_queue.get(id);
    if (item) {
      await this.sync_queue.update(id, {
        retry_count: item.retry_count + 1,
        last_error: error
      });
    }
  }

  // Helper method to get app metadata
  async getMetadata(key: string): Promise<any> {
    const metadata = await this.app_metadata.get(key);
    return metadata?.value;
  }

  // Helper method to set app metadata
  async setMetadata(key: string, value: any): Promise<void> {
    await this.app_metadata.put({
      key,
      value,
      updated_at: new Date().toISOString()
    });
  }

  // Helper method to clear all data (for logout)
  async clearAllData(): Promise<void> {
    await this.transaction('rw', [
      this.students,
      this.batches,
      this.student_fingerprints,
      this.user_profiles,
      this.user_batch_access,
      this.sync_queue,
      this.app_metadata
    ], async () => {
      await this.students.clear();
      await this.batches.clear();
      await this.student_fingerprints.clear();
      await this.user_profiles.clear();
      await this.user_batch_access.clear();
      await this.sync_queue.clear();
      await this.app_metadata.clear();
    });
  }
}

export const offlineDb = new OfflineDatabase();