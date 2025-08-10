import React from 'react';
import { BatchStatusIndicator } from '@/components/ui/batch-status-indicator';
import { Batch } from '@/types/batch';

interface BatchStatusButtonProps {
  isEnabled: boolean;
  onClick: () => void;
  batch?: Batch;
}

export const BatchStatusButton = ({ isEnabled, onClick, batch }: BatchStatusButtonProps) => {
  // If we have batch data, use the new indicator
  if (batch) {
    return (
      <BatchStatusIndicator 
        batch={batch} 
        onToggle={() => onClick()}
        showToggleButton={true}
        size="sm"
      />
    );
  }

  // Fallback to simple button for backward compatibility
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
        isEnabled 
          ? 'bg-emerald-green/20 text-emerald-green border border-emerald-green/30 hover:bg-emerald-green/30' 
          : 'bg-pink-rose/20 text-pink-rose border border-pink-rose/30 hover:bg-pink-rose/30'
      }`}
    >
      {isEnabled ? 'Enabled' : 'Disabled'}
    </button>
  );
};