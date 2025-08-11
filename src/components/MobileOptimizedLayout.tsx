import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MobileOptimizedLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileOptimizedLayout({ children, className }: MobileOptimizedLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "min-h-screen safe-area-inset-top safe-area-inset-bottom",
        isMobile ? "mobile-layout" : "desktop-layout",
        className
      )}
    >
      {children}
    </div>
  );
}

// Mobile-first responsive wrapper for forms
export function ResponsiveFormWrapper({ children, className }: MobileOptimizedLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "w-full",
        isMobile 
          ? "px-4 py-6 space-y-4" 
          : "px-6 py-8 space-y-6 max-w-2xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

// Responsive grid component
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  className?: string;
}

export function ResponsiveGrid({ 
  children, 
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = { mobile: 4, tablet: 6, desktop: 8 },
  className 
}: ResponsiveGridProps) {
  const gridClasses = cn(
    "grid",
    `grid-cols-${columns.mobile}`,
    `md:grid-cols-${columns.tablet}`,
    `lg:grid-cols-${columns.desktop}`,
    `gap-${gap.mobile}`,
    `md:gap-${gap.tablet}`,
    `lg:gap-${gap.desktop}`,
    className
  );

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}