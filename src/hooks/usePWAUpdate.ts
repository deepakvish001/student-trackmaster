import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface PWAUpdateState {
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  updateServiceWorker: () => Promise<void>;
}

export function usePWAUpdate(): PWAUpdateState {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Listen for the service worker registration
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        
        // Check for updates periodically
        const checkForUpdates = () => {
          reg.update().catch(console.error);
        };
        
        // Check immediately
        checkForUpdates();
        
        // Check every 30 seconds
        const interval = setInterval(checkForUpdates, 30000);
        
        return () => clearInterval(interval);
      });

      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed');
        window.location.reload();
      });

      // Listen for waiting service worker
      const handleWaiting = (reg: ServiceWorkerRegistration) => {
        if (reg.waiting) {
          console.log('New service worker is waiting');
          setIsUpdateAvailable(true);
          
          toast.info('App update available!', {
            description: 'A new version is ready to install.',
            action: {
              label: 'Update',
              onClick: () => updateServiceWorker()
            },
            duration: 10000
          });
        }
      };

      // Check for existing registrations
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => {
          handleWaiting(reg);
          
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  handleWaiting(reg);
                }
              });
            }
          });
        });
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type } = event.data || {};
        
        switch (type) {
          case 'SW_ACTIVATED':
            console.log('Service worker activated:', event.data);
            break;
          case 'SW_UPDATE_AVAILABLE':
            setIsUpdateAvailable(true);
            toast.info('App update available!', {
              description: 'A new version is ready to install.',
              action: {
                label: 'Update',
                onClick: () => updateServiceWorker()
              },
              duration: 10000
            });
            break;
        }
      });
    }
  }, []);

  const updateServiceWorker = async (): Promise<void> => {
    if (!registration?.waiting) {
      console.log('No waiting service worker');
      return;
    }

    setIsUpdating(true);
    
    try {
      // Tell the waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait for the new service worker to take control
      await new Promise<void>((resolve) => {
        const handleControllerChange = () => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          resolve();
        };
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      });

      toast.success('App updated successfully!', {
        description: 'The app will reload to apply the update.'
      });

      // Reload the page to use the new service worker
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Failed to update service worker:', error);
      toast.error('Update failed', {
        description: 'Please try refreshing the page manually.'
      });
    } finally {
      setIsUpdating(false);
      setIsUpdateAvailable(false);
    }
  };

  return {
    isUpdateAvailable,
    isUpdating,
    updateServiceWorker
  };
}