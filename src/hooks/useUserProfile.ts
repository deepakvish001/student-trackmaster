import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';

export type UserRole = 'super_admin' | 'user';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  max_batches_allowed?: number;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export function useUserProfile() {
  const { user } = useEnhancedAuth();
  const queryClient = useQueryClient();

  // Super-fast user profile with aggressive caching
  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        throw error;
      }

      if (!data) {
        // Profile doesn't exist, create one
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            full_name: user.email?.split('@')[0] || 'User',
            role: 'user' as UserRole,
            is_active: true,
            max_batches_allowed: 1
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
        }

        // Update last login for new profile
        await supabase
          .from('user_profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('user_id', user.id);

        return newProfile as UserProfile;
      }

      // Update last login for existing profile
      await supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', user.id);

      return data as UserProfile;
    },
    enabled: !!user?.id,
    staleTime: Infinity, // Never consider stale
    gcTime: Infinity, // Keep in cache forever
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Super-fast profile update with optimistic updates
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    onMutate: async (updates) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user-profile', user?.id] });
      
      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData(['user-profile', user?.id]);
      
      // Optimistically update to the new value
      if (previousProfile && profile) {
        queryClient.setQueryData(['user-profile', user?.id], { ...profile, ...updates });
      }
      
      return { previousProfile };
    },
    onError: (err, updates, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['user-profile', user?.id], context?.previousProfile);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure correct data
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
    },
  });

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!profile) return false;
    
    const roleHierarchy = { super_admin: 2, user: 1 };
    return roleHierarchy[profile.role] >= roleHierarchy[requiredRole];
  };

  const isSuperAdmin = (): boolean => {
    return profile?.role === 'super_admin';
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    return updateProfileMutation.mutateAsync(updates);
  };

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    hasRole,
    isSuperAdmin,
    refetch,
    isUpdating: updateProfileMutation.isPending,
  };
}