import { useState, useEffect, useCallback, useRef } from 'react';

interface ConnectionState {
  isConnected: boolean;
  retryCount: number;
  lastAttempt: number;
  maxRetries: number;
}

export function useStableConnection(
  connect: () => Promise<void>,
  disconnect: () => void,
  isOnline: boolean,
  retryDelay: number = 2000
) {
  const [state, setState] = useState<ConnectionState>({
    isConnected: false,
    retryCount: 0,
    lastAttempt: 0,
    maxRetries: 3
  });

  const isConnecting = useRef(false);
  const isDisconnecting = useRef(false);
  const retryTimeout = useRef<NodeJS.Timeout | null>(null);

  const attemptConnection = useCallback(async () => {
    if (isConnecting.current || isDisconnecting.current || !isOnline) return;
    
    const now = Date.now();
    if (now - state.lastAttempt < retryDelay) return;

    isConnecting.current = true;
    console.log('[StableConnection] Attempting connection...');

    try {
      await connect();
      setState(prev => ({
        ...prev,
        isConnected: true,
        retryCount: 0,
        lastAttempt: now
      }));
      console.log('[StableConnection] Connected successfully');
    } catch (error) {
      console.error('[StableConnection] Connection failed:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        retryCount: prev.retryCount + 1,
        lastAttempt: now
      }));

      // Schedule retry if not exceeded max retries
      if (state.retryCount < state.maxRetries) {
        retryTimeout.current = setTimeout(() => {
          attemptConnection();
        }, retryDelay * Math.pow(2, state.retryCount)); // Exponential backoff
      }
    } finally {
      isConnecting.current = false;
    }
  }, [connect, isOnline, retryDelay, state.lastAttempt, state.retryCount, state.maxRetries]);

  const handleDisconnect = useCallback(() => {
    if (isDisconnecting.current) return;
    
    isDisconnecting.current = true;
    console.log('[StableConnection] Disconnecting...');

    try {
      disconnect();
      setState(prev => ({
        ...prev,
        isConnected: false,
        retryCount: 0
      }));
    } catch (error) {
      console.error('[StableConnection] Disconnect error:', error);
    } finally {
      isDisconnecting.current = false;
    }
  }, [disconnect]);

  useEffect(() => {
    if (retryTimeout.current) {
      clearTimeout(retryTimeout.current);
    }

    if (isOnline && !state.isConnected && state.retryCount <= state.maxRetries) {
      attemptConnection();
    } else if (!isOnline && state.isConnected) {
      handleDisconnect();
    }

    return () => {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
      }
    };
  }, [isOnline, state.isConnected, attemptConnection, handleDisconnect]);

  return {
    ...state,
    forceReconnect: useCallback(() => {
      setState(prev => ({ ...prev, retryCount: 0 }));
      if (state.isConnected) {
        handleDisconnect();
      }
      setTimeout(() => {
        attemptConnection();
      }, 100);
    }, [state.isConnected, handleDisconnect, attemptConnection])
  };
}