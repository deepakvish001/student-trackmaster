import { useState, useEffect, useCallback, useMemo } from 'react';
import { offlineDb } from '@/lib/offlineDatabase';
import { useOnlineStatus } from './useOnlineStatus';

interface AnalyticsEvent {
  id: string;
  type: 'sync' | 'export' | 'query' | 'error' | 'performance' | 'user_action';
  action: string;
  timestamp: string;
  duration?: number;
  success: boolean;
  metadata: Record<string, any>;
  userId?: string;
  sessionId: string;
}

interface SyncAnalytics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTime: number;
  dataVolumeSync: number;
  lastSyncTime?: string;
  syncFrequency: number; // syncs per hour
}

interface ExportAnalytics {
  totalExports: number;
  exportsByFormat: Record<string, number>;
  averageExportTime: number;
  largestExport: number;
  failedExports: number;
}

interface QueryAnalytics {
  totalQueries: number;
  slowQueries: number;
  averageQueryTime: number;
  cacheHitRate: number;
  mostFrequentQueries: Array<{ query: string; count: number; avgTime: number }>;
}

interface ErrorAnalytics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  criticalErrors: number;
  errorTrends: Array<{ date: string; count: number }>;
  mostCommonErrors: Array<{ error: string; count: number; lastOccurred: string }>;
}

interface PerformanceAnalytics {
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  averageRenderTime: number;
  slowRenderEvents: number;
  batteryUsage?: number;
  networkEfficiency: number;
}

interface UserBehaviorAnalytics {
  sessionDuration: number;
  featuresUsed: Record<string, number>;
  peakUsageHours: Array<{ hour: number; activity: number }>;
  offlineUsageRatio: number;
  taskCompletionRate: number;
}

