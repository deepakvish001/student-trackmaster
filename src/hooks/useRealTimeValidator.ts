import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOnlineStatus';
import { useToast } from './use-toast';

interface SystemValidationState {
  isValidating: boolean;
  lastValidation: Date | null;
  errors: string[];
  healthScore: number;
}

/**
 * Real-time system validator hook
 * Ensures all real-time features are working correctly
 */
export function useRealTimeValidator() {
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();
  const { toast } = useToast();
  const validationRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidationRef = useRef<Date | null>(null);

  const [validationState, setValidationState] = useState<SystemValidationState>({
    isValidating: false,
    lastValidation: null,
    errors: [],
    healthScore: 100
  });

  // Validate real-time connections
  const validateRealTimeConnections = useCallback(async () => {
    if (!isOnline) return { success: true, errors: [] };

    const errors: string[] = [];
    let healthScore = 100;

    try {
      // Test Supabase connection
      const { error: dbError } = await supabase.from('students').select('id').limit(1);
      if (dbError) {
        errors.push('Database connection failed');
        healthScore -= 30;
      }

      // Test real-time subscription
      const testChannel = supabase.channel('test-connection');
      let subscriptionWorking = false;
      
      const subscriptionPromise = new Promise((resolve) => {
        testChannel.on('presence', { event: 'sync' }, () => {
          subscriptionWorking = true;
          resolve(true);
        }).subscribe();
        
        setTimeout(() => resolve(false), 3000);
      });

      await subscriptionPromise;
      supabase.removeChannel(testChannel);

      if (!subscriptionWorking) {
        errors.push('Real-time subscriptions not responding');
        healthScore -= 40;
      }

      // Check query cache health
      const cacheKeys = queryClient.getQueryCache().getAll();
      const staleCaches = cacheKeys.filter(cache => {
        const dataUpdatedAt = cache.state.dataUpdatedAt;
        return dataUpdatedAt && (Date.now() - dataUpdatedAt) > 10 * 60 * 1000; // 10 minutes
      });

      if (staleCaches.length > 5) {
        errors.push('Multiple stale caches detected');
        healthScore -= 20;
      }

      return { success: errors.length === 0, errors, healthScore };
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, errors, healthScore: 0 };
    }
  }, [isOnline, queryClient]);

  // Run validation
  const runValidation = useCallback(async () => {
    setValidationState(prev => ({ ...prev, isValidating: true }));

    const result = await validateRealTimeConnections();
    const now = new Date();

    setValidationState({
      isValidating: false,
      lastValidation: now,
      errors: result.errors,
      healthScore: result.healthScore
    });

    lastValidationRef.current = now;

    // Show notifications for critical issues
    if (result.healthScore < 70) {
      toast({
        title: "System Health Warning",
        description: `Health score: ${result.healthScore}%. Issues detected: ${result.errors.join(', ')}`,
        variant: "destructive",
        duration: 5000
      });
    }

    return result;
  }, [validateRealTimeConnections, toast]);

  // Auto-validate every 5 minutes
  useEffect(() => {
    const startValidation = () => {
      if (validationRef.current) {
        clearInterval(validationRef.current);
      }

      validationRef.current = setInterval(() => {
        if (isOnline && !validationState.isValidating) {
          runValidation();
        }
      }, 5 * 60 * 1000); // 5 minutes
    };

    startValidation();
    
    // Run initial validation after 30 seconds
    const initialTimeout = setTimeout(() => {
      if (isOnline) {
        runValidation();
      }
    }, 30000);

    return () => {
      if (validationRef.current) {
        clearInterval(validationRef.current);
      }
      clearTimeout(initialTimeout);
    };
  }, [isOnline, runValidation, validationState.isValidating]);

  // Force cache refresh for stale data
  const refreshStaleData = useCallback(() => {
    console.log('🔄 Refreshing stale data...');
    
    const queryKeys = [
      ['students-optimized'],
      ['ultra-fast-students'],
      ['batches'],
      ['ultra-fast-batches'],
      ['dashboard-stats'],
      ['ultra-fast-dashboard-stats'],
      ['user-profile'],
      ['restricted-batches'],
      ['restricted-students']
    ];

    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });

    toast({
      title: "Data Refreshed",
      description: "All cached data has been refreshed",
      duration: 2000
    });
  }, [queryClient, toast]);

  return {
    validationState,
    runValidation,
    refreshStaleData,
    isHealthy: validationState.healthScore >= 80
  };
}