
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type StatusType = 'online' | 'offline' | 'warning' | 'loading' | 'error';

interface StatusIndicatorProps {
  status?: StatusType;
  label?: string;
  showIcon?: boolean;
  animate?: boolean;
  className?: string;
  realTime?: boolean;
}

export function StatusIndicator({ 
  status = 'online', 
  label,
  showIcon = true,
  animate = true,
  className = "",
  realTime = false
}: StatusIndicatorProps) {
  const [currentStatus, setCurrentStatus] = useState<StatusType>(status);

  // Simulate real-time status updates
  useEffect(() => {
    if (!realTime) return;

    const interval = setInterval(() => {
      // Simulate occasional status changes for demo
      const random = Math.random();
      if (random > 0.95) {
        setCurrentStatus(random > 0.98 ? 'warning' : 'offline');
      } else {
        setCurrentStatus('online');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [realTime]);

  const getStatusConfig = (status: StatusType) => {
    switch (status) {
      case 'online':
        return {
          icon: CheckCircle,
          color: 'bg-green-500',
          variant: 'default' as const,
          text: label || 'Online',
          bgColor: 'bg-green-50 border-green-200'
        };
      case 'offline':
        return {
          icon: WifiOff,
          color: 'bg-red-500',
          variant: 'destructive' as const,
          text: label || 'Offline',
          bgColor: 'bg-red-50 border-red-200'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'bg-yellow-500',
          variant: 'secondary' as const,
          text: label || 'Warning',
          bgColor: 'bg-yellow-50 border-yellow-200'
        };
      case 'loading':
        return {
          icon: Activity,
          color: 'bg-blue-500',
          variant: 'secondary' as const,
          text: label || 'Connecting...',
          bgColor: 'bg-blue-50 border-blue-200'
        };
      default:
        return {
          icon: Wifi,
          color: 'bg-gray-500',
          variant: 'secondary' as const,
          text: label || 'Unknown',
          bgColor: 'bg-gray-50 border-gray-200'
        };
    }
  };

  const config = getStatusConfig(realTime ? currentStatus : status);
  const IconComponent = config.icon;

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      {showIcon && (
        <div className="relative">
          <div 
            className={`w-2 h-2 rounded-full ${config.color} ${
              animate && (realTime ? currentStatus : status) === 'online' ? 'animate-pulse' : ''
            }`}
          />
          {animate && (realTime ? currentStatus : status) === 'online' && (
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75" />
          )}
        </div>
      )}
      <Badge variant={config.variant} className={`${config.bgColor} font-medium`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    </div>
  );
}
