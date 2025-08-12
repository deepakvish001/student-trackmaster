import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logSecurityEvent } from '@/utils/inputSanitization';
import { 
  generateEncryptionKey, 
  exportEncryptionKey, 
  importEncryptionKey,
  auditBiometricAccess 
} from '@/utils/biometricSecurity';
import { offlineDb } from '@/lib/offlineDatabase';
import { useOfflineAuth } from '@/hooks/useOfflineAuth';
import { useOfflineSecurity } from '@/hooks/useOfflineSecurity';

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
  // Offline capabilities
  canWorkOffline: boolean;
  offlineCapable: boolean;
  validateOfflineSession: () => Promise<boolean>;
  tokenExpiresAt: Date | null;
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(undefined);

export function EnhancedAuthProvider({ children }: { children: React.ReactNode }) {
  const mountRef = useRef(false);
  const initializingRef = useRef(false);
  
  // Only log mounting once
  if (!mountRef.current) {
    console.log('EnhancedAuthProvider mounting');
    mountRef.current = true;
  }
  
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

  // Initialize offline authentication capabilities
  const offlineAuth = useOfflineAuth();
  const offlineSecurity = useOfflineSecurity();

  // Stable callbacks
  const logAuthEvent = useCallback(async (type: string, data?: any) => {
    try {
      console.log('Auth Event:', type, data);
      const event = {
        type,
        data,
        timestamp: new Date().toISOString(),
        user_id: user?.id
      };
      localStorage.setItem(`auth_event_${Date.now()}`, JSON.stringify(event));
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  }, [user?.id]);

  const initializeEncryptionKey = useCallback(async (userId: string) => {
    if (initializingRef.current) return;
    initializingRef.current = true;
    
    try {
      const storedKey = localStorage.getItem(`biometric_key_${userId}`);
      
      if (storedKey) {
        console.log('Loading existing encryption key');
        const key = await importEncryptionKey(storedKey);
        setEncryptionKey(key);
        logSecurityEvent('ENCRYPTION_KEY_LOADED', { userId });
      } else {
        console.log('Generating new encryption key');
        const key = await generateEncryptionKey();
        const exportedKey = await exportEncryptionKey(key);
        localStorage.setItem(`biometric_key_${userId}`, exportedKey);
        setEncryptionKey(key);
        logSecurityEvent('ENCRYPTION_KEY_CREATED', { userId });
      }
      
      setSecurityLevel('high');
    } catch (error) {
      console.error('Failed to initialize encryption key:', error);
      logSecurityEvent('ENCRYPTION_KEY_INIT_FAILED', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setSecurityLevel('low');
    } finally {
      initializingRef.current = false;
    }
  }, []);

  const updateActivity = useCallback(() => {
    setSessionMetrics(prev => ({
      ...prev,
      lastActivity: new Date(),
      activityCount: prev.activityCount + 1
    }));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Log failed login for offline security monitoring
        await offlineSecurity.logSecurityEvent(
          'authentication',
          'medium',
          'Login attempt failed',
          { success: false, email: email.substring(0, 3) + '***', error: error.message }
        );
        
        logSecurityEvent('LOGIN_FAILED', { 
          email: email.substring(0, 3) + '***',
          error: error.message,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
        
        logAuthEvent('LOGIN_FAILED', { success: false, email, error: error.message });
        
        auditBiometricAccess('LOGIN_FAILED', {
          email: email.substring(0, 3) + '***',
          reason: error.message,
          success: false
        });
        
        throw error;
      }

      if (data.user && data.session) {
        // Cache session for offline use
        await offlineAuth.cacheSession(data.session, data.user.id);
        
        // Log security event for offline monitoring
        await offlineSecurity.logSecurityEvent(
          'authentication',
          'low',
          'User login successful',
          { success: true, email: email.substring(0, 3) + '***' }
        );

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('is_active, full_name')
          .eq('user_id', data.user.id)
          .single();

        if (profileError) {
          await offlineSecurity.logSecurityEvent(
            'authentication',
            'high',
            'Profile check failed during login',
            { userId: data.user.id, error: profileError.message }
          );
          
          logSecurityEvent('PROFILE_CHECK_FAILED', {
            userId: data.user.id,
            error: profileError.message
          });
          await supabase.auth.signOut();
          throw new Error('Failed to verify account status');
        }

        if (!profile.is_active) {
          await offlineSecurity.logSecurityEvent(
            'authentication',
            'critical',
            'Disabled user attempted login',
            { userId: data.user.id, email: email.substring(0, 3) + '***' }
          );
          
          logSecurityEvent('DISABLED_USER_LOGIN_ATTEMPT', {
            userId: data.user.id,
            email: email.substring(0, 3) + '***',
            fullName: profile.full_name
          });
          
          await supabase.auth.signOut();
          throw new Error('Your account has been disabled. Please contact your administrator.');
        }

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
      
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath && redirectPath !== '/login') {
        localStorage.removeItem('redirectAfterLogin');
        navigate(redirectPath);
      } else {
        navigate('/');
      }
      
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [logAuthEvent, navigate]);

  const signUp = useCallback(async (email: string, password: string) => {
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
      const errorMessage = error.message || 'Signup failed. Please try again.';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      // Log logout event for offline security monitoring
      await offlineSecurity.logSecurityEvent(
        'authentication',
        'low',
        'User logout initiated',
        { userId: user?.id }
      );

      const { error } = await supabase.auth.signOut();
      if (error) {
        await offlineSecurity.logSecurityEvent(
          'authentication',
          'medium',
          'Logout failed',
          { error: error.message }
        );
        
        logSecurityEvent('LOGOUT_FAILED', { 
          error: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
      
      try {
        await offlineDb.clearAllData();
        console.log('✅ Offline data cleared on logout');
      } catch (offlineError) {
        console.error('Failed to clear offline data:', offlineError);
      }
      
      toast.success('Successfully logged out');
      navigate('/login');
      
    } catch (error: any) {
      toast.error(error.message || 'Error logging out');
    }
  }, [navigate, user?.id, offlineSecurity]);

  // Initialize session - only once
  useEffect(() => {
    let isMounted = true;
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      
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
        
        initializeEncryptionKey(session.user.id);
        
        auditBiometricAccess('SESSION_RESTORED', {
          userId: session.user.id,
          success: true
        });
      }
      
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [initializeEncryptionKey]);

  // Auth state change listener - stable
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      
      setUser(session?.user ?? null);
      setSession(session);
      setIsLoading(false);

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
        if (user?.id) {
          localStorage.removeItem(`biometric_key_${user.id}`);
        }
        
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
      }
    });

    return () => subscription.unsubscribe();
  }, [user?.id, initializeEncryptionKey, updateActivity]);

  // Activity monitoring - stable
  useEffect(() => {
    if (!user) return;

    const handleActivity = () => updateActivity();
    
    document.addEventListener('click', handleActivity, { passive: true });
    document.addEventListener('keypress', handleActivity, { passive: true });
    document.addEventListener('scroll', handleActivity, { passive: true });
    
    const activityInterval = setInterval(() => {
      if (sessionMetrics.lastActivity) {
        const timeSinceActivity = Date.now() - sessionMetrics.lastActivity.getTime();
        
        if (timeSinceActivity > 30 * 60 * 1000) {
          logSecurityEvent('SUSPICIOUS_INACTIVITY', {
            userId: user.id,
            inactivityMinutes: Math.floor(timeSinceActivity / 60000)
          });
        }
      }
    }, 5 * 60 * 1000);
    
    return () => {
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('keypress', handleActivity);
      document.removeEventListener('scroll', handleActivity);
      clearInterval(activityInterval);
    };
  }, [user?.id, sessionMetrics.lastActivity, updateActivity]);

  // Validate offline session capability
  const validateOfflineSession = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    return await offlineSecurity.validateOfflineSession();
  }, [user, offlineSecurity]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    session,
    encryptionKey,
    login,
    signUp,
    logout,
    isLoading,
    securityLevel,
    sessionMetrics,
    // Offline capabilities
    canWorkOffline: offlineAuth.canWorkOffline(),
    offlineCapable: offlineAuth.offlineState.isOfflineCapable,
    validateOfflineSession,
    tokenExpiresAt: offlineAuth.offlineState.tokenExpiresAt
  }), [
    user,
    session, 
    encryptionKey,
    login,
    signUp,
    logout,
    isLoading,
    securityLevel,
    sessionMetrics,
    offlineAuth.canWorkOffline,
    offlineAuth.offlineState.isOfflineCapable,
    offlineAuth.offlineState.tokenExpiresAt,
    validateOfflineSession
  ]);

  return (
    <EnhancedAuthContext.Provider value={contextValue}>
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