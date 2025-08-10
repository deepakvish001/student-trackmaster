import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => {
    const navigator = window.navigator as any;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    return {
      isOnline: navigator.onLine,
      isSlowConnection: false,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
    };
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const navigator = window.navigator as any;
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      const isOnline = navigator.onLine;
      const effectiveType = connection?.effectiveType || 'unknown';
      const downlink = connection?.downlink || 0;
      const rtt = connection?.rtt || 0;
      
      // Consider connection slow if effective type is 2g or 3g, or low downlink
      const isSlowConnection = effectiveType === '2g' || effectiveType === 'slow-2g' || downlink < 1;
      
      setNetworkStatus({
        isOnline,
        isSlowConnection,
        connectionType: connection?.type || 'unknown',
        effectiveType,
        downlink,
        rtt,
      });
    };

    const handleOnline = () => {
      console.log('🌐 Connection restored');
      updateNetworkStatus();
      
      // Trigger background sync when back online
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          return registration.sync.register('sync-offline-data');
        }).catch(error => {
          console.log('Background sync registration failed:', error);
        });
      }
    };

    const handleOffline = () => {
      console.log('📱 Connection lost');
      updateNetworkStatus();
    };

    const handleConnectionChange = () => {
      console.log('🔄 Connection changed');
      updateNetworkStatus();
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    const navigator = window.navigator as any;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial status update
    updateNetworkStatus();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkStatus;
}