// Enhanced code splitting with lazy loading and error boundaries
import React, { Suspense, lazy, ComponentType } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

// Enhanced loading fallback with skeleton
function EnhancedLoadingFallback({ type = 'page' }: { type?: 'page' | 'component' | 'modal' }) {
  const skeletonClasses = "animate-pulse bg-muted rounded";
  
  switch (type) {
    case 'page':
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading page...</p>
          </div>
        </div>
      );
    
    case 'component':
      return (
        <div className="space-y-3 p-4">
          <div className={`h-4 w-3/4 ${skeletonClasses}`} />
          <div className={`h-4 w-1/2 ${skeletonClasses}`} />
          <div className={`h-32 w-full ${skeletonClasses}`} />
        </div>
      );
    
    case 'modal':
      return (
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner size="lg" />
        </div>
      );
    
    default:
      return <LoadingSpinner />;
  }
}

// Error boundary for lazy loaded components
class LazyErrorBoundary extends React.Component<
  LazyComponentProps & { retry: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: LazyComponentProps & { retry: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert className="border-destructive/20 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <p>Failed to load component. This might be due to a network issue.</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  this.props.retry();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for lazy loading with retries
export function withLazyLoading<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallbackType: 'page' | 'component' | 'modal' = 'component'
) {
  const LazyComponent = lazy(importFn);
  
  const WrappedComponent = (props: React.ComponentProps<T>) => {
    const [retryKey, setRetryKey] = React.useState(0);
    
    const retry = React.useCallback(() => {
      setRetryKey(prev => prev + 1);
    }, []);

    return (
      <LazyErrorBoundary retry={retry} key={retryKey}>
        <Suspense fallback={<EnhancedLoadingFallback type={fallbackType} />}>
          <LazyComponent {...props} />
        </Suspense>
      </LazyErrorBoundary>
    );
  };
  
  return WrappedComponent;
}

// Preload function for critical routes
export function preloadComponent(importFn: () => Promise<any>) {
  // Preload on idle or after a delay
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => importFn());
  } else {
    setTimeout(() => importFn(), 100);
  }
}

// Hook for progressive enhancement
export function useProgressiveEnhancement() {
  const [isEnhanced, setIsEnhanced] = React.useState(false);
  
  React.useEffect(() => {
    // Enable enhancements after initial render
    const timer = setTimeout(() => setIsEnhanced(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  return isEnhanced;
}