/**
 * Secure API Client Hook
 * Provides enhanced security for all API requests with automatic session validation
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { logSecurityEvent } from '@/utils/inputSanitization';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function useSecureApiClient() {
  const { user, session } = useEnhancedAuth();
  const navigate = useNavigate();

  const validateSession = useCallback(async (): Promise<boolean> => {
    if (!user || !session) {
      logSecurityEvent('API_REQUEST_WITHOUT_SESSION', {
        timestamp: new Date().toISOString(),
        route: window.location.pathname
      });
      return false;
    }

    // Check session expiry
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      logSecurityEvent('API_REQUEST_WITH_EXPIRED_SESSION', {
        userId: user.id,
        expiresAt: session.expires_at,
        currentTime: now
      });
      
      toast.error('Your session has expired. Please log in again.');
      await supabase.auth.signOut();
      navigate('/login');
      return false;
    }

    return true;
  }, [user, session, navigate]);

  const secureQuery = useCallback(async (queryFn: () => Promise<any>) => {
    const isValid = await validateSession();
    if (!isValid) {
      throw new Error('Invalid session');
    }

    try {
      const result = await queryFn();
      
      // Log successful API access
      if (user) {
        logSecurityEvent('SECURE_API_ACCESS', {
          userId: user.id,
          timestamp: new Date().toISOString(),
          route: window.location.pathname
        });
      }
      
      return result;
    } catch (error) {
      // Log API errors for security monitoring
      if (user) {
        logSecurityEvent('API_REQUEST_ERROR', {
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          route: window.location.pathname
        });
      }
      throw error;
    }
  }, [user, validateSession]);

  const secureMutation = useCallback(async (mutationFn: () => Promise<any>) => {
    const isValid = await validateSession();
    if (!isValid) {
      throw new Error('Invalid session');
    }

    try {
      const result = await mutationFn();
      
      // Log successful mutation
      if (user) {
        logSecurityEvent('SECURE_API_MUTATION', {
          userId: user.id,
          timestamp: new Date().toISOString(),
          route: window.location.pathname
        });
      }
      
      return result;
    } catch (error) {
      // Log mutation errors for security monitoring
      if (user) {
        logSecurityEvent('API_MUTATION_ERROR', {
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          route: window.location.pathname
        });
      }
      throw error;
    }
  }, [user, validateSession]);

  return {
    secureQuery,
    secureMutation,
    validateSession,
    isAuthenticated: !!user && !!session
  };
}