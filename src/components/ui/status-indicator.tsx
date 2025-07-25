
/**
 * Phase 4: Status Indicator Component
 * Visual status indicators for system health and test results
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, XCircle, Clock, Loader2 } from 'lucide-react';

export interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'loading' | 'pending';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
  text?: string;
  className?: string;
  pulse?: boolean;
}

const statusConfig = {
  success: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
    icon: CheckCircle,
    defaultText: 'Success'
  },
  warning: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200',
    icon: AlertTriangle,
    defaultText: 'Warning'
  },
  error: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    icon: XCircle,
    defaultText: 'Error'
  },
  loading: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
    icon: Loader2,
    defaultText: 'Loading'
  },
  pending: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    icon: Clock,
    defaultText: 'Pending'
  }
};

const sizeConfig = {
  sm: {
    container: 'px-2 py-1 text-xs',
    icon: 'h-3 w-3',
    gap: 'space-x-1'
  },
  md: {
    container: 'px-3 py-1.5 text-sm',
    icon: 'h-4 w-4',
    gap: 'space-x-2'
  },
  lg: {
    container: 'px-4 py-2 text-base',
    icon: 'h-5 w-5',
    gap: 'space-x-2'
  }
};

export function StatusIndicator({
  status,
  size = 'md',
  showIcon = true,
  showText = true,
  text,
  className,
  pulse = false
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  const displayText = text || config.defaultText;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-all duration-200',
        config.bgColor,
        config.borderColor,
        config.color,
        sizeStyles.container,
        sizeStyles.gap,
        pulse && 'animate-pulse',
        className
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            sizeStyles.icon,
            status === 'loading' && 'animate-spin'
          )}
        />
      )}
      {showText && <span>{displayText}</span>}
    </div>
  );
}

// Preset status indicators for common use cases
export function HealthStatus({ status }: { status: 'healthy' | 'warning' | 'critical' }) {
  const statusMap = {
    healthy: 'success',
    warning: 'warning',
    critical: 'error'
  } as const;

  return (
    <StatusIndicator
      status={statusMap[status]}
      text={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  );
}

export function TestStatus({ passed }: { passed: boolean }) {
  return (
    <StatusIndicator
      status={passed ? 'success' : 'error'}
      text={passed ? 'Passed' : 'Failed'}
    />
  );
}

export function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <StatusIndicator
      status={connected ? 'success' : 'error'}
      text={connected ? 'Connected' : 'Disconnected'}
      pulse={!connected}
    />
  );
}
