-- Fix Critical Security Issue: Replace overly permissive batch access policy
-- with proper ownership-based access controls

-- Drop the dangerous "Emergency batch access" policy
DROP POLICY IF EXISTS "Emergency batch access" ON public.batches;

-- Create secure, ownership-based policies for the batches table

-- 1. SELECT Policy: Users can view their own batches, batches they have access to, or super admins can view all
CREATE POLICY "Users can view accessible batches only"
ON public.batches
FOR SELECT
USING (
  auth.role() = 'authenticated'::text AND (
    is_super_admin() OR 
    auth.uid() = user_id OR 
    id = ANY(get_user_accessible_batches())
  )
);

-- 2. INSERT Policy: Users can create batches for themselves
CREATE POLICY "Users can create their own batches"
ON public.batches
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'::text AND 
  auth.uid() = user_id
);

-- 3. UPDATE Policy: Users can update their own batches or batches they have access to
CREATE POLICY "Users can update accessible batches only"
ON public.batches
FOR UPDATE
USING (
  auth.role() = 'authenticated'::text AND (
    is_super_admin() OR 
    auth.uid() = user_id OR 
    id = ANY(get_user_accessible_batches())
  )
);

-- 4. DELETE Policy: Users can delete their own batches, super admins can delete any
CREATE POLICY "Users can delete their own batches only"
ON public.batches
FOR DELETE
USING (
  auth.role() = 'authenticated'::text AND (
    is_super_admin() OR 
    auth.uid() = user_id
  )
);

-- Add audit logging for batch policy changes
INSERT INTO public.audit_logs (
  user_id, 
  action, 
  table_name, 
  new_values
) VALUES (
  auth.uid(),
  'SECURITY_FIX: Replaced dangerous batch access policy with secure ownership-based policies',
  'batches',
  jsonb_build_object(
    'security_level', 'CRITICAL_FIX',
    'old_policy', 'Emergency batch access (overly permissive)',
    'new_policies', jsonb_build_array(
      'Users can view accessible batches only',
      'Users can create their own batches', 
      'Users can update accessible batches only',
      'Users can delete their own batches only'
    ),
    'timestamp', now()
  )
);