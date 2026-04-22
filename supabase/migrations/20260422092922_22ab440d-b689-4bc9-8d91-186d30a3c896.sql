
-- 1. Fix broken batches SELECT policy (was comparing user_batch_access.batch_id = user_batch_access.id)
DROP POLICY IF EXISTS "Users can view accessible batches" ON public.batches;
CREATE POLICY "Users can view accessible batches"
ON public.batches
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_batch_access uba
    WHERE uba.user_id = auth.uid() AND uba.batch_id = batches.id
  )
);

-- 2. Prevent privilege escalation: users cannot change their own role/is_active/max_batches_allowed
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role = (SELECT role FROM public.user_profiles WHERE user_id = auth.uid())
  AND is_active = (SELECT is_active FROM public.user_profiles WHERE user_id = auth.uid())
  AND max_batches_allowed IS NOT DISTINCT FROM (SELECT max_batches_allowed FROM public.user_profiles WHERE user_id = auth.uid())
);

-- 3. Restrict audit_logs INSERT: require user_id = auth.uid() (no NULL bypass)
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Restrict system_settings SELECT to super admins only
DROP POLICY IF EXISTS "Authenticated users can view system settings" ON public.system_settings;
CREATE POLICY "Super admins can view system settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));
