-- Add function to validate user active status during login
CREATE OR REPLACE FUNCTION public.validate_user_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is inactive in user_profiles
  IF EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = NEW.id AND is_active = false
  ) THEN
    RAISE EXCEPTION 'Account has been disabled. Please contact administrator.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate user login
DROP TRIGGER IF EXISTS validate_user_login_trigger ON auth.users;
CREATE TRIGGER validate_user_login_trigger
  BEFORE UPDATE ON auth.users
  FOR EACH ROW 
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.validate_user_login();