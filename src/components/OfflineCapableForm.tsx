import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { WifiOff, Cloud, Save, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineCapableFormProps {
  children: React.ReactNode;
  className?: string;
  onSubmit?: (data: any) => void;
  formData?: any;
  isDirty?: boolean;
  isSubmitting?: boolean;
}

export function OfflineCapableForm({ 
  children, 
  className, 
  onSubmit,
  formData,
  isDirty = false,
  isSubmitting = false
}: OfflineCapableFormProps) {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);

  // Auto-save draft when offline or slow connection
  useEffect(() => {
    if ((!isOnline || isSlowConnection) && isDirty && formData) {
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem('form-draft', JSON.stringify({
            data: formData,
            timestamp: new Date().toISOString(),
            url: window.location.pathname
          }));
          setDraftSavedAt(new Date());
        } catch (error) {
          console.error('Failed to save draft:', error);
        }
      }, 2000); // Save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [formData, isDirty, isOnline, isSlowConnection]);

  // Load draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('form-draft');
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft.url === window.location.pathname) {
          setDraftSavedAt(new Date(draft.timestamp));
        }
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, []);

  const clearDraft = () => {
    localStorage.removeItem('form-draft');
    setDraftSavedAt(null);
  };

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        label: 'Offline Mode',
        variant: 'destructive' as const,
        description: 'Changes will be saved locally and synced when connection is restored'
      };
    }

    if (isSlowConnection) {
      return {
        icon: Clock,
        label: 'Slow Connection',
        variant: 'secondary' as const,
        description: 'Form will auto-save locally to prevent data loss'
      };
    }

    return {
      icon: Cloud,
      label: 'Online',
      variant: 'default' as const,
      description: 'Form will save directly to server'
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Card className={cn("relative", className)}>
      {/* Status indicator */}
      <div className="absolute top-4 right-4 z-10">
        <Badge variant={statusInfo.variant} className="gap-2">
          <StatusIcon className="h-3 w-3" />
          {statusInfo.label}
        </Badge>
      </div>

      {/* Offline/slow connection warning */}
      {(!isOnline || isSlowConnection) && (
        <Alert className="mb-4 border-sunset-orange/20 bg-sunset-orange/5">
          <StatusIcon className="h-4 w-4" />
          <AlertDescription>
            {statusInfo.description}
            {draftSavedAt && (
              <span className="block mt-1 text-xs text-muted-foreground">
                Draft saved at {draftSavedAt.toLocaleTimeString()}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Draft recovery */}
      {draftSavedAt && (
        <Alert className="mb-4 border-electric-blue/20 bg-electric-blue/5">
          <Save className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Draft from {draftSavedAt.toLocaleString()} available
            </span>
            <Button variant="outline" size="sm" onClick={clearDraft}>
              Clear Draft
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Form content */}
      <div className="space-y-6 p-6">
        {children}
      </div>

      {/* Offline submission indicator */}
      {!isOnline && isSubmitting && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Save className="h-5 w-5 animate-pulse" />
              <span className="font-medium">Saving Offline...</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Data will sync when connection is restored
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}