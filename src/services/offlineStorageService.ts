// IndexedDB wrapper for offline data storage
// Handles students, batches, fingerprints, and pending operations

interface DBSchema {
  students: {
    key: string;
    value: any;
    indexes: { 'by-batch': string; 'by-updated': number };
  };
  batches: {
    key: string;
    value: any;
    indexes: { 'by-updated': number };
  };
  fingerprints: {
    key: string;
    value: any;
    indexes: { 'by-student': string; 'by-updated': number };
  };
  pendingOperations: {
    key: string;
    value: any;
    indexes: { 'by-created': number; 'by-type': string };
  };
  syncMetadata: {
    key: string;
    value: any;
  };
}

class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'StudentTrackMasterDB';
  private readonly dbVersion = 1;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('🔧 Upgrading IndexedDB schema...');

        // Students store
        if (!db.objectStoreNames.contains('students')) {
          const studentsStore = db.createObjectStore('students', { keyPath: 'id' });
          studentsStore.createIndex('by-batch', 'batch_id', { unique: false });
          studentsStore.createIndex('by-updated', 'updated_at', { unique: false });
        }

        // Batches store
        if (!db.objectStoreNames.contains('batches')) {
          const batchesStore = db.createObjectStore('batches', { keyPath: 'id' });
          batchesStore.createIndex('by-updated', 'updated_at', { unique: false });
        }

        // Fingerprints store
        if (!db.objectStoreNames.contains('fingerprints')) {
          const fingerprintsStore = db.createObjectStore('fingerprints', { keyPath: 'id' });
          fingerprintsStore.createIndex('by-student', 'student_id', { unique: false });
          fingerprintsStore.createIndex('by-updated', 'updated_at', { unique: false });
        }

        // Pending operations store
        if (!db.objectStoreNames.contains('pendingOperations')) {
          const pendingStore = db.createObjectStore('pendingOperations', { keyPath: 'id' });
          pendingStore.createIndex('by-created', 'created_at', { unique: false });
          pendingStore.createIndex('by-type', 'type', { unique: false });
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains('syncMetadata')) {
          db.createObjectStore('syncMetadata', { keyPath: 'key' });
        }
      };
    });
  }

  // Generic CRUD operations
  async put<T>(storeName: keyof DBSchema, data: T): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: keyof DBSchema, id: string): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: keyof DBSchema): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: keyof DBSchema, id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Specialized methods for students
  async getStudentsByBatch(batchId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['students'], 'readonly');
      const store = transaction.objectStore('students');
      const index = store.index('by-batch');
      const request = index.getAll(batchId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Specialized methods for fingerprints
  async getFingerprintsByStudent(studentId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['fingerprints'], 'readonly');
      const store = transaction.objectStore('fingerprints');
      const index = store.index('by-student');
      const request = index.getAll(studentId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Pending operations management
  async addPendingOperation(operation: {
    id: string;
    type: 'create' | 'update' | 'delete';
    entity: 'student' | 'batch' | 'fingerprint';
    data: any;
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    created_at: number;
  }): Promise<void> {
    await this.put('pendingOperations', operation);
    console.log('📝 Added pending operation:', operation.type, operation.entity);
  }

  async getPendingOperations(): Promise<any[]> {
    return this.getAll('pendingOperations');
  }

  async removePendingOperation(id: string): Promise<void> {
    await this.delete('pendingOperations', id);
    console.log('✅ Removed pending operation:', id);
  }

  // Sync metadata management
  async getLastSyncTime(entity: string): Promise<number | null> {
    const metadata = await this.get('syncMetadata', `lastSync_${entity}`) as { timestamp: number } | null;
    return metadata?.timestamp || null;
  }

  async setLastSyncTime(entity: string, timestamp: number): Promise<void> {
    await this.put('syncMetadata', {
      key: `lastSync_${entity}`,
      timestamp
    });
  }

  // Bulk operations for efficiency
  async bulkPut<T>(storeName: keyof DBSchema, items: T[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      let completed = 0;
      const total = items.length;

      if (total === 0) {
        resolve();
        return;
      }

      items.forEach(item => {
        const request = store.put(item);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Clear all data (useful for logout or reset)
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const storeNames: (keyof DBSchema)[] = ['students', 'batches', 'fingerprints', 'pendingOperations', 'syncMetadata'];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeNames, 'readwrite');
      
      let completed = 0;
      const total = storeNames.length;

      storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            console.log('🗑️ Cleared all offline data');
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Database status and health
  async getStorageInfo() {
    if (!this.db) throw new Error('Database not initialized');

    const info = {
      students: 0,
      batches: 0,
      fingerprints: 0,
      pendingOperations: 0,
    };

    const studentCount = await this.getAll('students');
    const batchCount = await this.getAll('batches');
    const fingerprintCount = await this.getAll('fingerprints');
    const pendingCount = await this.getAll('pendingOperations');

    info.students = studentCount.length;
    info.batches = batchCount.length;
    info.fingerprints = fingerprintCount.length;
    info.pendingOperations = pendingCount.length;

    return info;
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageService();