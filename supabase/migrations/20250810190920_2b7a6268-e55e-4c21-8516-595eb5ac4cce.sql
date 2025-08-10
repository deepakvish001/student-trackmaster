-- Final fix for infinite recursion in batches RLS policies
-- Create the simplest possible policies without any function calls that could cause recursion

-- Disable RLS temporarily
ALTER TABLE public.batches DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Simple batch select policy" ON public.batches;
DROP POLICY IF EXISTS "Simple batch insert policy" ON public.batches;
DROP POLICY IF EXISTS "Simple batch update policy" ON public.batches;
DROP POLICY IF EXISTS "Simple batch delete policy" ON public.batches;

-- Create extremely simple policies that don't reference any functions
CREATE POLICY "Basic batch select" 
ON public.batches 
FOR SELECT 
USING (
  auth.role() = 'authenticated'::text AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_batch_access uba 
      WHERE uba.user_id = auth.uid() AND uba.batch_id = batches.id
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role = 'super_admin'::public.user_role
      AND up.is_active = true
    )
  )
);

CREATE POLICY "Basic batch insert" 
ON public.batches 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated'::text AND 
  auth.uid() = user_id AND (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role = 'super_admin'::public.user_role
      AND up.is_active = true
    ) OR
    (
      SELECT COUNT(*) FROM public.batches b
      WHERE b.user_id = auth.uid() AND b.is_enabled = true
    ) < COALESCE((
      SELECT up.max_batches_allowed FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
    ), 1)
  )
);

CREATE POLICY "Basic batch update" 
ON public.batches 
FOR UPDATE 
USING (
  auth.role() = 'authenticated'::text AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_batch_access uba 
      WHERE uba.user_id = auth.uid() AND uba.batch_id = batches.id
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role = 'super_admin'::public.user_role
      AND up.is_active = true
    )
  )
);

CREATE POLICY "Basic batch delete" 
ON public.batches 
FOR DELETE 
USING (
  auth.role() = 'authenticated'::text AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role = 'super_admin'::public.user_role
      AND up.is_active = true
    )
  )
);

-- Re-enable RLS
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;