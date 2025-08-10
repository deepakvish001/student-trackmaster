/**
 * Security Wrapper Component
 * Provides comprehensive security checks and session management
 */

import { ReactNode, useEffect, useState } from 'react';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/utils/inputSanitization';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface SecurityWrapperProps {
  children: ReactNode;
}

export default function SecurityWrapper({ children }: SecurityWrapperProps) {
  const { user, session, isLoading } = useEnhancedAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSessionValid, setIsSessionValid] = useState(false);

  // Comprehensive session validation
  useEffect(() => {
    const validateSession = async () => {
      if (!user || !session) {
        setIsSessionValid(false);
        return;
      }

      try {
        // Check session expiry
        const now = Math.floor(Date.now() / 1000);
        if (session.expires_at && session.expires_at < now) {
          logSecurityEvent('SESSION_EXPIRED', {
            userId: user.id,
            expiresAt: session.expires_at,
            currentTime: now,
            route: location.pathname
          });
          
          toast.error('Your session has expired. Please log in again.');
          await supabase.auth.signOut();
          navigate('/login');
          return;
        }

        // Validate user profile status
        if (profile && !profile.is_active) {
          logSecurityEvent('INACTIVE_USER_ACCESS_ATTEMPT', {
            userId: user.id,
            route: location.pathname,
            timestamp: new Date().toISOString()
          });
          
          toast.error('Your account has been deactivated. Please contact your administrator.');
          await supabase.auth.signOut();
          navigate('/login');
          return;
        }

        // Session is valid, Supabase handles token refresh automatically
        setIsSessionValid(true);
      } catch (error) {
        logSecurityEvent('SESSION_VALIDATION_ERROR', {
          userId: user?.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          route: location.pathname
        });
        
        setIsSessionValid(false);
        navigate('/login');
      }
    };

    if (!isLoading) {
      validateSession();
    }
  }, [user, session, profile, isLoading, navigate, location.pathname]);

  // Security monitoring
  useEffect(() => {
    if (user && session && isSessionValid) {
      // Monitor for suspicious activity
      const securityInterval = setInterval(() => {
        // Check for concurrent sessions (simplified check)
        const lastActivity = localStorage.getItem(`last_activity_${user.id}`);
        const currentTime = Date.now();
        
        if (lastActivity) {
          const timeDiff = currentTime - parseInt(lastActivity);
          // If no activity for more than 2 hours, log security event
          if (timeDiff > 2 * 60 * 60 * 1000) {
            logSecurityEvent('EXTENDED_INACTIVITY_DETECTED', {
              userId: user.id,
              inactivityMinutes: Math.floor(timeDiff / 60000),
              route: location.pathname
            });
          }
        }
        
        // Update last activity
        localStorage.setItem(`last_activity_${user.id}`, currentTime.toString());
      }, 5 * 60 * 1000); // Check every 5 minutes

      return () => clearInterval(securityInterval);
    }
  }, [user, session, isSessionValid, location.pathname]);

  // Show loading state during security checks
  if (isLoading || (user && session && !isSessionValid)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Verifying security credentials...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user || !session || !isSessionValid) {
    return null; // Let the auth context handle the redirect
  }

  return <>{children}</>;
}