-- Create system settings table for storing configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on system settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for system settings (only super admins can manage)
CREATE POLICY "Super admins can view all system settings"
ON public.system_settings
FOR SELECT
USING (public.is_super_admin());

CREATE POLICY "Super admins can update system settings"
ON public.system_settings
FOR UPDATE
USING (public.is_super_admin());

CREATE POLICY "Super admins can insert system settings"
ON public.system_settings
FOR INSERT
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete system settings"
ON public.system_settings
FOR DELETE
USING (public.is_super_admin());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description, category) VALUES
  -- Security Settings
  ('security.enable_two_factor', 'true', 'Enable two-factor authentication for admin accounts', 'security'),
  ('security.session_timeout', '30', 'Session timeout in minutes', 'security'),
  ('security.max_login_attempts', '5', 'Maximum failed login attempts before lockout', 'security'),
  ('security.password_min_length', '8', 'Minimum password length', 'security'),
  ('security.require_special_chars', 'true', 'Require special characters in passwords', 'security'),
  
  -- System Configuration
  ('system.maintenance_mode', 'false', 'Enable maintenance mode', 'system'),
  ('system.max_users_per_batch', '50', 'Maximum users allowed per batch', 'system'),
  ('system.name', '"Biometric Management System"', 'System name', 'system'),
  ('system.admin_email', '"admin@system.com"', 'Administrator email address', 'system'),
  
  -- Notification Settings
  ('notifications.email_enabled', 'true', 'Enable email notifications', 'notifications'),
  ('notifications.audit_alerts', 'true', 'Enable audit log alerts', 'notifications'),
  ('notifications.frequency', '"daily"', 'Notification frequency', 'notifications'),
  
  -- Database Settings
  ('database.auto_backup', 'true', 'Enable automatic database backups', 'database'),
  ('database.backup_retention_days', '30', 'Backup retention period in days', 'database'),
  ('database.performance_mode', '"balanced"', 'Database performance mode', 'database')

ON CONFLICT (setting_key) DO NOTHING;

-- Create function to get system settings
CREATE OR REPLACE FUNCTION public.get_system_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  settings_json jsonb DEFAULT '{}';
  setting_record record;
BEGIN
  -- Check if caller is super admin
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Only super admin can view system settings');
  END IF;

  -- Build settings object
  FOR setting_record IN 
    SELECT setting_key, setting_value 
    FROM public.system_settings 
    ORDER BY setting_key
  LOOP
    settings_json = jsonb_set(
      settings_json, 
      string_to_array(setting_record.setting_key, '.'), 
      setting_record.setting_value
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'settings', settings_json);
END;
$$;

-- Create function to update system settings
CREATE OR REPLACE FUNCTION public.update_system_setting(key text, value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;

-- Create function to bulk update system settings
CREATE OR REPLACE FUNCTION public.update_system_settings(settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  key_path text[];
  setting_key text;
  setting_value jsonb;
  updated_count integer := 0;
BEGIN
  -- Check if caller is super admin
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Only super admin can update system settings');
  END IF;

  -- Iterate through settings object
  FOR key_path IN SELECT jsonb_path_query_array(settings, '$.keyvalue().key')::text[] FROM unnest(ARRAY[1])
  LOOP
    setting_key := array_to_string(key_path, '.');
    setting_value := settings #> key_path;
    
    -- Update setting
    INSERT INTO public.system_settings (setting_key, setting_value, updated_at)
    VALUES (setting_key, setting_value, now())
    ON CONFLICT (setting_key) 
    DO UPDATE SET 
      setting_value = EXCLUDED.setting_value,
      updated_at = now();
      
    updated_count := updated_count + 1;
  END LOOP;

  -- Log the bulk update
  INSERT INTO public.audit_logs (user_id, action, table_name, new_values)
  VALUES (
    auth.uid(),
    'SYSTEM_SETTINGS_BULK_UPDATE',
    'system_settings',
    jsonb_build_object('updated_count', updated_count, 'settings', settings)
  );

  RETURN jsonb_build_object('success', true, 'message', format('Updated %s settings successfully', updated_count));
END;
$$;