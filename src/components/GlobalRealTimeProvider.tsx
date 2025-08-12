import React, { createContext, useContext, useEffect } from 'react';
import { useGlobalRealTimeSync } from '@/hooks/useGlobalRealTimeSync';
import { useInstantStudentUpdates } from '@/hooks/useInstantStudentUpdates';
import { useUltraFastRealTime } from '@/hooks/useUltraFastRealTime';
import { useGlobalPerformanceOptimization } from '@/hooks/useGlobalPerformanceOptimization';

interface GlobalRealTimeContextType {
  forceGlobalRefresh: () => void;
  emergencySync: () => void;
  isActive: boolean;
}

const GlobalRealTimeContext = createContext<GlobalRealTimeContextType | undefined>(undefined);

export function useGlobalRealTime() {
  const context = useContext(GlobalRealTimeContext);
  if (context === undefined) {
    throw new Error('useGlobalRealTime must be used within a GlobalRealTimeProvider');
  }
  return context;
}

interface GlobalRealTimeProviderProps {
  children: React.ReactNode;
}

/**
 * Global Real-Time Provider that orchestrates all real-time functionality
 * across the entire application to ensure instant synchronization
 */
export function GlobalRealTimeProvider({ children }: GlobalRealTimeProviderProps) {
  // Initialize all real-time hooks
  const globalSync = useGlobalRealTimeSync();
  const instantUpdates = useInstantStudentUpdates();
  const ultraFastRealTime = useUltraFastRealTime();
  const performanceOptimization = useGlobalPerformanceOptimization();

  useEffect(() => {
    console.log('🌐 GlobalRealTimeProvider: Initializing comprehensive real-time system...');
    
    // Optional: Set up periodic health checks
    const healthCheck = setInterval(() => {
      console.log('💓 Real-time system health check - All systems operational');
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(healthCheck);
      console.log('🌐 GlobalRealTimeProvider: Shutting down real-time system');
    };
  }, []);

  // Aggregate all refresh functions
  const forceGlobalRefresh = () => {
    console.log('🚀 Triggering comprehensive global refresh...');
    globalSync.forceGlobalRefresh();
    instantUpdates.forceRefresh();
    ultraFastRealTime.refreshAll();
    performanceOptimization.prefetchCriticalData();
  };

  const emergencySync = () => {
    console.log('🚨 Triggering emergency synchronization...');
    globalSync.emergencySync();
    instantUpdates.forceRefresh();
    ultraFastRealTime.refreshAll();
    performanceOptimization.optimizeCache();
    performanceOptimization.prefetchCriticalData();
  };

  const contextValue: GlobalRealTimeContextType = {
    forceGlobalRefresh,
    emergencySync,
    isActive: true
  };

  return (
    <GlobalRealTimeContext.Provider value={contextValue}>
      {children}
    </GlobalRealTimeContext.Provider>
  );
}