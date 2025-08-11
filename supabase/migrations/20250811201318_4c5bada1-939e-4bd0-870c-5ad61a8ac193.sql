-- Complete security vulnerability fixes - corrected syntax

-- 1. Clean up conflicting policies
DROP POLICY IF EXISTS "system_settings_super_strict" ON public.system_settings;
DROP POLICY IF EXISTS "audit_logs_select_restricted" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
DROP POLICY IF EXISTS "batch_access_super_strict" ON public.user_batch_access;

-- 2. Create ultra-secure replacement policies
CREATE POLICY "system_settings_final_security" ON public.system_settings
FOR ALL USING (
  public.is_super_admin() AND 
  public.validate_secure_session()
);

CREATE POLICY "audit_logs_secure_select" ON public.audit_logs
FOR SELECT USING (
  public.is_super_admin() OR 
  (auth.uid() = user_id AND created_at > now() - interval '24 hours')
);

CREATE POLICY "audit_logs_secure_insert" ON public.audit_logs
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  (user_id = auth.uid() OR user_id IS NULL OR public.is_super_admin())
);

CREATE POLICY "batch_access_final_security" ON public.user_batch_access
FOR ALL USING (
  public.is_super_admin() OR 
  (auth.uid() = user_id AND public.validate_secure_session())
);

-- 3. Add security constraints (corrected syntax)
DO $$ 
BEGIN
  -- Add audit risk score constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_audit_risk_score' 
    AND table_name = 'audit_logs'
  ) THEN
    ALTER TABLE public.audit_logs 
    ADD CONSTRAINT chk_audit_risk_score 
    CHECK (risk_score >= 0 AND risk_score <= 10);
  END IF;

  -- Add failed attempts constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_failed_attempts' 
    AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD CONSTRAINT chk_failed_attempts 
    CHECK (failed_login_attempts >= 0 AND failed_login_attempts <= 10);
  END IF;
END $$;

-- 4. Create final security validation function
CREATE OR REPLACE FUNCTION public.security_check_passed()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT 
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid()
        AND is_active = true
        AND (locked_until IS NULL OR locked_until < now())
        AND failed_login_attempts < 5
    );
$$;