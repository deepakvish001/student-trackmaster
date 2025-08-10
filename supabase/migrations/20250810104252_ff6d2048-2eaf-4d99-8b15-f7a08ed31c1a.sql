-- Create optimized database functions for user management operations

-- Function to toggle user status (atomic operation)
CREATE OR REPLACE FUNCTION public.toggle_user_status(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_status boolean;
  new_status boolean;
BEGIN
  -- Check if caller is super admin
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('error', 'Unauthorized: Only super admin can toggle user status');
  END IF;

  -- Prevent self-status change
  IF target_user_id = auth.uid() THEN
    RETURN json_build_object('error', 'Cannot change your own account status');
  END IF;

  -- Get current status and toggle it atomically
  UPDATE public.user_profiles 
  SET is_active = NOT is_active,
      updated_at = now()
  WHERE user_id = target_user_id
  RETURNING is_active INTO new_status;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  RETURN json_build_object(
    'success', true, 
    'message', CASE WHEN new_status THEN 'User enabled successfully' ELSE 'User disabled successfully' END,
    'new_status', new_status
  );
END;
$$;

-- Function to update user status (enable/disable)
CREATE OR REPLACE FUNCTION public.update_user_status(target_user_id uuid, new_status boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Check if caller is super admin
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('error', 'Unauthorized: Only super admin can update user status');
  END IF;

  -- Prevent self-status change
  IF target_user_id = auth.uid() THEN
    RETURN json_build_object('error', 'Cannot change your own account status');
  END IF;

  -- Update user status
  UPDATE public.user_profiles 
  SET is_active = new_status,
      updated_at = now()
  WHERE user_id = target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  RETURN json_build_object(
    'success', true, 
    'message', CASE WHEN new_status THEN 'User enabled successfully' ELSE 'User disabled successfully' END
  );
END;
$$;

-- Function to safely delete user and all related data
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_name text;
BEGIN
  -- Check if caller is super admin
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('error', 'Unauthorized: Only super admin can delete users');
  END IF;

  -- Prevent self-deletion
  IF target_user_id = auth.uid() THEN
    RETURN json_build_object('error', 'Cannot delete your own account');
  END IF;

  -- Get user name for logging
  SELECT full_name INTO user_name 
  FROM public.user_profiles 
  WHERE user_id = target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  -- Delete user profile first (this will be cascaded properly)
  DELETE FROM public.user_profiles WHERE user_id = target_user_id;

  -- Note: Actual auth user deletion should still be done via admin API
  -- as it requires service role permissions

  RETURN json_build_object(
    'success', true, 
    'message', 'User profile deleted successfully',
    'user_name', user_name
  );
END;
$$;

-- Function to get user profile with optimized query
CREATE OR REPLACE FUNCTION public.get_user_profile(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  profile_data json;
BEGIN
  -- Check if caller is super admin
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('error', 'Unauthorized: Only super admin can view user profiles');
  END IF;

  SELECT json_build_object(
    'id', id,
    'user_id', user_id,
    'full_name', full_name,
    'role', role,
    'is_active', is_active,
    'last_login_at', last_login_at,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO profile_data
  FROM public.user_profiles 
  WHERE user_id = target_user_id;

  IF profile_data IS NULL THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  RETURN json_build_object('success', true, 'profile', profile_data);
END;
$$;

-- Create index for better performance on user_profiles queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON public.user_profiles(last_login_at DESC NULLS LAST);