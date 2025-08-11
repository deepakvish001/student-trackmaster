import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      console.log('Network: Online');
      setWasOffline(!navigator.onLine);
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('Network: Offline');
      setIsOnline(false);
      setWasOffline(true);
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also check periodically by trying to fetch a small resource
    const checkConnection = async () => {
      try {
        // Try to fetch a small image with a cache-busting parameter
        await fetch('/favicon.ico?' + Date.now(), {
          mode: 'no-cors',
          cache: 'no-cache'
        });
        
        if (!isOnline) {
          handleOnline();
        }
      } catch {
        if (isOnline) {
          handleOffline();
        }
      }
    };

    // Check connection every 30 seconds
    const intervalId = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [isOnline]);

  return { isOnline, wasOffline };
}