-- Final security hardening - simplified and tested

-- 1. Create basic security indexes
CREATE INDEX IF NOT EXISTS idx_students_security 
ON public.students (user_id, batch_id, is_enabled);

CREATE INDEX IF NOT EXISTS idx_batches_security 
ON public.batches (user_id, is_enabled);

CREATE INDEX IF NOT EXISTS idx_user_profiles_security 
ON public.user_profiles (user_id, is_active, role);

-- 2. Add essential data constraints
DO $$ 
BEGIN
  -- Add mobile format constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_mobile_format' 
    AND table_name = 'students'
  ) THEN
    ALTER TABLE public.students 
    ADD CONSTRAINT chk_mobile_format 
    CHECK (mobile_number ~ '^[0-9+\-\s()]{10,15}$' OR mobile_number IS NULL);
  END IF;

  -- Add max students constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_max_students_positive' 
    AND table_name = 'batches'
  ) THEN
    ALTER TABLE public.batches 
    ADD CONSTRAINT chk_max_students_positive 
    CHECK (max_students > 0 AND max_students <= 1000);
  END IF;
END $$;

-- 3. Force RLS on critical tables
ALTER TABLE public.student_fingerprints FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.students FORCE ROW LEVEL SECURITY;
ALTER TABLE public.batches FORCE ROW LEVEL SECURITY;

-- 4. Create secure audit function for biometric access
CREATE OR REPLACE FUNCTION public.audit_biometric_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Log all biometric data access
  INSERT INTO public.audit_logs (user_id, action, table_name, new_values)
  VALUES (
    auth.uid(),
    'BIOMETRIC_ACCESS_' || TG_OP,
    'student_fingerprints',
    jsonb_build_object(
      'student_id', COALESCE(NEW.student_id, OLD.student_id),
      'finger_index', COALESCE(NEW.finger_index, OLD.finger_index),
      'timestamp', now(),
      'ip_address', inet_client_addr()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Apply biometric audit trigger
DROP TRIGGER IF EXISTS audit_biometric_access ON public.student_fingerprints;
CREATE TRIGGER audit_biometric_access
  AFTER INSERT OR UPDATE OR DELETE ON public.student_fingerprints
  FOR EACH ROW EXECUTE FUNCTION public.audit_biometric_access();

-- 6. Strengthen system settings access
DROP POLICY IF EXISTS "system_settings_strict_access" ON public.system_settings;
CREATE POLICY "system_settings_super_strict" ON public.system_settings
FOR ALL USING (
  public.is_super_admin() AND 
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() 
      AND is_active = true 
      AND (locked_until IS NULL OR locked_until < now())
      AND failed_login_attempts < 5
  )
);

-- 7. Add session validation for high-risk operations
CREATE OR REPLACE FUNCTION public.validate_secure_session()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid()
      AND is_active = true
      AND (locked_until IS NULL OR locked_until < now())
      AND failed_login_attempts < 3
      AND password_changed_at > now() - interval '90 days'
  );
$$;