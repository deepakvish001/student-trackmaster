
import { ReactNode, useEffect } from 'react';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useNavigate } from 'react-router-dom';
import { logSecurityEvent } from '@/utils/inputSanitization';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, session, isLoading } = useEnhancedAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        route: window.location.pathname,
        timestamp: new Date().toISOString()
      });
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    // Enhanced session validation
    if (user && session) {
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        logSecurityEvent('EXPIRED_SESSION_DETECTED', {
          userId: user.id,
          expiresAt: session.expires_at,
          currentTime: now
        });
        navigate('/login');
      }
    }
  }, [user, session, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