export function useAdvancedAnalytics() {
  const { isOnline } = useOnlineStatus();
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [isCollecting, setIsCollecting] = useState(true);
  const [sessionStartTime] = useState(Date.now());

  // Track analytics event
  const trackEvent = useCallback((
    type: AnalyticsEvent['type'],
    action: string,
    metadata: Record<string, any> = {},
    duration?: number,
    success: boolean = true
  ) => {
    if (!isCollecting) return;

    const event: AnalyticsEvent = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      action,
      timestamp: new Date().toISOString(),
      duration,
      success,
      metadata: {
        ...metadata,
        isOnline,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      sessionId
    };

    setEvents(prev => {
      const newEvents = [...prev, event];
      
      // Keep only last 1000 events in memory
      if (newEvents.length > 1000) {
        return newEvents.slice(-1000);
      }
      
      return newEvents;
    });

    // Store in IndexedDB for persistence
    try {
      offlineDb.table('analytics_events').add(event);
    } catch (error) {
      console.warn('Failed to store analytics event:', error);
    }
  }, [isCollecting, isOnline, sessionId]);

  // Sync analytics
  const syncAnalytics = useMemo((): SyncAnalytics => {
    const syncEvents = events.filter(e => e.type === 'sync');
    const successful = syncEvents.filter(e => e.success);
    const failed = syncEvents.filter(e => !e.success);
    
    const totalDuration = syncEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
    const averageTime = syncEvents.length > 0 ? totalDuration / syncEvents.length : 0;
    
    const dataVolume = syncEvents.reduce((sum, e) => 
      sum + (e.metadata?.recordCount || 0), 0
    );
    
    const lastSync = syncEvents.length > 0 
      ? syncEvents[syncEvents.length - 1].timestamp 
      : undefined;
    
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const recentSyncs = syncEvents.filter(e => 
      new Date(e.timestamp).getTime() > hourAgo
    );
    
    return {
      totalSyncs: syncEvents.length,
      successfulSyncs: successful.length,
      failedSyncs: failed.length,
      averageSyncTime: Math.round(averageTime),
      dataVolumeSync: dataVolume,
      lastSyncTime: lastSync,
      syncFrequency: recentSyncs.length
    };
  }, [events]);

  // Export analytics
  const exportAnalytics = useMemo((): ExportAnalytics => {
    const exportEvents = events.filter(e => e.type === 'export');
    const successful = exportEvents.filter(e => e.success);
    const failed = exportEvents.filter(e => !e.success);
    
    const formatCounts = exportEvents.reduce((acc, e) => {
      const format = e.metadata?.format || 'unknown';
      acc[format] = (acc[format] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const totalDuration = successful.reduce((sum, e) => sum + (e.duration || 0), 0);
    const averageTime = successful.length > 0 ? totalDuration / successful.length : 0;
    
    const largest = Math.max(...exportEvents.map(e => e.metadata?.recordCount || 0), 0);
    
    return {
      totalExports: exportEvents.length,
      exportsByFormat: formatCounts,
      averageExportTime: Math.round(averageTime),
      largestExport: largest,
      failedExports: failed.length
    };
  }, [events]);

  // Query analytics
  const queryAnalytics = useMemo((): QueryAnalytics => {
    const queryEvents = events.filter(e => e.type === 'query');
    const slowQueries = queryEvents.filter(e => (e.duration || 0) > 5000);
    
    const totalDuration = queryEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
    const averageTime = queryEvents.length > 0 ? totalDuration / queryEvents.length : 0;
    
    const cacheHits = queryEvents.filter(e => e.metadata?.fromCache === true);
    const cacheHitRate = queryEvents.length > 0 ? (cacheHits.length / queryEvents.length) * 100 : 0;
    
    // Most frequent queries
    const queryFrequency = queryEvents.reduce((acc, e) => {
      const queryKey = e.action;
      if (!acc[queryKey]) {
        acc[queryKey] = { count: 0, totalTime: 0 };
      }
      acc[queryKey].count++;
      acc[queryKey].totalTime += e.duration || 0;
      return acc;
    }, {} as Record<string, { count: number; totalTime: number }>);
    
    const mostFrequent = Object.entries(queryFrequency)
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgTime: Math.round(stats.totalTime / stats.count)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      totalQueries: queryEvents.length,
      slowQueries: slowQueries.length,
      averageQueryTime: Math.round(averageTime),
      cacheHitRate: Math.round(cacheHitRate),
      mostFrequentQueries: mostFrequent
    };
  }, [events]);

  // Error analytics
  const errorAnalytics = useMemo((): ErrorAnalytics => {
    const errorEvents = events.filter(e => e.type === 'error');
    const criticalErrors = errorEvents.filter(e => e.metadata?.severity === 'critical');
    
    const errorTypes = errorEvents.reduce((acc, e) => {
      const type = e.metadata?.errorType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Error trends by day
    const trends = errorEvents.reduce((acc, e) => {
      const date = new Date(e.timestamp).toISOString().split('T')[0];
      const existing = acc.find(t => t.date === date);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, [] as Array<{ date: string; count: number }>);
    
    // Most common errors
    const errorMessages = errorEvents.reduce((acc, e) => {
      const message = e.metadata?.message || e.action;
      if (!acc[message]) {
        acc[message] = { count: 0, lastOccurred: e.timestamp };
      }
      acc[message].count++;
      if (new Date(e.timestamp) > new Date(acc[message].lastOccurred)) {
        acc[message].lastOccurred = e.timestamp;
      }
      return acc;
    }, {} as Record<string, { count: number; lastOccurred: string }>);
    
    const mostCommon = Object.entries(errorMessages)
      .map(([error, stats]) => ({
        error,
        count: stats.count,
        lastOccurred: stats.lastOccurred
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      totalErrors: errorEvents.length,
      errorsByType: errorTypes,
      criticalErrors: criticalErrors.length,
      errorTrends: trends.sort((a, b) => a.date.localeCompare(b.date)),
      mostCommonErrors: mostCommon
    };
  }, [events]);

  // Performance analytics
  const performanceAnalytics = useMemo((): PerformanceAnalytics => {
    const perfEvents = events.filter(e => e.type === 'performance');
    
    const memoryUsages = perfEvents
      .map(e => e.metadata?.memoryUsage)
      .filter(m => typeof m === 'number');
    
    const renderTimes = perfEvents
      .map(e => e.duration)
      .filter(t => typeof t === 'number');
    
    const avgMemory = memoryUsages.length > 0 
      ? memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length 
      : 0;
    
    const peakMemory = memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0;
    
    const avgRender = renderTimes.length > 0 
      ? renderTimes.reduce((sum, t) => sum + t, 0) / renderTimes.length 
      : 0;
    
    const slowRenders = renderTimes.filter(t => t > 16).length; // 60fps threshold
    
    // Network efficiency (successful operations / total operations)
    const networkEvents = events.filter(e => e.metadata?.networkOperation === true);
    const successfulNetwork = networkEvents.filter(e => e.success);
    const networkEfficiency = networkEvents.length > 0 
      ? (successfulNetwork.length / networkEvents.length) * 100 
      : 100;
    
    return {
      averageMemoryUsage: Math.round(avgMemory),
      peakMemoryUsage: Math.round(peakMemory),
      averageRenderTime: Math.round(avgRender),
      slowRenderEvents: slowRenders,
      networkEfficiency: Math.round(networkEfficiency)
    };
  }, [events]);

  // User behavior analytics
  const userBehaviorAnalytics = useMemo((): UserBehaviorAnalytics => {
    const sessionDuration = Date.now() - sessionStartTime;
    
    const actions = events.filter(e => e.type === 'user_action');
    const features = actions.reduce((acc, e) => {
      const feature = e.metadata?.feature || e.action;
      acc[feature] = (acc[feature] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Peak usage hours (group by hour of day)
    const hourlyActivity = events.reduce((acc, e) => {
      const hour = new Date(e.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const peakHours = Object.entries(hourlyActivity)
      .map(([hour, activity]) => ({ hour: parseInt(hour), activity }))
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 3);
    
    // Offline usage ratio
    const offlineEvents = events.filter(e => e.metadata?.isOnline === false);
    const offlineRatio = events.length > 0 ? (offlineEvents.length / events.length) * 100 : 0;
    
    // Task completion rate (successful vs failed operations)
    const tasks = events.filter(e => ['sync', 'export', 'query'].includes(e.type));
    const completedTasks = tasks.filter(e => e.success);
    const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 100;
    
    return {
      sessionDuration: Math.round(sessionDuration / 1000 / 60), // minutes
      featuresUsed: features,
      peakUsageHours: peakHours,
      offlineUsageRatio: Math.round(offlineRatio),
      taskCompletionRate: Math.round(completionRate)
    };
  }, [events, sessionStartTime]);

  // Generate insights and recommendations
  const generateInsights = useCallback(() => {
    const insights = [];
    
    // Sync insights
    if (syncAnalytics.failedSyncs > syncAnalytics.successfulSyncs * 0.1) {
      insights.push({
        type: 'warning',
        category: 'sync',
        message: `High sync failure rate: ${Math.round((syncAnalytics.failedSyncs / syncAnalytics.totalSyncs) * 100)}%`,
        recommendation: 'Check network connectivity and implement better retry logic'
      });
    }
    
    // Performance insights
    if (performanceAnalytics.averageMemoryUsage > 100) {
      insights.push({
        type: 'warning',
        category: 'performance',
        message: `High memory usage: ${performanceAnalytics.averageMemoryUsage}MB`,
        recommendation: 'Enable data compression and implement memory cleanup'
      });
    }
    
    // Query insights
    if (queryAnalytics.cacheHitRate < 70) {
      insights.push({
        type: 'info',
        category: 'query',
        message: `Low cache hit rate: ${queryAnalytics.cacheHitRate}%`,
        recommendation: 'Increase cache duration and implement prefetching'
      });
    }
    
    // User behavior insights
    if (userBehaviorAnalytics.offlineUsageRatio > 30) {
      insights.push({
        type: 'info',
        category: 'usage',
        message: `High offline usage: ${userBehaviorAnalytics.offlineUsageRatio}%`,
        recommendation: 'Focus on offline-first features and better sync mechanisms'
      });
    }
    
    return insights;
  }, [syncAnalytics, performanceAnalytics, queryAnalytics, userBehaviorAnalytics]);

  // Export analytics data
  const exportAnalyticsData = useCallback(async (format: 'json' | 'csv' = 'json') => {
    const data = {
      summary: {
        sessionId,
        sessionDuration: userBehaviorAnalytics.sessionDuration,
        totalEvents: events.length,
        exportTime: new Date().toISOString()
      },
      sync: syncAnalytics,
      export: exportAnalytics,
      query: queryAnalytics,
      errors: errorAnalytics,
      performance: performanceAnalytics,
      userBehavior: userBehaviorAnalytics,
      insights: generateInsights(),
      events: events.slice(-100) // Last 100 events
    };
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${sessionId}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    return data;
  }, [sessionId, userBehaviorAnalytics, events, syncAnalytics, exportAnalytics, queryAnalytics, errorAnalytics, performanceAnalytics, generateInsights]);

  // Clear analytics data
  const clearAnalytics = useCallback(() => {
    setEvents([]);
    try {
      offlineDb.table('analytics_events').clear();
    } catch (error) {
      console.warn('Failed to clear analytics data:', error);
    }
  }, []);

  return {
    trackEvent,
    syncAnalytics,
    exportAnalytics,
    queryAnalytics,
    errorAnalytics,
    performanceAnalytics,
    userBehaviorAnalytics,
    insights: generateInsights(),
    sessionId,
    isCollecting,
    setIsCollecting,
    exportAnalyticsData,
    clearAnalytics,
    totalEvents: events.length
  };
}
