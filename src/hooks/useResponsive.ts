import { useState, useEffect } from 'react';
import { useIsMobile } from './use-mobile';

interface ResponsiveBreakpoints {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  orientation: 'portrait' | 'landscape';
}

export function useResponsive(): ResponsiveBreakpoints {
  const isMobile = useIsMobile();
  const [breakpoints, setBreakpoints] = useState<ResponsiveBreakpoints>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
    orientation: 'portrait'
  });

  useEffect(() => {
    const updateBreakpoints = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setBreakpoints({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024 && width < 1440,
        isLargeDesktop: width >= 1440,
        orientation: height > width ? 'portrait' : 'landscape'
      });
    };

    updateBreakpoints();
    
    let timeoutId: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateBreakpoints, 150);
    };

    window.addEventListener('resize', debouncedUpdate);
    window.addEventListener('orientationchange', debouncedUpdate);

    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      window.removeEventListener('orientationchange', debouncedUpdate);
      clearTimeout(timeoutId);
    };
  }, []);

  return breakpoints;
}

// Hook for getting responsive classes based on screen size
export function useResponsiveClasses() {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  return {
    container: isMobile ? 'px-4 py-6' : isTablet ? 'px-6 py-8' : 'px-8 py-10',
    grid: isMobile ? 'grid-cols-1 gap-4' : isTablet ? 'grid-cols-2 gap-6' : 'grid-cols-3 gap-8',
    text: {
      title: isMobile ? 'text-2xl' : isTablet ? 'text-3xl' : 'text-4xl',
      subtitle: isMobile ? 'text-lg' : isTablet ? 'text-xl' : 'text-2xl',
      body: 'text-base'
    },
    spacing: {
      section: isMobile ? 'space-y-6' : isTablet ? 'space-y-8' : 'space-y-10',
      element: isMobile ? 'space-y-4' : 'space-y-6'
    }
  };
}

// Custom hook for viewport dimensions
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    let timeoutId: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateViewport, 100);
    };

    window.addEventListener('resize', debouncedUpdate);
    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      clearTimeout(timeoutId);
    };
  }, []);

  return viewport;
}