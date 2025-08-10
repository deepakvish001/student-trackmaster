import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemSettings {
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
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load settings from database
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      console.log('Loading system settings...');
      
      const { data, error } = await supabase.rpc('get_system_settings');
      
      if (error) {
        console.error('Error loading settings:', error);
        toast({
          title: "Error",
          description: "Failed to load system settings",
          variant: "destructive"
        });
        return;
      }

      // Type assertion for the response data
      const response = data as { success?: boolean; settings?: Partial<SystemSettings>; error?: string };

      if (response?.success && response?.settings) {
        console.log('Loaded settings:', response.settings);
        // Merge with default settings to ensure all properties exist
        const mergedSettings = {
          security: { ...defaultSettings.security, ...response.settings.security },
          system: { ...defaultSettings.system, ...response.settings.system },
          notifications: { ...defaultSettings.notifications, ...response.settings.notifications },
          database: { ...defaultSettings.database, ...response.settings.database },
        };
        setSettings(mergedSettings);
      } else if (response?.error) {
        console.error('Settings error:', response.error);
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive"
        });
        // Keep default settings on error
      } else {
        console.log('No settings found, using defaults');
        // Keep default settings if no settings are returned
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      toast({
        title: "Error",
        description: "Failed to connect to database",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save single setting
  const updateSetting = async (key: string, value: any) => {
    try {
      console.log(`Updating setting ${key}:`, value);
      
      const { data, error } = await supabase.rpc('update_system_setting', {
        key,
        value: JSON.stringify(value)
      });

      if (error) {
        console.error('Error updating setting:', error);
        throw error;
      }

      // Type assertion for the response data
      const response = data as { success?: boolean; error?: string };

      if (response?.success) {
        console.log('Setting updated successfully');
        // Update local state
        const keys = key.split('.');
        setSettings(prev => {
          const newSettings = { ...prev };
          let current: any = newSettings;
          for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;
          return newSettings;
        });
        
        toast({
          title: "Success",
          description: "Setting updated successfully"
        });
      } else {
        throw new Error(response?.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Failed to update setting:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to update setting",
        variant: "destructive"
      });
    }
  };

  // Save all settings
  const saveAllSettings = async () => {
    try {
      setIsSaving(true);
      console.log('Saving all settings:', settings);

      // Convert settings to flat key-value pairs
      const flatSettings: Record<string, any> = {};
      
      Object.entries(settings).forEach(([category, categorySettings]) => {
        Object.entries(categorySettings).forEach(([key, value]) => {
          flatSettings[`${category}.${key}`] = value;
        });
      });

      // Save each setting individually for better error handling
      const promises = Object.entries(flatSettings).map(([key, value]) =>
        supabase.rpc('update_system_setting', {
          key,
          value: JSON.stringify(value)
        })
      );

      const results = await Promise.allSettled(promises);
      
      let successCount = 0;
      let errorCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const response = result.value.data as { success?: boolean; error?: string };
          if (response?.success) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed to save setting ${Object.keys(flatSettings)[index]}:`, response?.error);
          }
        } else {
          errorCount++;
          console.error(`Failed to save setting ${Object.keys(flatSettings)[index]}:`, result.reason);
        }
      });

      if (errorCount === 0) {
        toast({
          title: "Success",
          description: `All ${successCount} settings saved successfully`
        });
      } else {
        toast({
          title: "Partial Success",
          description: `${successCount} settings saved, ${errorCount} failed`,
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update local settings
  const updateLocalSetting = (category: keyof SystemSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  // Check if maintenance mode is enabled
  const isMaintenanceMode = () => settings.system.maintenance_mode;

  // Get setting value by path
  const getSetting = (path: string) => {
    const keys = path.split('.');
    let current: any = settings;
    for (const key of keys) {
      current = current?.[key];
    }
    return current;
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    isLoading,
    isSaving,
    updateSetting,
    saveAllSettings,
    updateLocalSetting,
    loadSettings,
    isMaintenanceMode,
    getSetting
  };
}