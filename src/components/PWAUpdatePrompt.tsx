import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Download, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

interface PWAUpdatePromptProps {
  registration: ServiceWorkerRegistration | null;
}

type UpdateState = 'available' | 'updating' | 'installing' | 'success' | 'error' | 'hidden';

export function PWAUpdatePrompt({ registration }: PWAUpdatePromptProps) {
  const [updateState, setUpdateState] = useState<UpdateState>('hidden');
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);
  const [updateProgress, setUpdateProgress] = useState(0);

  // Track update completion
  const handleUpdateComplete = useCallback(() => {
    setUpdateState('success');
    toast.success('🎉 Update Successful!', {
      description: 'App has been updated to the latest version',
      duration: 3000
    });
    
    // Hide notification after success
    setTimeout(() => {
      setUpdateState('hidden');
    }, 3000);
  }, []);

  // Handle update errors
  const handleUpdateError = useCallback((error: string) => {
    console.error('Update error:', error);
    setUpdateState('error');
    toast.error('Update Failed', {
      description: error,
      duration: 5000
    });
    
    // Reset to available state after error
    setTimeout(() => {
      setUpdateState('available');
    }, 3000);
  }, []);

  useEffect(() => {
    if (!registration) return;

    const handleUpdateFound = () => {
      console.log('Service worker update found');
      const installingWorker = registration.installing;
      if (installingWorker) {
        setNewWorker(installingWorker);
        
        const handleStateChange = () => {
          console.log('Installing worker state:', installingWorker.state);
          
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // There's an existing service worker, so this is an update
              setUpdateState('available');
              toast.info('🚀 New app version available!', {
                duration: 0,
                action: {
                  label: 'Update Now',
                  onClick: handleUpdate
                }
              });
            } else {
              // This is the first install
              console.log('Service worker installed for the first time');
            }
          }
        };

        installingWorker.addEventListener('statechange', handleStateChange);
        return () => installingWorker.removeEventListener('statechange', handleStateChange);
      }
    };

    // Listen for update events
    registration.addEventListener('updatefound', handleUpdateFound);

    // Check immediately if there's already an update waiting
    if (registration.waiting) {
      console.log('Service worker already waiting');
      setNewWorker(registration.waiting);
      setUpdateState('available');
    }

    // Handle messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_COMPLETE') {
        handleUpdateComplete();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      registration.removeEventListener('updatefound', handleUpdateFound);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [registration, handleUpdateComplete]);

  const handleUpdate = useCallback(async () => {
    if (!newWorker) {
      handleUpdateError('No service worker available for update');
      return;
    }

    setUpdateState('updating');
    setUpdateProgress(0);
    
    try {
      console.log('Starting update process...');
      
      // Show immediate feedback
      toast.info('📦 Installing update...', {
        description: 'Please wait while we update the app'
      });
      
      // Start progress animation
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += 15;
        if (currentProgress <= 100) {
          setUpdateProgress(currentProgress);
        }
        if (currentProgress >= 100) {
          clearInterval(progressInterval);
        }
      }, 300);
      
      // Set up success handler for controllerchange
      const handleControllerChange = () => {
        console.log('Service worker controller changed - update successful');
        clearInterval(progressInterval);
        setUpdateProgress(100);
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        
        // Show success and reload
        setTimeout(() => {
          handleUpdateComplete();
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }, 300);
      };
      
      // Listen for controller change
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      
      // Tell the waiting service worker to skip waiting and become active
      console.log('Posting SKIP_WAITING message to service worker');
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // Simplified timeout - if no response in 3 seconds, force reload
      setTimeout(() => {
        console.log('Force completing update after 3 seconds');
        clearInterval(progressInterval);
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        
        setUpdateProgress(100);
        handleUpdateComplete();
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }, 3000);
      
    } catch (error) {
      console.error('Update failed:', error);
      handleUpdateError('Update failed. Please try refreshing the page.');
    }
  }, [newWorker, handleUpdateComplete, handleUpdateError]);

  // Don't show if hidden or no update available
  if (updateState === 'hidden') return null;

  const getStatusInfo = () => {
    switch (updateState) {
      case 'available':
        return {
          icon: Download,
          title: 'Update Available',
          description: 'A new version of BiometricHub is ready to install',
          showProgress: false
        };
      case 'updating':
        return {
          icon: RefreshCw,
          title: 'Updating App',
          description: `Installing update... ${updateProgress}%`,
          showProgress: true
        };
      case 'installing':
        return {
          icon: RefreshCw,
          title: 'Installing',
          description: 'Applying new version...',
          showProgress: true
        };
      case 'success':
        return {
          icon: CheckCircle,
          title: 'Update Successful!',
          description: 'App updated to latest version',
          showProgress: false
        };
      case 'error':
        return {
          icon: X,
          title: 'Update Failed',
          description: 'Please try again or refresh manually',
          showProgress: false
        };
      default:
        return {
          icon: Download,
          title: 'Update Available',
          description: 'A new version is ready',
          showProgress: false
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const isProcessing = updateState === 'updating' || updateState === 'installing';

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className={`border-primary bg-background shadow-lg transition-all duration-300 ${
        updateState === 'success' ? 'border-green-500' : 
        updateState === 'error' ? 'border-red-500' : 
        'border-primary'
      }`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <StatusIcon className={`h-4 w-4 ${
              isProcessing ? 'animate-spin' : ''
            } ${
              updateState === 'success' ? 'text-green-500' :
              updateState === 'error' ? 'text-red-500' :
              'text-primary'
            }`} />
            {statusInfo.title}
          </CardTitle>
          <CardDescription className="text-xs">
            {statusInfo.description}
          </CardDescription>
          {statusInfo.showProgress && (
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${updateProgress}%` }}
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            {updateState === 'available' && (
              <>
                <Button 
                  size="sm" 
                  onClick={handleUpdate}
                  className="flex-1"
                >
                  Update Now
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setUpdateState('hidden')}
                >
                  Later
                </Button>
              </>
            )}
            {(updateState === 'updating' || updateState === 'installing') && (
              <Button 
                size="sm" 
                disabled
                className="flex-1"
              >
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Please wait...
              </Button>
            )}
            {updateState === 'success' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setUpdateState('hidden')}
                className="flex-1"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Done
              </Button>
            )}
            {updateState === 'error' && (
              <>
                <Button 
                  size="sm" 
                  onClick={handleUpdate}
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                >
                  Refresh
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}