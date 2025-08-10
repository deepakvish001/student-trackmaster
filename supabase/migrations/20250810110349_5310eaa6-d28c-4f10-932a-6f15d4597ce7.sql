-- Insert default system settings if they don't exist
INSERT INTO public.system_settings (setting_key, setting_value, category, description) VALUES
-- Security Settings
('security.enable_two_factor', 'true', 'security', 'Require 2FA for all admin accounts'),
('security.session_timeout', '30', 'security', 'Session timeout in minutes'),
('security.max_login_attempts', '5', 'security', 'Maximum login attempts before lockout'),
('security.password_min_length', '8', 'security', 'Minimum password length'),
('security.require_special_chars', 'true', 'security', 'Require special characters in passwords'),

-- System Configuration
('system.maintenance_mode', 'false', 'system', 'Enable to restrict system access'),
('system.max_users_per_batch', '50', 'system', 'Maximum users allowed per batch'),
('system.name', '"Biometric Management System"', 'system', 'System name'),
('system.admin_email', '"admin@system.com"', 'system', 'Administrator email address'),

-- Notification Settings
('notifications.email_enabled', 'true', 'notifications', 'Enable email notifications'),
('notifications.audit_alerts', 'true', 'notifications', 'Enable audit log alerts'),
('notifications.frequency', '"daily"', 'notifications', 'Notification frequency'),

-- Database Settings
('database.auto_backup', 'true', 'database', 'Enable automatic daily backups'),
('database.backup_retention_days', '30', 'database', 'Number of days to retain backups'),
('database.performance_mode', '"balanced"', 'database', 'Database performance mode')

ON CONFLICT (setting_key) DO NOTHING;

-- Update the get_system_settings function to properly structure the response
CREATE OR REPLACE FUNCTION public.get_system_settings()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  settings_json jsonb DEFAULT '{}';
  setting_record record;
  category_path text[];
  setting_name text;
BEGIN
  -- Check if caller is super admin
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Only super admin can view system settings');
  END IF;

  -- Initialize nested structure
  settings_json := jsonb_build_object(
    'security', '{}',
    'system', '{}', 
    'notifications', '{}',
    'database', '{}'
  );

  -- Build settings object with proper nesting
  FOR setting_record IN 
    SELECT setting_key, setting_value 
    FROM public.system_settings 
    ORDER BY setting_key
  LOOP
    -- Split the setting key (e.g., 'security.enable_two_factor')
    category_path := string_to_array(setting_record.setting_key, '.');
    
    IF array_length(category_path, 1) = 2 THEN
      -- Update the nested structure
      settings_json := jsonb_set(
        settings_json,
        ARRAY[category_path[1], category_path[2]],
        setting_record.setting_value,
        true
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'settings', settings_json);
END;
$function$;

-- Update the update_system_setting function to handle the format correctly
CREATE OR REPLACE FUNCTION public.update_system_setting(key text, value jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Check if caller is super admin
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Only super admin can update system settings');
  END IF;

  -- Update or insert setting
  INSERT INTO public.system_settings (setting_key, setting_value, updated_at)
  VALUES (key, value, now())
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = now();

  -- Log the change
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
  VALUES (
    auth.uid(),
    'SYSTEM_SETTING_UPDATED',
    'system_settings',
    key,
    jsonb_build_object('setting_key', key, 'new_value', value)
  );

  RETURN jsonb_build_object('success', true, 'message', 'Setting updated successfully');
END;
$function$;

-- Create function to reset settings to defaults
CREATE OR REPLACE FUNCTION public.reset_system_settings_to_defaults()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Check if caller is super admin
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Only super admin can reset system settings');
  END IF;

  -- Delete all existing settings
  DELETE FROM public.system_settings;

  -- Insert default settings
  INSERT INTO public.system_settings (setting_key, setting_value, category, description) VALUES
  -- Security Settings
  ('security.enable_two_factor', 'true', 'security', 'Require 2FA for all admin accounts'),
  ('security.session_timeout', '30', 'security', 'Session timeout in minutes'),
  ('security.max_login_attempts', '5', 'security', 'Maximum login attempts before lockout'),
  ('security.password_min_length', '8', 'security', 'Minimum password length'),
  ('security.require_special_chars', 'true', 'security', 'Require special characters in passwords'),

  -- System Configuration
  ('system.maintenance_mode', 'false', 'system', 'Enable to restrict system access'),
  ('system.max_users_per_batch', '50', 'system', 'Maximum users allowed per batch'),
  ('system.name', '"Biometric Management System"', 'system', 'System name'),
  ('system.admin_email', '"admin@system.com"', 'system', 'Administrator email address'),

  -- Notification Settings
  ('notifications.email_enabled', 'true', 'notifications', 'Enable email notifications'),
  ('notifications.audit_alerts', 'true', 'notifications', 'Enable audit log alerts'),
  ('notifications.frequency', '"daily"', 'notifications', 'Notification frequency'),

  -- Database Settings
  ('database.auto_backup', 'true', 'database', 'Enable automatic daily backups'),
  ('database.backup_retention_days', '30', 'database', 'Number of days to retain backups'),
  ('database.performance_mode', '"balanced"', 'database', 'Database performance mode');

  -- Log the reset
  INSERT INTO public.audit_logs (user_id, action, table_name, new_values)
  VALUES (
    auth.uid(),
    'SYSTEM_SETTINGS_RESET_TO_DEFAULTS',
    'system_settings',
    jsonb_build_object('message', 'All system settings reset to default values')
  );

  RETURN jsonb_build_object('success', true, 'message', 'System settings reset to defaults successfully');
END;
$function$;