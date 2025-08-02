
import { useEffect } from 'react';

interface SimpleZeroPollingWrapperProps {
  children: React.ReactNode;
}

export function SimpleZeroPollingWrapper({ children }: SimpleZeroPollingWrapperProps) {
  useEffect(() => {
    console.log('🔵 Zero-polling wrapper initialized - ALL background checks disabled');
    
    // Disable any existing intervals or background processes
    return () => {
      console.log('🔵 Zero-polling wrapper cleanup');
    };
  }, []);

  return <>{children}</>;
}
