import React, { useEffect } from 'react';
import { useGlobalPerformanceOptimization } from '@/hooks/useGlobalPerformanceOptimization';
import { useUltraFastRealTime } from '@/hooks/useUltraFastRealTime';
import { useRealTimeValidator } from '@/hooks/useRealTimeValidator';
import { useUltraPerformanceOptimizer } from '@/hooks/useUltraPerformanceOptimizer';

/**
 * Component that safely initializes performance hooks within proper React context
 */
export function PerformanceInitializer() {
  // Initialize all performance optimization hooks
  useGlobalPerformanceOptimization();
  useUltraFastRealTime();
  useRealTimeValidator();
  useUltraPerformanceOptimizer();
  
  useEffect(() => {
    console.log('✅ All performance optimizations initialized successfully');
  }, []);
  
  return null; // This component doesn't render anything
}