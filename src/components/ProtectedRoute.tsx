
/**
 * Enhanced Protected Route Component
 * Provides comprehensive authentication and authorization checks
 */

import { ReactNode, useEffect } from 'react';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNavigate, useLocation } from 'react-router-dom';
import { logSecurityEvent } from '@/utils/inputSanitization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, session, isLoading } = useEnhancedAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const performSecurityChecks = async () => {
      // Redirect to login if not authenticated
      if (!isLoading && !user) {
        logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
          route: location.pathname,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer
        });
        
        // Store the attempted route for redirect after login
        localStorage.setItem('redirectAfterLogin', location.pathname);
        navigate('/login', { replace: true });
        return;
      }

      // Enhanced session validation
      if (user && session) {
        const now = Math.floor(Date.now() / 1000);
        
        // Check session expiry with buffer time
        if (session.expires_at && session.expires_at < (now + 300)) { // 5 minutes buffer
          logSecurityEvent('SESSION_NEAR_EXPIRY', {
            userId: user.id,
            expiresAt: session.expires_at,
            currentTime: now,
            route: location.pathname
          });

          // Try to refresh session
          try {
            const { error } = await supabase.auth.refreshSession();
            if (error) {
              logSecurityEvent('SESSION_REFRESH_FAILED', {
                userId: user.id,
                error: error.message
              });
              toast.error('Session expired. Please log in again.');
              navigate('/login', { replace: true });
              return;
            }
          } catch (error) {
            logSecurityEvent('SESSION_REFRESH_ERROR', {
              userId: user.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            navigate('/login', { replace: true });
            return;
          }
        }

        // Check if user account is active
        if (profile && !profile.is_active) {
          logSecurityEvent('INACTIVE_USER_ACCESS_BLOCKED', {
            userId: user.id,
            route: location.pathname,
            timestamp: new Date().toISOString()
          });
          
          toast.error('Your account has been deactivated. Please contact your administrator.');
          await supabase.auth.signOut();
          navigate('/login', { replace: true });
          return;
        }

        // Log successful authenticated access
        logSecurityEvent('AUTHENTICATED_ROUTE_ACCESS', {
          userId: user.id,
          route: location.pathname,
          timestamp: new Date().toISOString(),
          userRole: profile?.role
        });
      }
    };

    performSecurityChecks();
  }, [user, session, profile, isLoading, navigate, location.pathname]);

  // Enhanced security monitoring
  useEffect(() => {
    if (user && session) {
      // Monitor for tab visibility changes (security concern)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          logSecurityEvent('TAB_HIDDEN', {
            userId: user.id,
            route: location.pathname,
            timestamp: new Date().toISOString()
          });
        } else {
          logSecurityEvent('TAB_VISIBLE', {
            userId: user.id,
            route: location.pathname,
            timestamp: new Date().toISOString()
          });
        }
      };

      // Monitor for window focus changes
      const handleFocusChange = (focused: boolean) => {
        logSecurityEvent(focused ? 'WINDOW_FOCUSED' : 'WINDOW_BLURRED', {
          userId: user.id,
          route: location.pathname,
          timestamp: new Date().toISOString()
        });
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', () => handleFocusChange(true));
      window.addEventListener('blur', () => handleFocusChange(false));

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', () => handleFocusChange(true));
        window.removeEventListener('blur', () => handleFocusChange(false));
      };
    }
  }, [user, session, location.pathname]);

  // Show enhanced loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Return null while redirecting
  if (!user || !session) {
    return null;
  }

  return <>{children}</>;
}
