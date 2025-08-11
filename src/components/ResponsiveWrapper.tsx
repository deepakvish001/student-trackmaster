import React from 'react';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/useResponsive';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
  mobileClassName?: string;
  tabletClassName?: string;
  desktopClassName?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
}

const maxWidthClasses = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md', 
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  full: 'max-w-full'
};

export function ResponsiveWrapper({
  children,
  className,
  mobileClassName,
  tabletClassName,
  desktopClassName,
  maxWidth = 'full'
}: ResponsiveWrapperProps) {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const responsiveClasses = cn(
    'w-full mx-auto px-4 sm:px-6 lg:px-8',
    maxWidthClasses[maxWidth],
    isMobile && mobileClassName,
    isTablet && tabletClassName,
    isDesktop && desktopClassName,
    className
  );

  return (
    <div className={responsiveClasses}>
      {children}
    </div>
  );
}

// Responsive Grid Component
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
}

export function ResponsiveGrid({
  children,
  className,
  cols = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
  gap = { xs: 4, sm: 6, md: 8, lg: 10 }
}: ResponsiveGridProps) {
  const gridClasses = cn(
    'grid',
    `grid-cols-${cols.xs || 1}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    `gap-${gap.xs || 4}`,
    gap.sm && `sm:gap-${gap.sm}`,
    gap.md && `md:gap-${gap.md}`,
    gap.lg && `lg:gap-${gap.lg}`,
    className
  );

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}

// Responsive Stack Component
interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'row' | 'col';
  spacing?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
}

export function ResponsiveStack({
  children,
  className,
  direction = 'col',
  spacing = { xs: 4, sm: 6, md: 8 },
  align = 'start',
  justify = 'start'
}: ResponsiveStackProps) {
  const stackClasses = cn(
    'flex',
    direction === 'row' ? 'flex-row' : 'flex-col',
    `items-${align}`,
    `justify-${justify}`,
    direction === 'row' 
      ? [
          `space-x-${spacing.xs || 4}`,
          spacing.sm && `sm:space-x-${spacing.sm}`,
          spacing.md && `md:space-x-${spacing.md}`,
          spacing.lg && `lg:space-x-${spacing.lg}`
        ]
      : [
          `space-y-${spacing.xs || 4}`,
          spacing.sm && `sm:space-y-${spacing.sm}`,
          spacing.md && `md:space-y-${spacing.md}`,
          spacing.lg && `lg:space-y-${spacing.lg}`
        ],
    className
  );

  return (
    <div className={stackClasses}>
      {children}
    </div>
  );
}

// Responsive Container Component
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  fluid?: boolean;
  centered?: boolean;
  padding?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
}

export function ResponsiveContainer({
  children,
  className,
  fluid = false,
  centered = true,
  padding = { xs: 4, sm: 6, md: 8, lg: 12 }
}: ResponsiveContainerProps) {
  const containerClasses = cn(
    'w-full',
    !fluid && 'max-w-7xl',
    centered && 'mx-auto',
    `px-${padding.xs || 4}`,
    padding.sm && `sm:px-${padding.sm}`,
    padding.md && `md:px-${padding.md}`,
    padding.lg && `lg:px-${padding.lg}`,
    className
  );

  return (
    <div className={containerClasses}>
      {children}
    </div>
  );
}