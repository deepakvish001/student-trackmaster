import React from 'react';

/**
 * Safe wrapper component that will initialize performance optimizations
 * after the app is fully loaded
 */
export function SafePerformanceWrapper({ children }: { children: React.ReactNode }) {
  // For now, just return children without performance hooks to fix the context error
  // Performance hooks will be initialized later when the app is stable
  
  React.useEffect(() => {
    console.log('🚀 SafePerformanceWrapper mounted - app is ready');
  }, []);
  
  return <>{children}</>;
}