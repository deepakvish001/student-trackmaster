
import { useState, useEffect, useRef } from 'react';
import { rdServiceClient } from '@/services/rdServiceClient';

export function useRDService() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs to prevent memory leaks
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const backoffTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Configuration
  const CHECK_INTERVAL = 5000; // Check every 5 seconds when available
  const RETRY_INTERVAL = 30000; // Retry every 30 seconds when not available
  const MAX_RETRIES = 10; // Maximum retry attempts before giving up
  const MIN_CHECK_INTERVAL = 1000; // Minimum time between checks

  // Clean up on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (backoffTimeoutRef.current) {
        clearTimeout(backoffTimeoutRef.current);
      }
    };
  }, []);

  // Check service availability with rate limiting
  const checkAvailability = async (force = false) => {
    if (!mountedRef.current) return;

    const now = Date.now();
    
    // Rate limiting: prevent too frequent checks
    if (!force && now - lastCheckTime < MIN_CHECK_INTERVAL) {
      return;
    }

    // Skip if already checking
    if (isChecking) {
      return;
    }

    setIsChecking(true);
    setLastCheckTime(now);

    try {
      const available = await rdServiceClient.isServiceAvailable();
      
      if (!mountedRef.current) return;

      if (available) {
        setIsAvailable(true);
        setError(null);
        setRetryCount(0);
        
        // If service becomes available, check more frequently
        if (!isInitialized) {
          setIsInitialized(true);
          startPeriodicCheck(CHECK_INTERVAL);
        }
      } else {
        handleServiceUnavailable();
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Service check failed';
      console.warn('RD Service check failed:', errorMessage);
      
      handleServiceUnavailable();
    } finally {
      if (mountedRef.current) {
        setIsChecking(false);
      }
    }
  };

  // Handle service unavailable state
  const handleServiceUnavailable = () => {
    setIsAvailable(false);
    
    if (retryCount < MAX_RETRIES) {
      const nextRetryCount = retryCount + 1;
      setRetryCount(nextRetryCount);
      
      // Exponential backoff for retries
      const backoffTime = Math.min(RETRY_INTERVAL * Math.pow(1.5, nextRetryCount - 1), 60000);
      
      setError(`RD Service not available. Retrying in ${Math.round(backoffTime/1000)}s (${nextRetryCount}/${MAX_RETRIES})`);
      
      // Schedule next retry
      if (backoffTimeoutRef.current) {
        clearTimeout(backoffTimeoutRef.current);
      }
      
      backoffTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          checkAvailability(true);
        }
      }, backoffTime);
    } else {
      setError('RD Service is not available. Please check if the service is running on port 11100.');
      
      // Stop periodic checking after max retries
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    }
  };

  // Start periodic availability checking
  const startPeriodicCheck = (interval: number) => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }
    
    checkIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        checkAvailability();
      }
    }, interval);
  };

  // Initialize service checking
  useEffect(() => {
    if (!isInitialized) {
      // Initial check with a small delay to avoid immediate spam
      const initTimeout = setTimeout(() => {
        if (mountedRef.current) {
          checkAvailability(true);
        }
      }, 1000);

      return () => clearTimeout(initTimeout);
    }
  }, [isInitialized]);

  // Capture fingerprint with proper error handling
  const captureFingerprint = async (timeout: number = 10000) => {
    if (!isAvailable) {
      throw new Error('RD Service is not available. Please check your connection.');
    }

    try {
      const result = await rdServiceClient.captureFingerprint(timeout);
      
      // Update availability status based on capture result
      if (result && mountedRef.current) {
        setIsAvailable(true);
        setError(null);
        setRetryCount(0);
      }
      
      return result;
    } catch (err) {
      // If capture fails, it might indicate service is no longer available
      if (mountedRef.current) {
        setIsAvailable(false);
        
        // Restart checking process
        setTimeout(() => {
          if (mountedRef.current) {
            checkAvailability(true);
          }
        }, 2000);
      }
      
      throw err;
    }
  };

  // Manual retry function
  const retry = () => {
    setRetryCount(0);
    setError(null);
    checkAvailability(true);
  };

  // Get device info
  const getDeviceInfo = async () => {
    if (!isAvailable) {
      throw new Error('RD Service is not available');
    }
    
    return rdServiceClient.getDeviceInfo();
  };

  return {
    isAvailable,
    isChecking,
    error,
    retryCount,
    maxRetries: MAX_RETRIES,
    captureFingerprint,
    getDeviceInfo,
    retry,
    checkAvailability: () => checkAvailability(true)
  };
}
