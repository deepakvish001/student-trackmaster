import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

export function PWAUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Check for updates every 30 seconds when app is active
      const checkForUpdates = () => {
        navigator.serviceWorker.getRegistration()
          .then(registration => {
            if (registration) {
              registration.update();
            }
          });
      };

      // Initial check
      checkForUpdates();

      // Set up periodic checks
      const updateInterval = setInterval(checkForUpdates, 30000);

      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Reload the page when a new service worker takes control
        if (isRefreshing) return;
        setIsRefreshing(true);
        window.location.reload();
      });

      // Listen for waiting service worker
      navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
          const newSW = registration.installing;
          if (newSW) {
            newSW.addEventListener('statechange', () => {
              if (newSW.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New update available
                  setNewWorker(newSW);
                  setUpdateAvailable(true);
                  toast.info('App update available! Click to refresh.', {
                    action: {
                      label: 'Update',
                      onClick: () => handleUpdate()
                    },
                    duration: 10000,
                  });
                }
              }
            });
          }
        });

        // Check if there's already a waiting service worker
        if (registration.waiting) {
          setNewWorker(registration.waiting);
          setUpdateAvailable(true);
        }
      });

      return () => {
        clearInterval(updateInterval);
      };
    }
  }, [isRefreshing]);

  const handleUpdate = () => {
    if (newWorker) {
      // Tell the waiting service worker to skip waiting
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      setUpdateAvailable(false);
      setIsRefreshing(true);
      
      toast.success('Updating app...', {
        duration: 2000,
      });
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-update-dismissed', 'true');
  };

  // Don't show if dismissed this session
  if (!updateAvailable || sessionStorage.getItem('pwa-update-dismissed')) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full mx-4">
      <Card className="border-blue-500/20 bg-blue-50/95 dark:bg-blue-950/95 backdrop-blur-sm shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                App Update Available
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                A new version is ready. Update now for the latest features and improvements.
              </p>
              
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  onClick={handleUpdate}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Updating...' : 'Update Now'}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDismiss}
                  className="h-8 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                  disabled={isRefreshing}
                >
                  Later
                </Button>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 flex-shrink-0 text-blue-600 dark:text-blue-400"
              disabled={isRefreshing}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}