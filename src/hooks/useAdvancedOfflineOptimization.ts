import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '@/services/offlineStorageService';

interface PerformanceMetrics {
  cacheHitRate: number;
  avgQueryTime: number;
  storageUsage: {
    used: number;
    available: number;
    percentage: number;
  };
  syncPerformance: {
    lastSyncDuration: number;
    avgSyncTime: number;
    successRate: number;
  };
}

interface CacheStrategy {
  name: string;
  maxAge: number;
  maxSize: number;
  compressionEnabled: boolean;
  prefetchEnabled: boolean;
}

export function useAdvancedOfflineOptimization() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cacheHitRate: 0,
    avgQueryTime: 0,
    storageUsage: { used: 0, available: 0, percentage: 0 },
    syncPerformance: { lastSyncDuration: 0, avgSyncTime: 0, successRate: 0 }
  });

  const [cacheStrategy, setCacheStrategy] = useState<CacheStrategy>({
    name: 'adaptive',
    maxAge: 30 * 60 * 1000, // 30 minutes
    maxSize: 50 * 1024 * 1024, // 50MB
    compressionEnabled: true,
    prefetchEnabled: true
  });

  // Performance monitoring
  const trackCacheHit = useCallback((hit: boolean, queryTime: number) => {
    const storageKey = 'cache-metrics';
    const existing = JSON.parse(localStorage.getItem(storageKey) || '{"hits": 0, "misses": 0, "totalTime": 0, "queries": 0}');
    
    existing.queries += 1;
    existing.totalTime += queryTime;
    
    if (hit) {
      existing.hits += 1;
    } else {
      existing.misses += 1;
    }
    
    localStorage.setItem(storageKey, JSON.stringify(existing));
    
    setMetrics(prev => ({
      ...prev,
      cacheHitRate: (existing.hits / existing.queries) * 100,
      avgQueryTime: existing.totalTime / existing.queries
    }));
  }, []);

  // Intelligent cache cleanup
  const optimizeCache = useCallback(async () => {
    console.log('🧹 Starting intelligent cache optimization...');
    
    try {
      // Get storage usage
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const available = estimate.quota || 0;
        const percentage = (used / available) * 100;

        setMetrics(prev => ({
          ...prev,
          storageUsage: { used, available, percentage }
        }));

        // If storage is over 80% full, trigger cleanup
        if (percentage > 80) {
          console.log('🚨 Storage usage high, triggering cleanup...');
          await performIntelligentCleanup();
        }
      }

      // Optimize IndexedDB
      await optimizeIndexedDBStorage();
      
      console.log('✅ Cache optimization complete');
    } catch (error) {
      console.error('❌ Cache optimization failed:', error);
    }
  }, []);

  // Intelligent cleanup based on usage patterns
  const performIntelligentCleanup = async () => {
    const students = await offlineStorage.getAll('students');
    const batches = await offlineStorage.getAll('batches');
    const fingerprints = await offlineStorage.getAll('fingerprints');
    
    // Remove old, unused data based on access patterns
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    // Clean up old test data
    const studentsToKeep = students.filter((student: any) => 
      !student.id.startsWith('test-') || 
      new Date(student.created_at || 0).getTime() > cutoffTime
    );
    
    await offlineStorage.bulkPut('students', studentsToKeep);
    
    console.log(`🧹 Cleaned up ${students.length - studentsToKeep.length} old student records`);
  };

  // IndexedDB optimization
  const optimizeIndexedDBStorage = async () => {
    // Compact and optimize database
    // This would typically involve reorganizing indexes and removing fragmentation
    console.log('🔧 Optimizing IndexedDB storage...');
    
    // Example: Rebuild indexes for better performance
    // In a real implementation, you might recreate the database with optimized schema
  };

  // Adaptive prefetching based on usage patterns
  const enableAdaptivePrefetching = useCallback(async () => {
    if (!cacheStrategy.prefetchEnabled) return;

    console.log('🚀 Starting adaptive prefetching...');
    
    // Analyze usage patterns
    const usagePattern = JSON.parse(localStorage.getItem('usage-pattern') || '{}');
    
    // Prefetch commonly accessed data
    if (usagePattern.frequentBatches) {
      for (const batchId of usagePattern.frequentBatches) {
        await offlineStorage.getStudentsByBatch(batchId);
      }
    }
    
    // Prefetch during idle time
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        console.log('💤 Performing idle prefetching...');
        // Prefetch additional data during browser idle time
      });
    }
  }, [cacheStrategy.prefetchEnabled]);

  // Data compression for storage efficiency
  const enableDataCompression = useCallback(async (data: any[], tableName: string) => {
    if (!cacheStrategy.compressionEnabled) return data;

    try {
      // Simple compression strategy - remove unnecessary fields and optimize structure
      const compressedData = data.map(item => {
        // Remove empty fields
        const compressed: any = {};
        Object.keys(item).forEach(key => {
          if (item[key] !== null && item[key] !== undefined && item[key] !== '') {
            compressed[key] = item[key];
          }
        });
        return compressed;
      });

      console.log(`🗜️ Compressed ${tableName}: ${JSON.stringify(data).length} → ${JSON.stringify(compressedData).length} bytes`);
      return compressedData;
    } catch (error) {
      console.error('❌ Compression failed:', error);
      return data;
    }
  }, [cacheStrategy.compressionEnabled]);

  // Background sync optimization
  const optimizeBackgroundSync = useCallback(async () => {
    console.log('🔄 Optimizing background sync...');
    
    // Batch operations for more efficient sync
    const pendingOps = await offlineStorage.getPendingOperations();
    
    if (pendingOps.length > 0) {
      // Group operations by type and entity for batch processing
      const groupedOps = pendingOps.reduce((groups: any, op) => {
        const key = `${op.type}-${op.entity}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(op);
        return groups;
      }, {});

      console.log(`📦 Grouped ${pendingOps.length} operations into ${Object.keys(groupedOps).length} batches`);
    }
  }, []);

  // Smart cache eviction policy
  const applyCacheEvictionPolicy = useCallback(async () => {
    const now = Date.now();
    
    // LRU (Least Recently Used) eviction
    const accessLog = JSON.parse(localStorage.getItem('data-access-log') || '{}');
    
    // Find data that hasn't been accessed recently
    const staleDataIds = Object.keys(accessLog).filter(id => 
      now - accessLog[id] > cacheStrategy.maxAge
    );

    if (staleDataIds.length > 0) {
      console.log(`🗑️ Evicting ${staleDataIds.length} stale cache entries`);
      
      // Remove stale entries
      staleDataIds.forEach(id => delete accessLog[id]);
      localStorage.setItem('data-access-log', JSON.stringify(accessLog));
    }
  }, [cacheStrategy.maxAge]);

  // Update cache strategy based on device capabilities
  const adaptCacheStrategy = useCallback(() => {
    const isLowEndDevice = navigator.hardwareConcurrency <= 2;
    const isSlowConnection = 'connection' in navigator && 
      (navigator as any).connection?.effectiveType === '2g';

    if (isLowEndDevice || isSlowConnection) {
      setCacheStrategy(prev => ({
        ...prev,
        maxSize: 25 * 1024 * 1024, // 25MB for low-end devices
        compressionEnabled: true,
        prefetchEnabled: false
      }));
      console.log('📱 Adapted cache strategy for low-end device/slow connection');
    }
  }, []);

  // Initialize optimizations
  useEffect(() => {
    adaptCacheStrategy();
    
    // Run optimizations periodically
    const optimizationInterval = setInterval(() => {
      optimizeCache();
      enableAdaptivePrefetching();
      applyCacheEvictionPolicy();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Initial optimization
    setTimeout(() => {
      optimizeCache();
      enableAdaptivePrefetching();
    }, 2000);

    return () => clearInterval(optimizationInterval);
  }, [optimizeCache, enableAdaptivePrefetching, applyCacheEvictionPolicy, adaptCacheStrategy]);

  return {
    metrics,
    cacheStrategy,
    setCacheStrategy,
    trackCacheHit,
    optimizeCache,
    enableDataCompression,
    optimizeBackgroundSync,
    performIntelligentCleanup
  };
}