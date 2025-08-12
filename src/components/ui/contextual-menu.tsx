import React, { useState, useEffect } from 'react';
import { MoreVertical, Copy, Edit, Delete, Share, Archive, Star } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ContextualAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  variant?: 'default' | 'destructive';
  onClick: () => void;
  disabled?: boolean;
}

interface ContextualActionGroup {
  id: string;
  label?: string;
  actions: ContextualAction[];
}

interface ContextualMenuProps {
  children: React.ReactNode;
  actions?: ContextualAction[];
  actionGroups?: ContextualActionGroup[];
  className?: string;
}

interface QuickActionsProps {
  actions: ContextualAction[];
  className?: string;
  maxVisible?: number;
}

// Default actions for common use cases
export const createDefaultActions = (
  onEdit?: () => void,
  onDelete?: () => void,
  onCopy?: () => void,
  onShare?: () => void
): ContextualAction[] => [
  ...(onEdit ? [{
    id: 'edit',
    label: 'Edit',
    icon: Edit,
    shortcut: '⌘E',
    onClick: onEdit
  }] : []),
  ...(onCopy ? [{
    id: 'copy',
    label: 'Copy',
    icon: Copy,
    shortcut: '⌘C',
    onClick: onCopy
  }] : []),
  ...(onShare ? [{
    id: 'share',
    label: 'Share',
    icon: Share,
    shortcut: '⌘S',
    onClick: onShare
  }] : []),
  ...(onDelete ? [{
    id: 'delete',
    label: 'Delete',
    icon: Delete,
    shortcut: '⌘D',
    variant: 'destructive' as const,
    onClick: onDelete
  }] : [])
];

export function ContextualMenu({ 
  children, 
  actions = [], 
  actionGroups = [],
  className 
}: ContextualMenuProps) {
  const renderAction = (action: ContextualAction) => {
    const Icon = action.icon;
    
    return (
      <ContextMenuItem
        key={action.id}
        onClick={action.onClick}
        disabled={action.disabled}
        className={cn(
          action.variant === 'destructive' && 'text-destructive focus:text-destructive',
          'cursor-pointer'
        )}
      >
        {Icon && <Icon className="mr-2 h-4 w-4" />}
        <span>{action.label}</span>
        {action.shortcut && (
          <ContextMenuShortcut>{action.shortcut}</ContextMenuShortcut>
        )}
      </ContextMenuItem>
    );
  };

  const hasContent = actions.length > 0 || actionGroups.length > 0;

  if (!hasContent) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className={className}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* Render standalone actions first */}
        {actions.map(renderAction)}
        
        {/* Add separator if we have both actions and groups */}
        {actions.length > 0 && actionGroups.length > 0 && (
          <ContextMenuSeparator />
        )}
        
        {/* Render action groups */}
        {actionGroups.map((group, groupIndex) => (
          <React.Fragment key={group.id}>
            {group.label ? (
              <ContextMenuSub>
                <ContextMenuSubTrigger>{group.label}</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-48">
                  {group.actions.map(renderAction)}
                </ContextMenuSubContent>
              </ContextMenuSub>
            ) : (
              group.actions.map(renderAction)
            )}
            
            {/* Add separator between groups (but not after the last one) */}
            {groupIndex < actionGroups.length - 1 && (
              <ContextMenuSeparator />
            )}
          </React.Fragment>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Quick Actions Toolbar Component
export function QuickActionsToolbar({ 
  actions, 
  className, 
  maxVisible = 3 
}: QuickActionsProps) {
  const visibleActions = actions.slice(0, maxVisible);
  const hiddenActions = actions.slice(maxVisible);

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      {/* Visible action buttons */}
      {visibleActions.map((action) => {
        const Icon = action.icon;
        
        return (
          <Button
            key={action.id}
            variant="ghost"
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              'h-8 w-8 p-0',
              action.variant === 'destructive' && 'hover:text-destructive'
            )}
            title={action.label}
          >
            {Icon && <Icon className="h-4 w-4" />}
          </Button>
        );
      })}
      
      {/* Overflow menu for hidden actions */}
      {hiddenActions.length > 0 && (
        <ContextualMenu actions={hiddenActions}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </ContextualMenu>
      )}
    </div>
  );
}

// Context Menu Hook for keyboard shortcuts
export function useContextualShortcuts(actions: ContextualAction[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;
      
      if (!modifierKey) return;
      
      actions.forEach(action => {
        if (action.shortcut && !action.disabled) {
          const shortcutKey = action.shortcut.split(/[⌘+]/).pop()?.toLowerCase();
          const eventKey = event.key.toLowerCase();
          
          if (shortcutKey === eventKey) {
            event.preventDefault();
            action.onClick();
          }
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
}

// Predefined action groups for common use cases
export const createStudentActions = (
  student: any,
  onEdit: () => void,
  onDelete: () => void,
  onViewDetails: () => void
): ContextualActionGroup[] => [
  {
    id: 'primary',
    actions: [
      {
        id: 'view',
        label: 'View Details',
        icon: Edit,
        onClick: onViewDetails
      },
      {
        id: 'edit',
        label: 'Edit Student',
        icon: Edit,
        onClick: onEdit
      }
    ]
  },
  {
    id: 'secondary',
    actions: [
      {
        id: 'archive',
        label: 'Archive',
        icon: Archive,
        onClick: () => console.log('Archive student')
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: Delete,
        variant: 'destructive',
        onClick: onDelete
      }
    ]
  }
];

export const createBatchActions = (
  batch: any,
  onEdit: () => void,
  onDelete: () => void,
  onToggleStatus: () => void
): ContextualAction[] => [
  {
    id: 'edit',
    label: 'Edit Batch',
    icon: Edit,
    onClick: onEdit
  },
  {
    id: 'toggle-status',
    label: batch.is_enabled ? 'Disable' : 'Enable',
    icon: Star,
    onClick: onToggleStatus
  },
  {
    id: 'delete',
    label: 'Delete Batch',
    icon: Delete,
    variant: 'destructive',
    onClick: onDelete
  }
];