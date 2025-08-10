import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOfflineReady: boolean;
  isUpdateAvailable: boolean;
}

export function usePWA() {
  const [pwaState, setPwaState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOfflineReady: false,
    isUpdateAvailable: false
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Install the PWA
  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ PWA installation accepted');
        setPwaState(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
        setDeferredPrompt(null);
        toast.success('📱 App installed successfully!');
        return true;
      } else {
        console.log('❌ PWA installation declined');
        return false;
      }
    } catch (error) {
      console.error('❌ PWA installation failed:', error);
      toast.error('❌ Installation failed');
      return false;
    }
  }, [deferredPrompt]);

  // Check if PWA is already installed
  const checkIfInstalled = useCallback(() => {
    // Check if running in standalone mode (PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    if (isStandalone) {
      setPwaState(prev => ({ ...prev, isInstalled: true }));
    }
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.log('❌ Service workers not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered:', registration);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 New content available');
            setPwaState(prev => ({ ...prev, isUpdateAvailable: true }));
            
            toast.info('🔄 App update available!', {
              action: {
                label: 'Update',
                onClick: () => updateApp()
              },
              duration: 10000
            });
          }
        });
      });

      // PWA is ready to work offline
      if (registration.active) {
        setPwaState(prev => ({ ...prev, isOfflineReady: true }));
      }

      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }, []);

  // Update the app when new version is available
  const updateApp = useCallback(() => {
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 App updated, reloading...');
      window.location.reload();
    });
  }, []);

  // Initialize PWA features
  useEffect(() => {
    // Check if already installed
    checkIfInstalled();

    // Register service worker
    registerServiceWorker();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaState(prev => ({ ...prev, isInstallable: true }));
      console.log('📱 PWA install prompt available');
    };

    // Listen for app installation
    const handleAppInstalled = () => {
      console.log('✅ PWA was installed');
      setPwaState(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
      setDeferredPrompt(null);
      toast.success('📱 App installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Handle service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
        setPwaState(prev => ({ ...prev, isUpdateAvailable: true }));
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [checkIfInstalled, registerServiceWorker]);

  // Add manifest link to head
  useEffect(() => {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest.json';
      document.head.appendChild(link);
    }

    // Add PWA meta tags
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#ff6600';
      document.head.appendChild(meta);
    }

    // Add apple-mobile-web-app-capable for iOS
    const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    if (!appleMeta) {
      const meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-capable';
      meta.content = 'yes';
      document.head.appendChild(meta);
    }
  }, []);

  return {
    ...pwaState,
    installApp,
    updateApp,
    canInstall: pwaState.isInstallable && !pwaState.isInstalled
  };
}