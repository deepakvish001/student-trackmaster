
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';

export type UserRole = 'admin' | 'operator' | 'viewer';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export function useUserProfile() {
  const { user } = useEnhancedAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('user_profiles' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // Profile doesn't exist, create one
        await createProfile();
      } else {
        setProfile(data as UserProfile);
        // Update last login
        await updateLastLogin();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setIsLoading(false);
    }
  };

  const createProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles' as any)
        .insert({
          user_id: user.id,
          full_name: user.email?.split('@')[0] || 'User',
          role: 'operator' as UserRole,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    }
  };

  const updateLastLogin = async () => {
    if (!user) return;

    try {
      await supabase
        .from('user_profiles' as any)
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', user.id);
    } catch (err) {
      console.warn('Failed to update last login:', err);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_profiles' as any)
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
      return data as UserProfile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!profile) return false;
    
    const roleHierarchy = { admin: 3, operator: 2, viewer: 1 };
    return roleHierarchy[profile.role] >= roleHierarchy[requiredRole];
  };

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    hasRole,
    refetch: fetchProfile
  };
}
