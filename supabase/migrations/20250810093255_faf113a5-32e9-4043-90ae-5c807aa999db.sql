-- Fix the handle_new_user_profile function to use valid enum values
-- The current function tries to use 'operator' which doesn't exist in the user_role enum

-- Update the function to use 'user' as the default role instead of 'operator'
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user'::public.user_role  -- Use 'user' instead of 'operator'
  );
  RETURN NEW;
END;
$$;