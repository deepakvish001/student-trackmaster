import React from 'react';
import { Loader2, Zap, Database, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvancedLoadingProps {
  variant?: 'spinner' | 'skeleton' | 'progress' | 'pulse' | 'shimmer';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  progress?: number;
  className?: string;
  type?: 'general' | 'data' | 'security' | 'users' | 'processing';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

const typeIcons = {
  general: Zap,
  data: Database,
  security: Shield,
  users: Users,
  processing: Loader2
};

export function AdvancedLoading({
  variant = 'spinner',
  size = 'md',
  text,
  progress,
  className,
  type = 'general'
}: AdvancedLoadingProps) {
  const Icon = typeIcons[type];

  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center space-x-3">
          <div className="rounded-full bg-muted h-10 w-10 loading-shimmer" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded loading-shimmer w-3/4" />
            <div className="h-3 bg-muted rounded loading-shimmer w-1/2" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded loading-shimmer" />
          <div className="h-4 bg-muted rounded loading-shimmer w-5/6" />
          <div className="h-4 bg-muted rounded loading-shimmer w-4/6" />
        </div>
      </div>
    );
  }

  if (variant === 'progress' && progress !== undefined) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center space-x-3">
          <Icon className={cn(sizeClasses[size], 'text-primary animate-pulse')} />
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-foreground">
                {text || 'Loading...'}
              </span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex items-center justify-center space-x-2', className)}>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        {text && (
          <span className="text-sm text-muted-foreground ml-2">{text}</span>
        )}
      </div>
    );
  }

  if (variant === 'shimmer') {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center space-x-4">
          <div className="rounded-lg bg-muted h-12 w-12 loading-shimmer" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded loading-shimmer" />
            <div className="h-3 bg-muted rounded loading-shimmer w-2/3" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-muted rounded-lg loading-shimmer" />
          <div className="h-20 bg-muted rounded-lg loading-shimmer" />
          <div className="h-20 bg-muted rounded-lg loading-shimmer" />
        </div>
      </div>
    );
  }

  // Default spinner variant
  return (
    <div className={cn('flex items-center justify-center space-x-3', className)}>
      <Icon className={cn(sizeClasses[size], 'text-primary animate-spin')} />
      {text && (
        <span className="text-sm font-medium text-foreground animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
}

// Skeleton components for specific use cases
export function LoadingSkeleton({ className, ...props }: { className?: string }) {
  return <AdvancedLoading variant="skeleton" className={className} {...props} />;
}

export function LoadingSpinner({ className, ...props }: { className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return <AdvancedLoading variant="spinner" className={className} {...props} />;
}

export function LoadingProgress({ progress, text, className }: { progress: number; text?: string; className?: string }) {
  return <AdvancedLoading variant="progress" progress={progress} text={text} className={className} />;
}