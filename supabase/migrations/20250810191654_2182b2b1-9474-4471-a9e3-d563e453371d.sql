-- Fix audit logs RLS policy to allow super admins to view all logs
DROP POLICY IF EXISTS "super_admin_audit_logs_select" ON public.audit_logs;

CREATE POLICY "super_admin_audit_logs_select" 
ON public.audit_logs FOR SELECT 
TO authenticated 
USING (
  -- Allow super admins to see all audit logs
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'::public.user_role 
    AND is_active = true
  )
  OR
  -- Allow users to see their own audit logs
  user_id = auth.uid()
);

-- Also ensure audit logs can be inserted for logging
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_insert" 
ON public.audit_logs FOR INSERT 
TO authenticated 
WITH CHECK (true); -- Allow all authenticated users to insert audit logs