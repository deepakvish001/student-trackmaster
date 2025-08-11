import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';

interface PWAUpdatePromptProps {
  registration: ServiceWorkerRegistration | null;
}

export function PWAUpdatePrompt({ registration }: PWAUpdatePromptProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!registration) return;

    const handleUpdateFound = () => {
      const installingWorker = registration.installing;
      if (installingWorker) {
        setNewWorker(installingWorker);
        
        const handleStateChange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
            toast.info('🚀 New app version available!', {
              duration: 0,
              action: {
                label: 'Update Now',
                onClick: handleUpdate
              }
            });
          }
        };

        installingWorker.addEventListener('statechange', handleStateChange);
        return () => installingWorker.removeEventListener('statechange', handleStateChange);
      }
    };

    registration.addEventListener('updatefound', handleUpdateFound);

    // Check immediately if there's already an update waiting
    if (registration.waiting) {
      setNewWorker(registration.waiting);
      setUpdateAvailable(true);
    }

    return () => registration.removeEventListener('updatefound', handleUpdateFound);
  }, [registration]);

  const handleUpdate = async () => {
    if (!newWorker) return;

    setIsUpdating(true);
    
    try {
      // Show immediate feedback
      toast.info('📦 Installing update...');
      
      // Tell the waiting service worker to skip waiting and become active
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // Set up timeout for update process
      const updateTimeout = setTimeout(() => {
        toast.error('Update is taking longer than expected. Refreshing page...');
        window.location.reload();
      }, 5000);
      
      // Listen for the controlling change event
      const handleControllerChange = () => {
        clearTimeout(updateTimeout);
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        
        toast.success('✅ Update complete! Refreshing...');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      };
      
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      
      // Alternative approach if controllerchange doesn't fire
      setTimeout(() => {
        if (isUpdating) {
          toast.success('✅ Update applied! Refreshing...');
          window.location.reload();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Update failed. Please try refreshing the page.');
      setIsUpdating(false);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="border-primary bg-background shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Download className="h-4 w-4" />
            Update Available
          </CardTitle>
          <CardDescription className="text-xs">
            A new version of BiometricHub is ready to install
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Now'
              )}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setUpdateAvailable(false)}
              disabled={isUpdating}
            >
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}