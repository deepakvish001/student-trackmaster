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

  // Check if update was in progress and handle post-reload success
  useEffect(() => {
    const updateInProgress = sessionStorage.getItem('pwa_update_in_progress');
    const updateTimestamp = sessionStorage.getItem('pwa_update_timestamp');
    const lastVersion = localStorage.getItem('pwa_last_version');
    
    if (updateInProgress === 'true' && updateTimestamp) {
      const timeSinceUpdate = Date.now() - parseInt(updateTimestamp);
      
      // If update was recent (within 30 seconds), consider it successful
      if (timeSinceUpdate < 30000) {
        console.log('Update completed after page refresh');
        
        // Clean up session storage
        sessionStorage.removeItem('pwa_update_in_progress');
        sessionStorage.removeItem('pwa_update_timestamp');
        
        // Store current version to prevent duplicate notifications
        if (registration) {
          navigator.serviceWorker.getRegistration().then(reg => {
            if (reg && reg.active) {
              const messageChannel = new MessageChannel();
              messageChannel.port1.onmessage = (event) => {
                const currentVersion = event.data.version;
                localStorage.setItem('pwa_last_version', currentVersion);
                console.log('Updated to version:', currentVersion);
              };
              reg.active.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
            }
          });
        }
        
        // Show success message
        setTimeout(() => {
          handleUpdateComplete();
        }, 1000);
      } else {
        // Clean up old entries
        sessionStorage.removeItem('pwa_update_in_progress');
        sessionStorage.removeItem('pwa_update_timestamp');
      }
    }
  }, [handleUpdateComplete, registration]);

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
      
      // Progress animation to 90% then pause
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        if (currentProgress < 90) {
          currentProgress += 15;
          setUpdateProgress(currentProgress);
        }
        
        // Stop at 90% and wait for service worker response
        if (currentProgress >= 90) {
          clearInterval(progressInterval);
          setUpdateProgress(90);
        }
      }, 300);
      
      // Set up success handler for controllerchange
      const handleControllerChange = () => {
        console.log('Service worker controller changed - update successful');
        clearInterval(progressInterval);
        clearTimeout(stuckTimeout);
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
      
      // Handle case where update gets stuck at 90%
      const stuckTimeout = setTimeout(() => {
        console.log('Update stuck at 90% - showing warning message');
        
        // Show "taking longer than expected" message
        toast.warning('⏳ Update taking longer than expected...', {
          description: 'Refreshing page to complete update',
          duration: 2000
        });
        
        // Clean up listeners
        clearInterval(progressInterval);
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        
        // Wait a moment for user to see the message, then refresh
        setTimeout(() => {
          console.log('Force refreshing to complete update');
          
          // Mark that we're expecting an update completion
          sessionStorage.setItem('pwa_update_in_progress', 'true');
          sessionStorage.setItem('pwa_update_timestamp', Date.now().toString());
          
          // Force reload to complete the update
          window.location.reload();
        }, 2000);
        
      }, 5000); // Wait 5 seconds at 90% before showing stuck message
      
      // Fallback: Complete update after reasonable time regardless
      setTimeout(() => {
        if (updateState === 'updating') {
          console.log('Fallback: Force completing update');
          clearInterval(progressInterval);
          clearTimeout(stuckTimeout);
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          
          setUpdateProgress(100);
          handleUpdateComplete();
          
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }, 8000); // Total fallback after 8 seconds
      
    } catch (error) {
      console.error('Update failed:', error);
      handleUpdateError('Update failed. Please try refreshing the page.');
    }
  }, [newWorker, updateState, handleUpdateComplete, handleUpdateError]);

  useEffect(() => {
    if (!registration) return;

    // Check if we've already seen this version
    const checkVersionAndUpdate = () => {
      if (registration.waiting) {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          const { version } = event.data;
          const lastVersion = localStorage.getItem('pwa_last_version');
          
          if (version && version !== lastVersion) {
            console.log('New version detected:', version, 'Previous:', lastVersion);
            setNewWorker(registration.waiting);
            setUpdateState('available');
            
            toast.info('🚀 New app version available!', {
              duration: 0,
              action: {
                label: 'Update Now',
                onClick: handleUpdate
              }
            });
          } else {
            console.log('Same version detected, not showing update prompt');
          }
        };
        
        registration.waiting.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
      }
    };

    const handleUpdateFound = () => {
      console.log('Service worker update found');
      const installingWorker = registration.installing;
      if (installingWorker) {
        setNewWorker(installingWorker);
        
        const handleStateChange = () => {
          console.log('Installing worker state:', installingWorker.state);
          
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Check version before showing update prompt
              const messageChannel = new MessageChannel();
              messageChannel.port1.onmessage = (event) => {
                const { version } = event.data;
                const lastVersion = localStorage.getItem('pwa_last_version');
                
                if (version && version !== lastVersion) {
                  console.log('New version ready:', version);
                  setUpdateState('available');
                  
                  toast.info('🚀 New app version available!', {
                    duration: 0,
                    action: {
                      label: 'Update Now',
                      onClick: handleUpdate
                    }
                  });
                } else {
                  console.log('Same version, not showing update prompt');
                }
              };
              
              installingWorker.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
            } else {
              // This is the first install
              console.log('Service worker installed for the first time');
              const messageChannel = new MessageChannel();
              messageChannel.port1.onmessage = (event) => {
                const { version } = event.data;
                localStorage.setItem('pwa_last_version', version);
                console.log('First install, saved version:', version);
              };
              
              installingWorker.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
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
    checkVersionAndUpdate();

    // Handle messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_COMPLETE') {
        // Update completed, store new version
        const { version } = event.data;
        if (version) {
          localStorage.setItem('pwa_last_version', version);
          console.log('Update complete, new version stored:', version);
        }
        handleUpdateComplete();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      registration.removeEventListener('updatefound', handleUpdateFound);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [registration, handleUpdate, handleUpdateComplete]);

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