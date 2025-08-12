import React from 'react';
import { Wifi, WifiOff, Clock, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityIndicatorProps {
  status: 'online' | 'offline' | 'syncing' | 'error' | 'success' | 'processing';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  pulse?: boolean;
  className?: string;
}

const statusConfig = {
  online: {
    icon: Wifi,
    color: 'text-emerald-green',
    bgColor: 'bg-emerald-green/20',
    borderColor: 'border-emerald-green/30',
    label: 'Online'
  },
  offline: {
    icon: WifiOff,
    color: 'text-destructive',
    bgColor: 'bg-destructive/20',
    borderColor: 'border-destructive/30',
    label: 'Offline'
  },
  syncing: {
    icon: Clock,
    color: 'text-sunset-orange',
    bgColor: 'bg-sunset-orange/20',
    borderColor: 'border-sunset-orange/30',
    label: 'Syncing'
  },
  error: {
    icon: AlertCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/20',
    borderColor: 'border-destructive/30',
    label: 'Error'
  },
  success: {
    icon: CheckCircle,
    color: 'text-emerald-green',
    bgColor: 'bg-emerald-green/20',
    borderColor: 'border-emerald-green/30',
    label: 'Success'
  },
  processing: {
    icon: Zap,
    color: 'text-electric-blue',
    bgColor: 'bg-electric-blue/20',
    borderColor: 'border-electric-blue/30',
    label: 'Processing'
  }
};

const sizeClasses = {
  sm: {
    container: 'h-6 px-2',
    icon: 'h-3 w-3',
    text: 'text-xs'
  },
  md: {
    container: 'h-8 px-3',
    icon: 'h-4 w-4',
    text: 'text-sm'
  },
  lg: {
    container: 'h-10 px-4',
    icon: 'h-5 w-5',
    text: 'text-base'
  }
};

export function ActivityIndicator({
  status,
  label,
  size = 'md',
  showLabel = true,
  pulse = false,
  className
}: ActivityIndicatorProps) {
  const config = statusConfig[status];
  const sizeConfig = sizeClasses[size];
  const Icon = config.icon;
  const displayLabel = label || config.label;

  const shouldAnimate = status === 'syncing' || status === 'processing' || pulse;

  return (
    <div className={cn(
      'inline-flex items-center space-x-2 rounded-full border transition-all duration-200',
      config.bgColor,
      config.borderColor,
      sizeConfig.container,
      className
    )}>
      <Icon className={cn(
        sizeConfig.icon,
        config.color,
        shouldAnimate && 'animate-spin'
      )} />
      {showLabel && (
        <span className={cn(
          'font-medium',
          config.color,
          sizeConfig.text
        )}>
          {displayLabel}
        </span>
      )}
    </div>
  );
}

// Real-time status component
interface RealTimeStatusProps {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync?: Date;
  className?: string;
}

export function RealTimeStatus({ isOnline, isSyncing, lastSync, className }: RealTimeStatusProps) {
  const getStatus = () => {
    if (!isOnline) return 'offline';
    if (isSyncing) return 'syncing';
    return 'online';
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className={cn('flex items-center space-x-3', className)}>
      <ActivityIndicator status={getStatus()} size="sm" />
      {lastSync && (
        <span className="text-xs text-muted-foreground">
          Last sync: {formatLastSync(lastSync)}
        </span>
      )}
    </div>
  );
}

// User presence indicators
interface UserPresenceProps {
  users: Array<{
    id: string;
    name: string;
    avatar?: string;
    status: 'active' | 'idle' | 'away';
  }>;
  maxVisible?: number;
  className?: string;
}

export function UserPresence({ users, maxVisible = 3, className }: UserPresenceProps) {
  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-green';
      case 'idle': return 'bg-sunset-orange';
      case 'away': return 'bg-muted-foreground';
      default: return 'bg-muted-foreground';
    }
  };

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      {visibleUsers.map((user) => (
        <div key={user.id} className="relative">
          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
            getStatusColor(user.status)
          )} />
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
          <span className="text-xs font-medium text-muted-foreground">
            +{remainingCount}
          </span>
        </div>
      )}
    </div>
  );
}