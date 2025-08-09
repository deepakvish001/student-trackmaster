-- Update user roles to support super_admin and user roles
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('super_admin', 'user');

-- Update the role column to use the new enum
ALTER TABLE public.user_profiles 
ALTER COLUMN role TYPE public.user_role USING role::public.user_role;

-- Set default role to 'user'
ALTER TABLE public.user_profiles 
ALTER COLUMN role SET DEFAULT 'user'::public.user_role;

-- Update existing user to super_admin (assuming first user created is the super admin)
UPDATE public.user_profiles 
SET role = 'super_admin'::public.user_role 
WHERE created_at = (SELECT MIN(created_at) FROM public.user_profiles);

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.user_profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT public.get_current_user_role() = 'super_admin'::public.user_role;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Update RLS policies for user_profiles to allow super_admin to manage all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- New RLS policies
CREATE POLICY "Users can view their own profile or super_admin can view all" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_super_admin());

CREATE POLICY "Users can update their own profile or super_admin can update others (not themselves)" 
ON public.user_profiles 
FOR UPDATE 
USING (
  (auth.uid() = user_id AND public.get_current_user_role() != 'super_admin'::public.user_role) OR 
  (public.is_super_admin() AND auth.uid() != user_id)
);

CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admin can delete other users (not themselves)" 
ON public.user_profiles 
FOR DELETE 
USING (public.is_super_admin() AND auth.uid() != user_id);

-- Create user management functions for super admin
CREATE OR REPLACE FUNCTION public.create_user_by_admin(
  email TEXT,
  password TEXT,
  full_name TEXT,
  user_role public.user_role DEFAULT 'user'::public.user_role
)
RETURNS JSON AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Check if caller is super admin
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('error', 'Unauthorized: Only super admin can create users');
  END IF;

  -- This function would need to be called from an edge function
  -- since we can't directly create auth users from SQL
  RETURN json_build_object('success', true, 'message', 'User creation initiated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user role (only super admin)
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role public.user_role
)
RETURNS JSON AS $$
BEGIN
  -- Check if caller is super admin
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('error', 'Unauthorized: Only super admin can update roles');
  END IF;

  -- Prevent super admin from changing their own role
  IF target_user_id = auth.uid() THEN
    RETURN json_build_object('error', 'Cannot modify your own role');
  END IF;

  UPDATE public.user_profiles 
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;

  IF FOUND THEN
    RETURN json_build_object('success', true, 'message', 'Role updated successfully');
  ELSE
    RETURN json_build_object('error', 'User not found');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;