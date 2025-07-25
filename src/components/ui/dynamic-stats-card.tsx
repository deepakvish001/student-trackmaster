
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, LucideIcon } from 'lucide-react';

interface DynamicStatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  animate?: boolean;
  realTime?: boolean;
  className?: string;
}

export function DynamicStatsCard({
  title,
  value: initialValue,
  icon: Icon,
  trend = 'neutral',
  trendValue,
  color = 'blue',
  animate = true,
  realTime = false,
  className = ""
}: DynamicStatsCardProps) {
  const [value, setValue] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);

  // Simulate real-time updates
  useEffect(() => {
    if (!realTime || typeof initialValue !== 'number') return;

    const interval = setInterval(() => {
      setIsUpdating(true);
      setTimeout(() => {
        const change = (Math.random() - 0.5) * 10;
        setValue(prev => Math.max(0, typeof prev === 'number' ? prev + change : 0));
        setIsUpdating(false);
      }, 200);
    }, 3000);

    return () => clearInterval(interval);
  }, [realTime, initialValue]);

  const colorConfig = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      accent: 'bg-blue-100'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200', 
      icon: 'text-green-600',
      accent: 'bg-green-100'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'text-purple-600',
      accent: 'bg-purple-100'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'text-orange-600',
      accent: 'bg-orange-100'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      accent: 'bg-red-100'
    }
  };

  const config = colorConfig[color];

  return (
    <Card className={`${config.bg} ${config.border} border-2 hover-lift glass-card ${
      animate ? 'animate-fade-in' : ''
    } ${isUpdating ? 'animate-pulse' : ''} ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${config.accent}`}>
          <Icon className={`h-4 w-4 ${config.icon}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-foreground">
            {typeof value === 'number' ? value.toFixed(0) : value}
            {isUpdating && (
              <Activity className="inline-block h-4 w-4 ml-2 animate-pulse" />
            )}
          </div>
          {trendValue && (
            <div className="flex items-center space-x-1">
              {trend === 'up' && (
                <TrendingUp className="h-3 w-3 text-green-600" />
              )}
              {trend === 'down' && (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <Badge 
                variant="secondary" 
                className={`text-xs ${
                  trend === 'up' ? 'bg-green-100 text-green-700' :
                  trend === 'down' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}
              >
                {trendValue}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
