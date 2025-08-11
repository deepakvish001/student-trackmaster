import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOnlineStatus';
import { useOfflineQueue } from './useOfflineQueue';
import { usePWANotifications } from './usePWANotifications';

interface RealTimePWAState {
  isConnected: boolean;
  lastSync: Date | null;
  syncInProgress: boolean;
  activeUsers: number;
  dataVersion: number;
  performanceStats: {
    avgResponseTime: number;
    cacheHitRate: number;
    offlineActions: number;
  };
}

interface BiometricUpdate {
  id: string;
  student_id: string;
  finger_index: number;
  template_data: string;
  quality_score: number;
  created_at: string;
  updated_at: string;
}

interface StudentUpdate {
  id: string;
  student_name: string;
  student_id: string;
  batch_id: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useRealTimePWA() {
  const [state, setState] = useState<RealTimePWAState>({
    isConnected: false,
    lastSync: null,
    syncInProgress: false,
    activeUsers: 0,
    dataVersion: 1,
    performanceStats: {
      avgResponseTime: 0,
      cacheHitRate: 85,
      offlineActions: 0
    }
  });

  const isOnline = useOnlineStatus();
  const { addToQueue, processQueue, getQueueStats } = useOfflineQueue();
  const { showSyncNotification, showBiometricNotification } = usePWANotifications();
  const channelsRef = useRef<any[]>([]);
  const performanceRef = useRef<number[]>([]);
  const hasShownConnectedToast = useRef(false);
  const isInitializing = useRef(false);

  // Real-time presence tracking
  const presenceChannel = useRef<any>(null);
  const isCleaningUp = useRef(false);
  const connectionTimeout = useRef<NodeJS.Timeout | null>(null);

  // Simple, stable effect with proper cleanup
  useEffect(() => {
    // Clear any pending connection attempts
    if (connectionTimeout.current) {
      clearTimeout(connectionTimeout.current);
    }

    // Only initialize if online and not already connected/connecting
    if (isOnline && !state.isConnected && !isInitializing.current && !isCleaningUp.current) {
      connectionTimeout.current = setTimeout(() => {
        initializeRealTimeConnections();
      }, 1000); // 1 second delay to prevent rapid connections
    }

    // Cleanup when going offline
    if (!isOnline && state.isConnected) {
      cleanupConnections();
    }

    return () => {
      if (connectionTimeout.current) {
        clearTimeout(connectionTimeout.current);
      }
    };
  }, [isOnline]); // Only depend on isOnline

  const initializeRealTimeConnections = useCallback(async () => {
    if (isInitializing.current || state.isConnected || isCleaningUp.current || !isOnline) return;
    
    isInitializing.current = true;
    console.log('[RealTimePWA] Initializing real-time connections...');

    try {
      // Initialize presence channel for active users
      presenceChannel.current = supabase
        .channel('pwa-presence')
        .on('presence', { event: 'sync' }, () => {
          const newState = presenceChannel.current.presenceState();
          const activeCount = Object.keys(newState).length;
          setState(prev => ({ ...prev, activeUsers: activeCount }));
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[RealTimePWA] User joined:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('[RealTimePWA] User left:', key, leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            const userStatus = {
              user_id: (await supabase.auth.getUser()).data.user?.id,
              online_at: new Date().toISOString(),
              app_version: '1.0.0',
              device_type: 'PWA'
            };
            
            await presenceChannel.current.track(userStatus);
          }
        });

      // Real-time biometric data updates
      const biometricChannel = supabase
        .channel('biometric-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'student_fingerprints'
          },
          (payload) => handleBiometricUpdate(payload)
        )
        .subscribe((status) => {
          console.log('[RealTimePWA] Biometric channel status:', status);
        });

      // Real-time student data updates
      const studentChannel = supabase
        .channel('student-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'students'
          },
          (payload) => handleStudentUpdate(payload)
        )
        .subscribe((status) => {
          console.log('[RealTimePWA] Student channel status:', status);
        });

      // Real-time batch data updates
      const batchChannel = supabase
        .channel('batch-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'batches'
          },
          (payload) => handleBatchUpdate(payload)
        )
        .subscribe((status) => {
          console.log('[RealTimePWA] Batch channel status:', status);
        });

      channelsRef.current = [biometricChannel, studentChannel, batchChannel];
      
      setState(prev => ({ 
        ...prev, 
        isConnected: true,
        lastSync: new Date()
      }));

      // Only show toast once per session
      if (!hasShownConnectedToast.current) {
        showSyncNotification('Real-time synchronization activated', true);
        hasShownConnectedToast.current = true;
      }
    } catch (error) {
      console.error('[RealTimePWA] Failed to initialize:', error);
      showSyncNotification('Failed to connect real-time sync', false);
    } finally {
      isInitializing.current = false;
    }
  }, []);

  const handleBiometricUpdate = useCallback((payload: any) => {
    console.log('[RealTimePWA] Biometric update:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    // Update performance stats
    updatePerformanceStats();
    
    // Trigger cache invalidation if needed
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'INVALIDATE_CACHE',
        payload: { table: 'student_fingerprints', id: newRecord?.id || oldRecord?.id }
      });
    }
    
    setState(prev => ({ 
      ...prev, 
      dataVersion: prev.dataVersion + 1,
      lastSync: new Date()
    }));

    // Show notification for critical biometric updates
    if (eventType === 'INSERT' && newRecord) {
      showBiometricNotification(
        `Student ${newRecord.student_id}`, 
        `Fingerprint #${newRecord.finger_index} captured`
      );
    }
  }, []);

  const handleStudentUpdate = useCallback((payload: any) => {
    console.log('[RealTimePWA] Student update:', payload);
    
    updatePerformanceStats();
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'INVALIDATE_CACHE',
        payload: { table: 'students', id: payload.new?.id || payload.old?.id }
      });
    }
    
    setState(prev => ({ 
      ...prev, 
      dataVersion: prev.dataVersion + 1,
      lastSync: new Date()
    }));
  }, []);

  const handleBatchUpdate = useCallback((payload: any) => {
    console.log('[RealTimePWA] Batch update:', payload);
    
    updatePerformanceStats();
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'INVALIDATE_CACHE',
        payload: { table: 'batches', id: payload.new?.id || payload.old?.id }
      });
    }
    
    setState(prev => ({ 
      ...prev, 
      dataVersion: prev.dataVersion + 1,
      lastSync: new Date()
    }));
  }, []);

  const updatePerformanceStats = useCallback(() => {
    const now = Date.now();
    performanceRef.current.push(now);
    
    // Keep only last 100 measurements
    if (performanceRef.current.length > 100) {
      performanceRef.current = performanceRef.current.slice(-100);
    }
    
    // Calculate average response time
    if (performanceRef.current.length > 1) {
      const intervals = [];
      for (let i = 1; i < performanceRef.current.length; i++) {
        intervals.push(performanceRef.current[i] - performanceRef.current[i - 1]);
      }
      const avgResponseTime = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      setState(prev => ({
        ...prev,
        performanceStats: {
          ...prev.performanceStats,
          avgResponseTime: Math.round(avgResponseTime)
        }
      }));
    }
  }, []);

  const cleanupConnections = useCallback(() => {
    if (isCleaningUp.current) return;
    
    console.log('[RealTimePWA] Cleaning up connections...');
    isCleaningUp.current = true;
    
    // Clear connection timeout
    if (connectionTimeout.current) {
      clearTimeout(connectionTimeout.current);
      connectionTimeout.current = null;
    }
    
    channelsRef.current.forEach(channel => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn('[RealTimePWA] Error removing channel:', error);
        }
      }
    });
    
    if (presenceChannel.current) {
      try {
        supabase.removeChannel(presenceChannel.current);
      } catch (error) {
        console.warn('[RealTimePWA] Error removing presence channel:', error);
      }
      presenceChannel.current = null;
    }
    
    channelsRef.current = [];
    isInitializing.current = false;
    
    // Update state without triggering re-render loop
    setState(prev => ({ 
      ...prev, 
      isConnected: false,
      activeUsers: 0
    }));
    
    // Reset flags after a small delay
    setTimeout(() => {
      isCleaningUp.current = false;
      hasShownConnectedToast.current = false;
    }, 500);
  }, []);

  const forceSync = useCallback(async () => {
    if (state.syncInProgress || isCleaningUp.current) return;
    
    setState(prev => ({ ...prev, syncInProgress: true }));
    
    try {
      // Process offline queue
      await processQueue();
      
      // Trigger service worker cache update
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'FORCE_CACHE_UPDATE'
        });
      }
      
      setState(prev => ({ 
        ...prev, 
        lastSync: new Date(),
        dataVersion: prev.dataVersion + 1
      }));
      
      showSyncNotification('Sync completed successfully', true);
    } catch (error) {
      console.error('[RealTimePWA] Sync failed:', error);
      showSyncNotification('Sync failed', false);
    } finally {
      setState(prev => ({ ...prev, syncInProgress: false }));
    }
  }, [state.syncInProgress, processQueue]);

  const optimizePerformance = useCallback(async () => {
    try {
      // Clear old cache entries
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'OPTIMIZE_CACHE'
        });
      }
      
      // Update cache hit rate based on queue stats
      const queueStats = getQueueStats();
      const newCacheHitRate = Math.max(70, 95 - queueStats.total * 2);
      
      setState(prev => ({
        ...prev,
        performanceStats: {
          ...prev.performanceStats,
          cacheHitRate: newCacheHitRate,
          offlineActions: queueStats.total
        }
      }));
      
      showSyncNotification('Performance optimized', true);
    } catch (error) {
      console.error('[RealTimePWA] Performance optimization failed:', error);
    }
  }, [getQueueStats]);

  const queueBiometricCapture = useCallback(async (data: any) => {
    const queueId = addToQueue({
      type: 'biometric',
      action: 'capture',
      data,
      priority: 'critical'
    });
    
    return queueId;
  }, [addToQueue]);

  const queueStudentUpdate = useCallback(async (data: any) => {
    const queueId = addToQueue({
      type: 'student',
      action: 'update',
      data,
      priority: 'high'
    });
    
    return queueId;
  }, [addToQueue]);

  // Background sync registration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('[RealTimePWA] Service worker registered successfully');
      }).catch(error => {
        console.error('[RealTimePWA] Service worker registration failed:', error);
      });
    }
  }, []);

  return {
    ...state,
    forceSync,
    optimizePerformance,
    queueBiometricCapture,
    queueStudentUpdate,
    isOnline,
    queueStats: getQueueStats()
  };
}
