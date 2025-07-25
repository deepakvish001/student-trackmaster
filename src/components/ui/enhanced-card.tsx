
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EnhancedCardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  isLoading?: boolean;
}

const variants = {
  default: 'border-border',
  success: 'border-green-200 bg-green-50/50',
  warning: 'border-yellow-200 bg-yellow-50/50',
  error: 'border-red-200 bg-red-50/50',
  info: 'border-blue-200 bg-blue-50/50'
};

const iconColors = {
  default: 'text-muted-foreground',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  error: 'text-red-600',
  info: 'text-blue-600'
};

export function EnhancedCard({
  title,
  description,
  icon: Icon,
  variant = 'default',
  children,
  className,
  headerAction,
  isLoading = false
}: EnhancedCardProps) {
  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      variants[variant],
      isLoading && 'opacity-60 pointer-events-none',
      className
    )}>
      {(title || Icon || headerAction) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className={cn(
                'p-2 rounded-lg bg-background border',
                iconColors[variant]
              )}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              {title && (
                <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              )}
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
          {headerAction && (
            <div className="flex items-center space-x-2">
              {headerAction}
            </div>
          )}
        </CardHeader>
      )}
      <CardContent className={title || Icon || headerAction ? 'pt-0' : ''}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
