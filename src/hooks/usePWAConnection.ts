import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { usePWANotifications } from './usePWANotifications';

interface PWAConnectionState {
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  latency: number;
  lastPing: number;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

export function usePWAConnection() {
  const [state, setState] = useState<PWAConnectionState>({
    isConnected: false,
    connectionQuality: 'offline',
    latency: 0,
    lastPing: 0,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
  });

  const isOnline = useOnlineStatus();
  const { showConnectionNotification } = usePWANotifications();
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationRef = useRef<string>('');

  const measureLatency = useCallback(async (): Promise<number> => {
    try {
      const start = performance.now();
      
      // Use a lightweight endpoint or create a ping endpoint
      const response = await fetch('/manifest.json', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const end = performance.now();
      
      if (response.ok) {
        return Math.round(end - start);
      }
      
      return Infinity;
    } catch (error) {
      return Infinity;
    }
  }, []);

  const getConnectionQuality = useCallback((latency: number): PWAConnectionState['connectionQuality'] => {
    if (latency === Infinity || !isOnline) return 'offline';
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    return 'poor';
  }, [isOnline]);

  const checkConnection = useCallback(async () => {
    if (!isOnline) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionQuality: 'offline',
        latency: Infinity,
        lastPing: Date.now()
      }));
      return;
    }

    try {
      const latency = await measureLatency();
      const quality = getConnectionQuality(latency);
      const connected = latency !== Infinity;

      setState(prev => ({
        ...prev,
        isConnected: connected,
        connectionQuality: quality,
        latency: connected ? latency : 0,
        lastPing: Date.now(),
        reconnectAttempts: connected ? 0 : prev.reconnectAttempts
      }));

      // Show notification only when connection status changes
      const currentStatus = connected ? 'connected' : 'disconnected';
      if (lastNotificationRef.current !== currentStatus) {
        showConnectionNotification(connected);
        lastNotificationRef.current = currentStatus;
      }

    } catch (error) {
      console.error('[PWAConnection] Connection check failed:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionQuality: 'offline',
        latency: Infinity,
        lastPing: Date.now()
      }));
    }
  }, [isOnline, measureLatency, getConnectionQuality, showConnectionNotification]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setState(prev => {
      if (prev.reconnectAttempts >= prev.maxReconnectAttempts) {
        return prev;
      }

      const delay = Math.min(1000 * Math.pow(2, prev.reconnectAttempts), 30000); // Exponential backoff, max 30s
      
      reconnectTimeoutRef.current = setTimeout(() => {
        checkConnection();
      }, delay);

      return {
        ...prev,
        reconnectAttempts: prev.reconnectAttempts + 1
      };
    });
  }, [checkConnection]);

  const startPinging = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    // Initial check
    checkConnection();

    // Set up regular pinging
    pingIntervalRef.current = setInterval(() => {
      checkConnection();
    }, 30000); // Check every 30 seconds
  }, [checkConnection]);

  const stopPinging = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const forceReconnect = useCallback(async () => {
    setState(prev => ({ ...prev, reconnectAttempts: 0 }));
    await checkConnection();
    
    if (!state.isConnected && isOnline) {
      scheduleReconnect();
    }
  }, [checkConnection, scheduleReconnect, state.isConnected, isOnline]);

  // Start monitoring when component mounts
  useEffect(() => {
    startPinging();
    return () => stopPinging();
  }, [startPinging, stopPinging]);

  // Handle online/offline changes
  useEffect(() => {
    if (isOnline) {
      checkConnection();
    } else {
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionQuality: 'offline',
        latency: Infinity
      }));
    }
  }, [isOnline, checkConnection]);

  // Schedule reconnect when connection is lost
  useEffect(() => {
    if (!state.isConnected && isOnline && state.reconnectAttempts < state.maxReconnectAttempts) {
      scheduleReconnect();
    }
  }, [state.isConnected, isOnline, state.reconnectAttempts, state.maxReconnectAttempts, scheduleReconnect]);

  const getConnectionIcon = useCallback(() => {
    switch (state.connectionQuality) {
      case 'excellent': return '📶';
      case 'good': return '📶';
      case 'poor': return '📱';
      case 'offline': return '📵';
      default: return '❓';
    }
  }, [state.connectionQuality]);

  const getConnectionText = useCallback(() => {
    if (!isOnline) return 'Offline';
    
    switch (state.connectionQuality) {
      case 'excellent': return `Excellent (${state.latency}ms)`;
      case 'good': return `Good (${state.latency}ms)`;
      case 'poor': return `Poor (${state.latency}ms)`;
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  }, [isOnline, state.connectionQuality, state.latency]);

  return {
    ...state,
    isOnline,
    forceReconnect,
    checkConnection,
    getConnectionIcon,
    getConnectionText
  };
}