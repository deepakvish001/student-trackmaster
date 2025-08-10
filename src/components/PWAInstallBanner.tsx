import React, { useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { X, Download, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PWAInstallBanner() {
  const { canInstall, installApp } = usePWA();
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('pwa-install-dismissed') === 'true';
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setIsDismissed(true);
    }
  };

  // Don't show if not installable, dismissed, or already installed
  if (!canInstall || isDismissed) return null;

  return (
    <Card className={cn(
      "fixed bottom-4 left-4 right-4 z-50 p-4",
      "md:left-auto md:right-4 md:w-96",
      "bg-gradient-to-r from-sunset-orange/10 to-electric-blue/10",
      "border-sunset-orange/20 backdrop-blur-md"
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 rounded-lg bg-sunset-orange/20">
          <Smartphone className="h-5 w-5 text-sunset-orange" />
        </div>
        
        <div className="flex-1 space-y-2">
          <div>
            <h4 className="font-medium text-sm">Install App</h4>
            <p className="text-xs text-muted-foreground">
              Install Student TrackMaster for offline access and faster performance
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleInstall}
              className="flex-1 h-8 text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Install
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDismiss}
              className="h-8 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}