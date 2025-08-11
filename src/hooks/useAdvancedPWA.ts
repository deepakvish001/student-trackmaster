import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface PWAFeatures {
  isInstalled: boolean;
  isOnline: boolean;
  hasNotificationPermission: boolean;
  supportsBackgroundSync: boolean;
  supportsPushNotifications: boolean;
  supportsOfflineStorage: boolean;
  cacheSize: number;
  lastCacheUpdate: string | null;
}

interface PWAUpdateInfo {
  hasUpdate: boolean;
  isUpdating: boolean;
  updateAvailable: boolean;
}

export function useAdvancedPWA() {
  const [pwaFeatures, setPwaFeatures] = useState<PWAFeatures>({
    isInstalled: false,
    isOnline: navigator.onLine,
    hasNotificationPermission: false,
    supportsBackgroundSync: false,
    supportsPushNotifications: false,
    supportsOfflineStorage: false,
    cacheSize: 0,
    lastCacheUpdate: null
  });

  const [updateInfo, setUpdateInfo] = useState<PWAUpdateInfo>({
    hasUpdate: false,
    isUpdating: false,
    updateAvailable: false
  });

  const [serviceWorker, setServiceWorker] = useState<ServiceWorkerRegistration | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Check PWA installation status
  const checkPWAStatus = useCallback(async () => {
    // Check if app is installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone ||
                       document.referrer.includes('android-app://');

    // Check notification permission
    const hasNotificationPermission = 'Notification' in window && 
                                    Notification.permission === 'granted';

    // Check service worker support
    const supportsServiceWorker = 'serviceWorker' in navigator;
    
    // Check background sync support
    const supportsBackgroundSync = 'serviceWorker' in navigator && 
                                  'sync' in window.ServiceWorkerRegistration.prototype;

    // Check push notification support
    const supportsPushNotifications = 'serviceWorker' in navigator && 
                                    'PushManager' in window;

    // Check offline storage support
    const supportsOfflineStorage = 'indexedDB' in window && 
                                 'caches' in window;

    // Calculate cache size
    let cacheSize = 0;
    let lastCacheUpdate = null;

    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          cacheSize += keys.length;
        }

        // Get last cache update from storage
        lastCacheUpdate = localStorage.getItem('pwa_last_cache_update');
      } catch (error) {
        console.error('Error calculating cache size:', error);
      }
    }

    setPwaFeatures({
      isInstalled,
      isOnline: navigator.onLine,
      hasNotificationPermission,
      supportsBackgroundSync,
      supportsPushNotifications,
      supportsOfflineStorage,
      cacheSize,
      lastCacheUpdate
    });

  }, []);

  // Install PWA
  const installPWA = useCallback(async () => {
    if (!deferredPrompt) {
      toast.error('PWA installation not available');
      return false;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('App installed successfully!');
        setDeferredPrompt(null);
        setPwaFeatures(prev => ({ ...prev, isInstalled: true }));
        return true;
      } else {
        toast.info('App installation cancelled');
        return false;
      }
    } catch (error) {
      console.error('PWA installation failed:', error);
      toast.error('Installation failed');
      return false;
    }
  }, [deferredPrompt]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      
      setPwaFeatures(prev => ({ ...prev, hasNotificationPermission: granted }));
      
      if (granted) {
        toast.success('Notifications enabled');
        
        // Test notification
        new Notification('BiometricHub', {
          body: 'Notifications are now enabled for this app',
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      } else {
        toast.error('Notifications denied');
      }
      
      return granted;
    } catch (error) {
      console.error('Notification permission failed:', error);
      toast.error('Failed to enable notifications');
      return false;
    }
  }, []);

  // Send notification
  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!pwaFeatures.hasNotificationPermission) {
      console.warn('Notifications not permitted');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }, [pwaFeatures.hasNotificationPermission]);

  // Update service worker
  const updateServiceWorker = useCallback(async () => {
    if (!serviceWorker) {
      toast.error('No service worker available');
      return;
    }

    setUpdateInfo(prev => ({ ...prev, isUpdating: true }));

    try {
      await serviceWorker.update();
      
      if (serviceWorker.waiting) {
        // Tell the waiting SW to skip waiting
        serviceWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        toast.success('App updated successfully!', {
          action: {
            label: 'Restart',
            onClick: () => window.location.reload()
          }
        });
      }
    } catch (error) {
      console.error('Service worker update failed:', error);
      toast.error('Update failed');
    } finally {
      setUpdateInfo(prev => ({ ...prev, isUpdating: false }));
    }
  }, [serviceWorker]);

  // Clear app cache
  const clearAppCache = useCallback(async () => {
    if (!('caches' in window)) {
      toast.error('Cache API not supported');
      return;
    }

    try {
      const cacheNames = await caches.keys();
      
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );

      // Clear other storage
      if ('indexedDB' in window) {
        indexedDB.deleteDatabase('StudentManagementOfflineDB');
      }

      localStorage.clear();
      sessionStorage.clear();

      setPwaFeatures(prev => ({ 
        ...prev, 
        cacheSize: 0, 
        lastCacheUpdate: null 
      }));

      toast.success('App cache cleared successfully');
      
      // Refresh to reload fresh content
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (error) {
      console.error('Cache clear failed:', error);
      toast.error('Failed to clear cache');
    }
  }, []);

  // Setup service worker
  useEffect(() => {
    const setupServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          setServiceWorker(registration);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateInfo(prev => ({ 
                    ...prev, 
                    hasUpdate: true, 
                    updateAvailable: true 
                  }));
                  
                  toast.info('App update available!', {
                    duration: 0,
                    action: {
                      label: 'Update',
                      onClick: updateServiceWorker
                    }
                  });
                }
              });
            }
          });

          // Listen for SW messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SW_UPDATED') {
              toast.success('App updated in background');
            }
          });

        } catch (error) {
          console.error('Service worker setup failed:', error);
        }
      }
    };

    setupServiceWorker();
  }, [updateServiceWorker]);

  // Setup install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Setup online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setPwaFeatures(prev => ({ ...prev, isOnline: true }));
      sendNotification('Back Online', {
        body: 'Internet connection restored',
        tag: 'connection-status'
      });
    };

    const handleOffline = () => {
      setPwaFeatures(prev => ({ ...prev, isOnline: false }));
      sendNotification('Offline Mode', {
        body: 'Working offline - changes will sync when reconnected',
        tag: 'connection-status'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sendNotification]);

  // Initial setup
  useEffect(() => {
    checkPWAStatus();
  }, [checkPWAStatus]);

  return {
    pwaFeatures,
    updateInfo,
    installPWA,
    requestNotificationPermission,
    sendNotification,
    updateServiceWorker,
    clearAppCache,
    checkPWAStatus,
    canInstall: !!deferredPrompt && !pwaFeatures.isInstalled
  };
}