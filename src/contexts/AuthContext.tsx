
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { logSecurityEvent } from '@/utils/inputSanitization';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check active session with enhanced error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logSecurityEvent('AUTH_SESSION_ERROR', { error: error.message });
        console.error('Session retrieval error:', error);
      }
      setUser(session?.user ?? null);
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes with enhanced security logging
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setSession(session);
      setIsLoading(false);

      // Enhanced security logging
      if (event === 'SIGNED_IN') {
        logSecurityEvent('USER_LOGIN', { 
          userId: session?.user?.id,
          timestamp: new Date().toISOString()
        });
      } else if (event === 'SIGNED_OUT') {
        logSecurityEvent('USER_LOGOUT', { 
          timestamp: new Date().toISOString()
        });
      } else if (event === 'TOKEN_REFRESHED') {
        logSecurityEvent('TOKEN_REFRESH', { 
          userId: session?.user?.id,
          timestamp: new Date().toISOString()
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logSecurityEvent('LOGIN_FAILED', { 
          email: email.substring(0, 3) + '***', // Partial email for security
          error: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      }

      logSecurityEvent('LOGIN_SUCCESS', { 
        email: email.substring(0, 3) + '***',
        timestamp: new Date().toISOString()
      });
      toast.success('Successfully logged in');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
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
        throw error;
      }

      logSecurityEvent('SIGNUP_SUCCESS', { 
        email: email.substring(0, 3) + '***',
        timestamp: new Date().toISOString()
      });
      toast.success('Account created successfully');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Signup failed. Please try again.');
      throw error;
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
      
      setUser(null);
      setSession(null);
      navigate('/login');
      toast.success('Successfully logged out');
    } catch (error: any) {
      toast.error(error.message || 'Error logging out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, login, signUp, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
