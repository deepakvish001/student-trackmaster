import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo } from 'react';

/**
 * Ultra-fast admin hook for administration pages
 * Optimized for instant loading with aggressive caching
 */
export function useUltraFastAdmin() {
  const queryClient = useQueryClient();

  // Ultra-fast user management query
  const usersQuery = useQuery({
    queryKey: ['ultra-fast-admin-users'],
    queryFn: async () => {
      console.log('👥 Fetching ultra-fast admin users...');
      
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'get_users' }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      console.log('✅ Admin users loaded:', data.users?.length || 0);
      return data.users || [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    networkMode: 'online',
  });

  // Ultra-fast audit logs query
  const auditLogsQuery = useQuery({
    queryKey: ['ultra-fast-audit-logs'],
    queryFn: async () => {
      console.log('📋 Fetching ultra-fast audit logs...');
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          user_id,
          action,
          table_name,
          record_id,
          old_values,
          new_values,
          ip_address,
          user_agent,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      console.log('✅ Audit logs loaded:', data?.length || 0);
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Ultra-fast system settings query
  const systemSettingsQuery = useQuery({
    queryKey: ['ultra-fast-system-settings'],
    queryFn: async () => {
      console.log('⚙️ Fetching ultra-fast system settings...');
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category, setting_key');

      if (error) throw error;
      
      // Group settings by category for better organization
      const groupedSettings = (data || []).reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = {};
        }
        acc[setting.category][setting.setting_key] = setting;
        return acc;
      }, {} as Record<string, any>);
      
      console.log('✅ System settings loaded:', Object.keys(groupedSettings).length, 'categories');
      return groupedSettings;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Ultra-fast batch access query
  const batchAccessQuery = useQuery({
    queryKey: ['ultra-fast-batch-access'],
    queryFn: async () => {
      console.log('🔐 Fetching ultra-fast batch access...');
      
      const { data, error } = await supabase
        .from('user_batch_access')
        .select(`
          user_id,
          batch_id,
          granted_by,
          created_at,
          batches:batch_id (
            id,
            batch_name,
            is_enabled
          )
        `);

      if (error) throw error;
      
      console.log('✅ Batch access loaded:', data?.length || 0, 'records');
      return data || [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Real-time subscriptions for admin data
  useEffect(() => {
    console.log('🔄 Setting up real-time admin subscriptions...');
    
    const channels = [
      // User profiles changes
      supabase
        .channel('ultra-fast-user-profiles')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'user_profiles' },
          () => {
            console.log('👤 User profiles changed - invalidating admin users');
            queryClient.invalidateQueries({ queryKey: ['ultra-fast-admin-users'] });
          }
        ),

      // Audit logs updates
      supabase
        .channel('ultra-fast-audit-logs')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'audit_logs' },
          () => {
            console.log('📝 New audit log - invalidating audit queries');
            queryClient.invalidateQueries({ queryKey: ['ultra-fast-audit-logs'] });
          }
        ),

      // System settings changes
      supabase
        .channel('ultra-fast-system-settings')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'system_settings' },
          () => {
            console.log('⚙️ System settings changed - invalidating settings');
            queryClient.invalidateQueries({ queryKey: ['ultra-fast-system-settings'] });
          }
        ),

      // Batch access changes
      supabase
        .channel('ultra-fast-batch-access')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'user_batch_access' },
          () => {
            console.log('🔐 Batch access changed - invalidating access queries');
            queryClient.invalidateQueries({ queryKey: ['ultra-fast-batch-access'] });
          }
        ),
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      console.log('🧹 Cleaning up admin subscriptions');
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [queryClient]);

  // Memoized statistics
  const adminStats = useMemo(() => {
    const users = usersQuery.data || [];
    const auditLogs = auditLogsQuery.data || [];
    const batchAccess = batchAccessQuery.data || [];

    return {
      totalUsers: users.length,
      activeUsers: users.filter((user: any) => user.is_active).length,
      adminUsers: users.filter((user: any) => user.role === 'admin' || user.role === 'super_admin').length,
      recentActivity: auditLogs.slice(0, 10),
      totalBatchAccess: batchAccess.length,
      uniqueUsersWithAccess: new Set(batchAccess.map((access: any) => access.user_id)).size,
      lastActivityTime: auditLogs[0]?.created_at,
    };
  }, [usersQuery.data, auditLogsQuery.data, batchAccessQuery.data]);

  return {
    // Data
    users: usersQuery.data || [],
    auditLogs: auditLogsQuery.data || [],
    systemSettings: systemSettingsQuery.data || {},
    batchAccess: batchAccessQuery.data || [],
    stats: adminStats,
    
    // Loading states
    isLoading: usersQuery.isLoading || auditLogsQuery.isLoading || systemSettingsQuery.isLoading,
    isLoadingUsers: usersQuery.isLoading,
    isLoadingAuditLogs: auditLogsQuery.isLoading,
    isLoadingSettings: systemSettingsQuery.isLoading,
    isLoadingBatchAccess: batchAccessQuery.isLoading,
    
    // Error states
    error: usersQuery.error || auditLogsQuery.error || systemSettingsQuery.error || batchAccessQuery.error,
    
    // Actions
    refetch: () => {
      usersQuery.refetch();
      auditLogsQuery.refetch();
      systemSettingsQuery.refetch();
      batchAccessQuery.refetch();
    },
    
    // Cache management
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['ultra-fast-admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['ultra-fast-audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['ultra-fast-system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['ultra-fast-batch-access'] });
    },
    
    clearCache: () => {
      queryClient.removeQueries({ queryKey: ['ultra-fast-admin-users'] });
      queryClient.removeQueries({ queryKey: ['ultra-fast-audit-logs'] });
      queryClient.removeQueries({ queryKey: ['ultra-fast-system-settings'] });
      queryClient.removeQueries({ queryKey: ['ultra-fast-batch-access'] });
    }
  };
}