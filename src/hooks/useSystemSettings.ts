import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemSettings {
  security: {
    enable_two_factor: boolean;
    session_timeout: number;
    max_login_attempts: number;
    password_min_length: number;
    require_special_chars: boolean;
  };
  system: {
    maintenance_mode: boolean;
    max_users_per_batch: number;
    name: string;
    admin_email: string;
  };
  notifications: {
    email_enabled: boolean;
    audit_alerts: boolean;
    frequency: string;
  };
  database: {
    auto_backup: boolean;
    backup_retention_days: number;
    performance_mode: string;
  };
}

const defaultSettings: SystemSettings = {
  security: {
    enable_two_factor: true,
    session_timeout: 30,
    max_login_attempts: 5,
    password_min_length: 8,
    require_special_chars: true,
  },
  system: {
    maintenance_mode: false,
    max_users_per_batch: 50,
    name: 'Biometric Management System',
    admin_email: 'admin@system.com',
  },
  notifications: {
    email_enabled: true,
    audit_alerts: true,
    frequency: 'daily',
  },
  database: {
    auto_backup: true,
    backup_retention_days: 30,
    performance_mode: 'balanced',
  },
};

export function useSystemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<SystemSettings>(defaultSettings);

  // Super fast system settings with aggressive caching
  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_system_settings');
      
      if (error) throw error;
      
      const response = data as { success?: boolean; settings?: Partial<SystemSettings>; error?: string };
      
      if (!response?.success) throw new Error(response?.error || 'Failed to load settings');
      
      // Merge with defaults to ensure all properties exist
      const mergedSettings = {
        security: { ...defaultSettings.security, ...response.settings?.security },
        system: { ...defaultSettings.system, ...response.settings?.system },
        notifications: { ...defaultSettings.notifications, ...response.settings?.notifications },
        database: { ...defaultSettings.database, ...response.settings?.database },
      };
      
      return mergedSettings;
    },
    staleTime: Infinity, // Never consider stale
    gcTime: Infinity, // Keep in cache forever
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    initialData: defaultSettings,
  });

  // Update local settings when query data changes
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  // Real-time subscription for system settings
  useEffect(() => {
    const channel = supabase
      .channel('system-settings-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'system_settings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['system-settings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Super fast save all settings with optimistic updates
  const saveAllSettingsMutation = useMutation({
    mutationFn: async (settingsToSave: SystemSettings) => {
      // Convert settings to flat key-value pairs
      const flatSettings: Record<string, any> = {};
      
      Object.entries(settingsToSave).forEach(([category, categorySettings]) => {
        Object.entries(categorySettings).forEach(([key, value]) => {
          flatSettings[`${category}.${key}`] = value;
        });
      });

      // Save using bulk update for better performance
      const { data, error } = await supabase.rpc('update_system_settings', {
        settings: flatSettings
      });

      if (error) throw error;
      
      const response = data as { success?: boolean; error?: string };
      if (!response?.success) throw new Error(response?.error || 'Failed to save settings');
      
      return settingsToSave;
    },
    onMutate: async (newSettings) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['system-settings'] });
      
      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData(['system-settings']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['system-settings'], newSettings);
      
      return { previousSettings };
    },
    onError: (err, newSettings, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['system-settings'], context?.previousSettings);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "All settings saved successfully"
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure correct data
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });

  // Update local settings instantly
  const updateLocalSetting = (category: keyof SystemSettings, key: string, value: any) => {
    const newSettings = {
      ...localSettings,
      [category]: {
        ...localSettings[category],
        [key]: value
      }
    };
    setLocalSettings(newSettings);
  };

  // Save all settings with super fast response
  const saveAllSettings = () => {
    saveAllSettingsMutation.mutate(localSettings);
  };

  // Load settings manually
  const loadSettings = () => {
    refetch();
  };

  // Check if maintenance mode is enabled
  const isMaintenanceMode = () => (settings || localSettings).system.maintenance_mode;

  // Get setting value by path
  const getSetting = (path: string) => {
    const keys = path.split('.');
    let current: any = settings || localSettings;
    for (const key of keys) {
      current = current?.[key];
    }
    return current;
  };

  return {
    settings: localSettings, // Use local settings for instant UI updates
    isLoading,
    isSaving: saveAllSettingsMutation.isPending,
    saveAllSettings,
    updateLocalSetting,
    loadSettings,
    isMaintenanceMode,
    getSetting
  };
}