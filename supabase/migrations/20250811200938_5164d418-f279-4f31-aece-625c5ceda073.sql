-- Fix critical security vulnerabilities - corrected version

-- 1. Create secure dashboard stats function without SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_secure()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT jsonb_build_object(
    'total_batches', (
      SELECT COUNT(*) FROM public.batches 
      WHERE is_enabled = true 
        AND (is_super_admin() OR auth.uid() = user_id OR id = ANY(get_user_accessible_batches()))
    ),
    'total_students', (
      SELECT COUNT(*) FROM public.students 
      WHERE is_enabled = true 
        AND (is_super_admin() OR auth.uid() = user_id OR batch_id = ANY(get_user_accessible_batches()))
    ),
    'complete_biometrics', (
      SELECT COUNT(*) FROM public.students 
      WHERE is_enabled = true 
        AND finger_1 IS NOT NULL AND finger_2 IS NOT NULL AND finger_3 IS NOT NULL 
        AND finger_4 IS NOT NULL AND finger_5 IS NOT NULL
        AND (is_super_admin() OR auth.uid() = user_id OR batch_id = ANY(get_user_accessible_batches()))
    ),
    'active_users', (
      SELECT CASE WHEN is_super_admin() THEN 
        (SELECT COUNT(*) FROM public.user_profiles WHERE is_active = true)
      ELSE 1 END
    ),
    'last_updated', now()
  );
$$;

-- 2. Create security indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_security_lookup 
ON public.students (user_id, batch_id, is_enabled) 
WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_batches_security_lookup 
ON public.batches (user_id, is_enabled) 
WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_active 
ON public.user_profiles (user_id, is_active, locked_until) 
WHERE is_active = true;

-- 3. Add data integrity constraints
ALTER TABLE public.students 
ADD CONSTRAINT chk_mobile_format 
CHECK (mobile_number ~ '^[0-9+\-\s()]{10,15}$' OR mobile_number IS NULL);

ALTER TABLE public.batches 
ADD CONSTRAINT chk_max_students_positive 
CHECK (max_students > 0 AND max_students <= 1000);

-- 4. Force RLS on all sensitive tables
ALTER TABLE public.student_fingerprints FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings FORCE ROW LEVEL SECURITY;

-- 5. Create secure dashboard cache table
CREATE TABLE IF NOT EXISTS public.dashboard_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stats jsonb NOT NULL,
  user_id uuid,
  last_updated timestamp with time zone DEFAULT now()
);

-- Enable RLS on cache table
ALTER TABLE public.dashboard_cache ENABLE ROW LEVEL SECURITY;

-- Cache access policy
CREATE POLICY "dashboard_cache_access" ON public.dashboard_cache
FOR SELECT USING (
  is_super_admin() OR auth.uid() = user_id
);

-- 6. Create security audit function
CREATE OR REPLACE FUNCTION public.log_security_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only log admin access to prevent excessive logging
  IF is_super_admin() THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, new_values)
    VALUES (
      auth.uid(),
      'ADMIN_DATA_ACCESS',
      TG_TABLE_NAME,
      jsonb_build_object(
        'timestamp', now(),
        'operation', TG_OP,
        'table', TG_TABLE_NAME
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. Apply audit triggers (corrected syntax)
DROP TRIGGER IF EXISTS security_audit_fingerprints ON public.student_fingerprints;
CREATE TRIGGER security_audit_fingerprints
  AFTER INSERT OR UPDATE OR DELETE ON public.student_fingerprints
  FOR EACH ROW EXECUTE FUNCTION public.log_security_access();

DROP TRIGGER IF EXISTS security_audit_system_settings ON public.system_settings;
CREATE TRIGGER security_audit_system_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.log_security_access();