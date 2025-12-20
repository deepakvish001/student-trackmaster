
/**
 * Phase 2: Enhanced Authentication Context with Biometric Security
 * Advanced auth context with encryption key management and audit logging
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { logSecurityEvent } from '@/utils/inputSanitization';
import { 
  generateEncryptionKey, 
  exportEncryptionKey, 
  importEncryptionKey,
  auditBiometricAccess 
} from '@/utils/biometricSecurity';

interface EnhancedAuthContextType {
  user: User | null;
  session: Session | null;
  encryptionKey: CryptoKey | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  securityLevel: 'low' | 'medium' | 'high';
  sessionMetrics: {
    loginTime: Date | null;
    lastActivity: Date | null;
    activityCount: number;
  };
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(undefined);

export function EnhancedAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [securityLevel, setSecurityLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [sessionMetrics, setSessionMetrics] = useState({
    loginTime: null as Date | null,
    lastActivity: null as Date | null,
    activityCount: 0
  });
  
  const navigate = useNavigate();

  // Initialize encryption key for biometric data using session-based storage
  // Keys are generated as non-extractable and stored only in memory/session
  const initializeEncryptionKey = async (userId: string) => {
    try {
      // Generate a new non-extractable key per session for security
      // This prevents key theft via XSS as keys cannot be exported
      console.log('Generating session-based encryption key');
      const key = await generateEncryptionKey();
      
      setEncryptionKey(key);
      logSecurityEvent('ENCRYPTION_KEY_CREATED', { 
        userId,
        storage: 'session-memory',
        extractable: false
      });
      
      setSecurityLevel('high');
    } catch (error) {
      console.error('Failed to initialize encryption key:', error);
      logSecurityEvent('ENCRYPTION_KEY_INIT_FAILED', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setSecurityLevel('low');
    }
  };

  // Update activity metrics
  const updateActivity = () => {
    setSessionMetrics(prev => ({
      ...prev,
      lastActivity: new Date(),
      activityCount: prev.activityCount + 1
    }));
  };

  // Monitor user activity
  useEffect(() => {
    if (user) {
      const handleActivity = () => updateActivity();
      
      // Add activity listeners
      document.addEventListener('click', handleActivity);
      document.addEventListener('keypress', handleActivity);
      document.addEventListener('scroll', handleActivity);
      
      // Activity monitoring interval
      const activityInterval = setInterval(() => {
        if (sessionMetrics.lastActivity) {
          const timeSinceActivity = Date.now() - sessionMetrics.lastActivity.getTime();
          
          // Log suspicious inactivity (more than 30 minutes)
          if (timeSinceActivity > 30 * 60 * 1000) {
            logSecurityEvent('SUSPICIOUS_INACTIVITY', {
              userId: user.id,
              inactivityMinutes: Math.floor(timeSinceActivity / 60000)
            });
          }
        }
      }, 5 * 60 * 1000); // Check every 5 minutes
      
      return () => {
        document.removeEventListener('click', handleActivity);
        document.removeEventListener('keypress', handleActivity);
        document.removeEventListener('scroll', handleActivity);
        clearInterval(activityInterval);
      };
    }
  }, [user, sessionMetrics.lastActivity]);

  useEffect(() => {
    // Enhanced session management with security monitoring
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logSecurityEvent('AUTH_SESSION_ERROR', { error: error.message });
        console.error('Session retrieval error:', error);
      }
      
      if (session?.user) {
        setUser(session.user);
        setSession(session);
        setSessionMetrics({
          loginTime: new Date(),
          lastActivity: new Date(),
          activityCount: 1
        });
        
        // Initialize encryption for biometric data
        initializeEncryptionKey(session.user.id);
        
        auditBiometricAccess('SESSION_RESTORED', {
          userId: session.user.id,
          success: true
        });
      }
      
      setIsLoading(false);
    });

    // Enhanced auth state monitoring
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      
      setUser(session?.user ?? null);
      setSession(session);
      setIsLoading(false);

      // Enhanced security logging with session validation
      if (event === 'SIGNED_IN' && session?.user) {
        setSessionMetrics({
          loginTime: new Date(),
          lastActivity: new Date(),
          activityCount: 1
        });
        
        await initializeEncryptionKey(session.user.id);
        
        logSecurityEvent('USER_LOGIN', { 
          userId: session.user.id,
          timestamp: new Date().toISOString(),
          sessionExpiry: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
        });
        
        auditBiometricAccess('USER_LOGIN', {
          userId: session.user.id,
          success: true
        });
        
      } else if (event === 'SIGNED_OUT') {
        // Clean up encryption key from memory (no localStorage cleanup needed)
        setEncryptionKey(null);
        setSecurityLevel('low');
        setSessionMetrics({
          loginTime: null,
          lastActivity: null,
          activityCount: 0
        });
        
        logSecurityEvent('USER_LOGOUT', { 
          timestamp: new Date().toISOString()
        });
        
        auditBiometricAccess('USER_LOGOUT', {
          success: true
        });
        
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        logSecurityEvent('TOKEN_REFRESH', { 
          userId: session.user.id,
          timestamp: new Date().toISOString()
        });
        
        updateActivity();
        
      } else if (event === 'PASSWORD_RECOVERY') {
        logSecurityEvent('PASSWORD_RECOVERY_INITIATED', {
          timestamp: new Date().toISOString()
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logSecurityEvent('LOGIN_FAILED', { 
          email: email.substring(0, 3) + '***',
          error: error.message,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
        
        auditBiometricAccess('LOGIN_FAILED', {
          email: email.substring(0, 3) + '***',
          reason: error.message,
          success: false
        });
        
        throw error;
      }

      // Check if user is active after successful authentication
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('is_active, full_name')
          .eq('user_id', data.user.id)
          .single();

        if (profileError) {
          logSecurityEvent('PROFILE_CHECK_FAILED', {
            userId: data.user.id,
            error: profileError.message
          });
          await supabase.auth.signOut();
          throw new Error('Failed to verify account status');
        }

        if (!profile.is_active) {
          logSecurityEvent('DISABLED_USER_LOGIN_ATTEMPT', {
            userId: data.user.id,
            email: email.substring(0, 3) + '***',
            fullName: profile.full_name
          });
          
          // Sign out the user immediately
          await supabase.auth.signOut();
          throw new Error('Your account has been disabled. Please contact your administrator.');
        }

        // Update last login timestamp
        await supabase
          .from('user_profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('user_id', data.user.id);
      }

      logSecurityEvent('LOGIN_SUCCESS', {
        email: email.substring(0, 3) + '***',
        timestamp: new Date().toISOString()
      });
      
      toast.success('Successfully logged in');
      
      // Handle post-login redirect
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath && redirectPath !== '/login') {
        localStorage.removeItem('redirectAfterLogin');
        navigate(redirectPath);
      } else {
        navigate('/');
      }
      
    } catch (error: any) {
      const rawMessage = typeof error?.message === 'string' ? error.message : '';

      const isNetworkOrBackendError =
        rawMessage === '{}' ||
        /Failed to fetch/i.test(rawMessage) ||
        /upstream connect error/i.test(rawMessage) ||
        error?.name === 'AuthRetryableFetchError' ||
        error?.status === 503;

      const errorMessage = isNetworkOrBackendError
        ? 'Cannot reach the authentication server right now (Supabase). If your Supabase project is paused/starting, wait 1–2 minutes and try again. Also disable any adblock/security extensions for this site.'
        : (rawMessage || 'Login failed. Please check your credentials.');

      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        logSecurityEvent('SIGNUP_FAILED', { 
          email: email.substring(0, 3) + '***',
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        auditBiometricAccess('SIGNUP_FAILED', {
          email: email.substring(0, 3) + '***',
          reason: error.message,
          success: false
        });
        
        throw error;
      }

      logSecurityEvent('SIGNUP_SUCCESS', { 
        email: email.substring(0, 3) + '***',
        timestamp: new Date().toISOString()
      });
      
      auditBiometricAccess('SIGNUP_SUCCESS', {
        email: email.substring(0, 3) + '***',
        success: true
      });
      
      toast.success('Account created successfully');
      navigate('/');
      
    } catch (error: any) {
      const rawMessage = typeof error?.message === 'string' ? error.message : '';

      const isNetworkOrBackendError =
        rawMessage === '{}' ||
        /Failed to fetch/i.test(rawMessage) ||
        /upstream connect error/i.test(rawMessage) ||
        error?.name === 'AuthRetryableFetchError' ||
        error?.status === 503;

      const errorMessage = isNetworkOrBackendError
        ? 'Cannot reach the authentication server right now (Supabase). If your Supabase project is paused/starting, wait 1–2 minutes and try again. Also disable any adblock/security extensions for this site.'
        : (rawMessage || 'Signup failed. Please try again.');

      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logSecurityEvent('LOGOUT_FAILED', { 
          error: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
      
      // Clean up will be handled by onAuthStateChange
      toast.success('Successfully logged out');
      navigate('/login');
      
    } catch (error: any) {
      toast.error(error.message || 'Error logging out');
    }
  };

  return (
    <EnhancedAuthContext.Provider value={{ 
      user, 
      session, 
      encryptionKey,
      login, 
      signUp, 
      logout, 
      isLoading,
      securityLevel,
      sessionMetrics
    }}>
      {children}
    </EnhancedAuthContext.Provider>
  );
}

export function useEnhancedAuth() {
  const context = useContext(EnhancedAuthContext);
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
}
