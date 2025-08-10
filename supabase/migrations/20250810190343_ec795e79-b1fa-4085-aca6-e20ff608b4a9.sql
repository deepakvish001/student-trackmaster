-- Fix infinite recursion in batches RLS policies
-- Drop problematic policies and recreate them with simpler logic

-- Drop existing policies
DROP POLICY IF EXISTS "Enhanced batches view policy" ON public.batches;
DROP POLICY IF EXISTS "Users can update accessible batches only" ON public.batches;
DROP POLICY IF EXISTS "Users can delete batches they own" ON public.batches;
DROP POLICY IF EXISTS "Authenticated users can create batches" ON public.batches;

-- Create simpler, non-recursive policies
CREATE POLICY "Users can view their own batches" 
ON public.batches 
FOR SELECT 
USING (
  auth.role() = 'authenticated'::text AND (
    is_super_admin() OR 
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_batch_access 
      WHERE user_id = auth.uid() AND batch_id = batches.id
    )
  )
);

CREATE POLICY "Users can create their own batches" 
ON public.batches 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated'::text AND 
  auth.uid() = user_id AND (
    is_super_admin() OR (
      SELECT COUNT(*) FROM public.batches 
      WHERE user_id = auth.uid() AND is_enabled = true
    ) < COALESCE((
      SELECT max_batches_allowed FROM public.user_profiles 
      WHERE user_id = auth.uid()
    ), 1)
  )
);

CREATE POLICY "Users can update their own batches" 
ON public.batches 
FOR UPDATE 
USING (
  auth.role() = 'authenticated'::text AND (
    is_super_admin() OR 
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_batch_access 
      WHERE user_id = auth.uid() AND batch_id = batches.id
    )
  )
);

CREATE POLICY "Users can delete their own batches" 
ON public.batches 
FOR DELETE 
USING (
  auth.role() = 'authenticated'::text AND (
    is_super_admin() OR 
    auth.uid() = user_id
  )
);

-- Update the get_user_accessible_batches function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_accessible_batches(target_user_id uuid DEFAULT auth.uid())
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT COALESCE(
    ARRAY(
      SELECT batch_id 
      FROM public.user_batch_access 
      WHERE user_id = target_user_id
    ), 
    ARRAY[]::uuid[]
  );
$function$;