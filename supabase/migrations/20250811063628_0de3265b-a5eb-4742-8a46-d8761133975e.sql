-- Fix the toggle_user_status function to accept calling_user_id parameter
CREATE OR REPLACE FUNCTION public.toggle_user_status(target_user_id uuid, calling_user_id uuid DEFAULT auth.uid())
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  current_status boolean;
  new_status boolean;
BEGIN
  -- Check if caller is super admin using the provided calling_user_id
  IF NOT public.is_user_super_admin(calling_user_id) THEN
    RETURN json_build_object('error', 'Unauthorized: Only super admin can toggle user status');
  END IF;

  -- Prevent self-status change
  IF target_user_id = calling_user_id THEN
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
$function$;