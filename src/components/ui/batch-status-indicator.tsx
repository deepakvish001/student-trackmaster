import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Power, PowerOff } from 'lucide-react';
import { Batch } from '@/types/batch';

interface BatchStatusIndicatorProps {
  batch: Batch;
  onToggle?: (batch: Batch) => void;
  showToggleButton?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const BatchStatusIndicator = ({ 
  batch, 
  onToggle, 
  showToggleButton = false,
  size = 'md' 
}: BatchStatusIndicatorProps) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const StatusBadge = () => (
    <Badge 
      className={`${
        batch.is_enabled 
          ? 'bg-emerald-green/20 text-emerald-green border-emerald-green/30 shadow-emerald-green/20' 
          : 'bg-pink-rose/20 text-pink-rose border-pink-rose/30 shadow-pink-rose/20'
      } shadow-lg font-medium transition-all duration-200 ${sizeClasses[size]}`}
    >
      <div className="flex items-center space-x-1">
        {batch.is_enabled ? (
          <Power className="h-3 w-3" />
        ) : (
          <PowerOff className="h-3 w-3" />
        )}
        <span>{batch.is_enabled ? 'Enabled' : 'Disabled'}</span>
      </div>
    </Badge>
  );

  if (showToggleButton && onToggle) {
    return (
      <div className="flex items-center space-x-2">
        <StatusBadge />
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggle(batch)}
          className={`${
            batch.is_enabled 
              ? 'hover:bg-pink-rose/10 border-pink-rose/30 text-pink-rose' 
              : 'hover:bg-emerald-green/10 border-emerald-green/30 text-emerald-green'
          } transition-all duration-200`}
        >
          {batch.is_enabled ? (
            <>
              <PowerOff className="h-3 w-3 mr-1" />
              Disable
            </>
          ) : (
            <>
              <Power className="h-3 w-3 mr-1" />
              Enable
            </>
          )}
        </Button>
      </div>
    );
  }

  return <StatusBadge />;
};