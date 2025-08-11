import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WifiOff } from 'lucide-react';
import { ReactNode } from 'react';

interface OfflineTooltipProps {
  children: ReactNode;
  offlineMessage?: string;
  requiresOnline?: boolean;
}

export function OfflineTooltip({ 
  children, 
  offlineMessage = "This action requires an internet connection",
  requiresOnline = false 
}: OfflineTooltipProps) {
  const { isOnline } = useOnlineStatus();

  if (!requiresOnline || isOnline) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            {children}
            <div className="absolute inset-0 cursor-not-allowed opacity-50" />
            <WifiOff className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-destructive pointer-events-none" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{offlineMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}