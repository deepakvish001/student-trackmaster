-- Complete fix for infinite recursion in batches RLS policies
-- This migration will create a completely non-recursive policy structure

-- First, disable RLS temporarily to avoid issues
ALTER TABLE public.batches DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on batches table
DROP POLICY IF EXISTS "Users can view their own batches" ON public.batches;
DROP POLICY IF EXISTS "Users can create their own batches" ON public.batches;  
DROP POLICY IF EXISTS "Users can update their own batches" ON public.batches;
DROP POLICY IF EXISTS "Users can delete their own batches" ON public.batches;
DROP POLICY IF EXISTS "Enhanced batches view policy" ON public.batches;
DROP POLICY IF EXISTS "Users can update accessible batches only" ON public.batches;
DROP POLICY IF EXISTS "Users can delete batches they own" ON public.batches;
DROP POLICY IF EXISTS "Authenticated users can create batches" ON public.batches;

-- Create a simple function to check if user is super admin without recursion
CREATE OR REPLACE FUNCTION public.is_user_super_admin(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    JOIN public.user_profiles up ON au.id = up.user_id
    WHERE au.id = target_user_id 
    AND up.role = 'super_admin'::public.user_role
    AND up.is_active = true
  );
$$;

-- Create very simple, non-recursive policies
CREATE POLICY "Simple batch select policy" 
ON public.batches 
FOR SELECT 
USING (
  auth.role() = 'authenticated'::text AND (
    -- Super admin can see all
    public.is_user_super_admin(auth.uid()) OR
    -- User can see their own batches
    auth.uid() = user_id OR
    -- User can see batches they have explicit access to
    EXISTS (
      SELECT 1 FROM public.user_batch_access uba 
      WHERE uba.user_id = auth.uid() AND uba.batch_id = batches.id
    )
  )
);

CREATE POLICY "Simple batch insert policy" 
ON public.batches 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated'::text AND 
  auth.uid() = user_id AND (
    -- Super admin can create unlimited batches
    public.is_user_super_admin(auth.uid()) OR
    -- Regular users are limited by their profile setting
    (
      SELECT COUNT(*) FROM public.batches b
      WHERE b.user_id = auth.uid() AND b.is_enabled = true
    ) < COALESCE((
      SELECT up.max_batches_allowed FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
    ), 1)
  )
);

CREATE POLICY "Simple batch update policy" 
ON public.batches 
FOR UPDATE 
USING (
  auth.role() = 'authenticated'::text AND (
    public.is_user_super_admin(auth.uid()) OR
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_batch_access uba 
      WHERE uba.user_id = auth.uid() AND uba.batch_id = batches.id
    )
  )
);

CREATE POLICY "Simple batch delete policy" 
ON public.batches 
FOR DELETE 
USING (
  auth.role() = 'authenticated'::text AND (
    public.is_user_super_admin(auth.uid()) OR 
    auth.uid() = user_id
  )
);

-- Re-enable RLS
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- Update the is_super_admin function to use the new helper
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.is_user_super_admin(auth.uid());
$$;