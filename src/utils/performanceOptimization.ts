// Bundle analyzer and optimization utilities
import { useState, useEffect } from 'react';

interface BundleStats {
  totalSize: number;
  gzippedSize: number;
  chunkCount: number;
  assetCount: number;
  duplicates: string[];
  suggestions: string[];
}

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

export function useBundleOptimization() {
  const [bundleStats, setBundleStats] = useState<BundleStats | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);

  // Analyze bundle in development
  const analyzeBundleSize = async () => {
    if (process.env.NODE_ENV !== 'development') return;

    try {
      // Simulate bundle analysis (in real app, this would use webpack-bundle-analyzer)
      const stats: BundleStats = {
        totalSize: 2.5 * 1024 * 1024, // 2.5MB
        gzippedSize: 800 * 1024, // 800KB
        chunkCount: 12,
        assetCount: 45,
        duplicates: [
          'lodash (imported in 3 chunks)',
          'moment (imported in 2 chunks)',
          'react-icons (imported in 4 chunks)'
        ],
        suggestions: [
          'Consider lazy loading non-critical components',
          'Remove unused imports in fingerprint components',
          'Split vendor chunks more efficiently',
          'Optimize image assets'
        ]
      };

      setBundleStats(stats);
    } catch (error) {
      console.error('Bundle analysis failed:', error);
    }
  };

  // Measure Core Web Vitals
  const measurePerformance = () => {
    if (!('performance' in window)) return;

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcp) {
        setPerformanceMetrics(prev => ({ ...prev!, fcp: fcp.startTime }));
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      setPerformanceMetrics(prev => ({ ...prev!, lcp: lastEntry.startTime }));
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        const fidEntry = entry as any; // Type assertion for FID entry
        if (fidEntry.processingStart) {
          setPerformanceMetrics(prev => ({ 
            ...prev!, 
            fid: fidEntry.processingStart - fidEntry.startTime 
          }));
        }
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const clsEntry = entry as any; // Type assertion for CLS entry
        if (!clsEntry.hadRecentInput && clsEntry.value) {
          clsValue += clsEntry.value;
          setPerformanceMetrics(prev => ({ ...prev!, cls: clsValue }));
        }
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Time to First Byte
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      setPerformanceMetrics(prev => ({ ...prev!, ttfb }));
    }

    // Cleanup observers after 30 seconds
    setTimeout(() => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
    }, 30000);
  };

  // Resource hints for preloading
  const addResourceHints = () => {
    const head = document.head;

    // Preload critical fonts
    const fontPreload = document.createElement('link');
    fontPreload.rel = 'preload';
    fontPreload.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
    fontPreload.as = 'style';
    fontPreload.crossOrigin = 'anonymous';
    head.appendChild(fontPreload);

    // DNS prefetch for external domains
    const dnsPrefetch = document.createElement('link');
    dnsPrefetch.rel = 'dns-prefetch';
    dnsPrefetch.href = '//fonts.googleapis.com';
    head.appendChild(dnsPrefetch);

    // Preconnect to critical origins
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://supabase.co';
    preconnect.crossOrigin = 'anonymous';
    head.appendChild(preconnect);
  };

  // Code splitting recommendations
  const getCodeSplittingRecommendations = () => {
    return [
      {
        component: 'EnhancedAddStudent',
        reason: '430 lines - split into smaller components',
        impact: 'High',
        savings: '~85KB'
      },
      {
        component: 'Fingerprint capture components',
        reason: 'Multiple similar implementations',
        impact: 'High',
        savings: '~120KB'
      },
      {
        component: 'Admin panels',
        reason: 'Rarely used by most users',
        impact: 'Medium',
        savings: '~45KB'
      },
      {
        component: 'Chart libraries',
        reason: 'Only used in dashboard',
        impact: 'Medium',
        savings: '~65KB'
      }
    ];
  };

  useEffect(() => {
    // Initialize performance monitoring
    measurePerformance();
    addResourceHints();
    analyzeBundleSize();

    // Set initial performance baseline
    setPerformanceMetrics({
      fcp: 0,
      lcp: 0,
      fid: 0,
      cls: 0,
      ttfb: 0
    });
  }, []);

  return {
    bundleStats,
    performanceMetrics,
    getCodeSplittingRecommendations,
    measurePerformance,
    analyzeBundleSize
  };
}

// Performance optimization utilities
export const performanceUtils = {
  // Defer non-critical JavaScript
  deferScript: (src: string, callback?: () => void) => {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.onload = callback || null;
    document.head.appendChild(script);
  },

  // Lazy load images with intersection observer
  lazyLoadImages: (selector: string = 'img[data-src]') => {
    const images = document.querySelectorAll(selector);
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            img.src = img.dataset.src!;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    } else {
      // Fallback for older browsers
      images.forEach(img => {
        const image = img as HTMLImageElement;
        image.src = image.dataset.src!;
      });
    }
  },

  // Preload critical resources
  preloadResource: (href: string, as: string, type?: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (type) link.type = type;
    document.head.appendChild(link);
  },

  // Critical CSS inlining
  inlineCriticalCSS: (css: string) => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  },

  // Service worker registration with performance tracking
  registerServiceWorker: async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw-enhanced.js');
        console.log('🚀 Enhanced Service Worker registered');
        
        // Track cache performance
        if (registration.active) {
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = (event) => {
            console.log('📊 Cache stats:', event.data);
          };
          
          registration.active.postMessage(
            { type: 'GET_CACHE_STATS' }, 
            [messageChannel.port2]
          );
        }
        
        return registration;
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
  }
};