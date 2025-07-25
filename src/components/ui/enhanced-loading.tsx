
import React from 'react';
import { Loader2, Activity, Zap } from 'lucide-react';

interface EnhancedLoadingProps {
  message?: string;
  type?: 'spinner' | 'pulse' | 'bars' | 'shimmer';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showMessage?: boolean;
}

export function EnhancedLoading({ 
  message = "Loading...", 
  type = 'spinner',
  size = 'md',
  className = "",
  showMessage = true
}: EnhancedLoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const renderLoader = () => {
    switch (type) {
      case 'spinner':
        return (
          <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
        );
      case 'pulse':
        return (
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} 
                  bg-primary rounded-full animate-bounce`}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        );
      case 'bars':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`${size === 'sm' ? 'w-1 h-6' : size === 'lg' ? 'w-2 h-12' : 'w-1.5 h-8'} 
                  bg-primary animate-pulse`}
                style={{ 
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        );
      case 'shimmer':
        return (
          <div className={`${sizeClasses[size]} bg-gradient-to-r from-primary/30 via-primary to-primary/30 
            animate-shimmer rounded-full`} />
        );
      default:
        return <Activity className={`${sizeClasses[size]} animate-pulse text-primary`} />;
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="relative">
        {renderLoader()}
        {type === 'spinner' && (
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
        )}
      </div>
      {showMessage && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
