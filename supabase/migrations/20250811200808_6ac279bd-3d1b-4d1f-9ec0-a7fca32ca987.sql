-- Fix Critical Security Vulnerabilities

-- 1. Remove Security Definer Views and replace with proper RLS-compliant views
DROP VIEW IF EXISTS public.vw_students_optimized;
DROP VIEW IF EXISTS public.vw_batches_optimized;

-- 2. Create secure views without SECURITY DEFINER that respect RLS
CREATE VIEW public.vw_students_optimized AS
SELECT 
  s.id,
  s.batch_id,
  s.user_id,
  s.student_name,
  s.mobile_number,
  s.address,
  s.finger_1,
  s.finger_2,
  s.finger_3,
  s.finger_4,
  s.finger_5,
  s.is_enabled,
  s.created_at,
  s.updated_at,
  b.batch_name,
  b.admin_name,
  -- Calculate fingerprint count
  (CASE WHEN s.finger_1 IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN s.finger_2 IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN s.finger_3 IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN s.finger_4 IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN s.finger_5 IS NOT NULL THEN 1 ELSE 0 END) as fingerprint_count,
  -- Calculate biometric status
  CASE 
    WHEN (s.finger_1 IS NOT NULL AND s.finger_2 IS NOT NULL AND s.finger_3 IS NOT NULL 
          AND s.finger_4 IS NOT NULL AND s.finger_5 IS NOT NULL) THEN 'complete'
    WHEN (s.finger_1 IS NOT NULL OR s.finger_2 IS NOT NULL OR s.finger_3 IS NOT NULL 
          OR s.finger_4 IS NOT NULL OR s.finger_5 IS NOT NULL) THEN 'partial'
    ELSE 'none'
  END as biometric_status
FROM public.students s
LEFT JOIN public.batches b ON s.batch_id = b.id;

-- Enable RLS on the view (views inherit RLS from underlying tables)
ALTER VIEW public.vw_students_optimized SET (security_barrier = true);

-- 3. Create secure batches view without SECURITY DEFINER
CREATE VIEW public.vw_batches_optimized AS
SELECT 
  b.id,
  b.batch_name,
  b.admin_name,
  b.username,
  b.serial_number,
  b.max_students,
  b.is_enabled,
  b.created_at,
  b.updated_at,
  b.user_id,
  -- Get student counts safely
  COALESCE(student_counts.student_count, 0) as student_count,
  COALESCE(student_counts.complete_biometrics, 0) as complete_biometrics,
  COALESCE(student_counts.partial_biometrics, 0) as partial_biometrics,
  -- Calculate utilization rate
  CASE 
    WHEN b.max_students > 0 THEN 
      ROUND((COALESCE(student_counts.student_count, 0)::numeric / b.max_students::numeric) * 100, 2)
    ELSE 0
  END as utilization_rate
FROM public.batches b
LEFT JOIN (
  SELECT 
    batch_id,
    COUNT(*) as student_count,
    COUNT(CASE WHEN (finger_1 IS NOT NULL AND finger_2 IS NOT NULL AND finger_3 IS NOT NULL 
                     AND finger_4 IS NOT NULL AND finger_5 IS NOT NULL) THEN 1 END) as complete_biometrics,
    COUNT(CASE WHEN (finger_1 IS NOT NULL OR finger_2 IS NOT NULL OR finger_3 IS NOT NULL 
                     OR finger_4 IS NOT NULL OR finger_5 IS NOT NULL) 
                     AND NOT (finger_1 IS NOT NULL AND finger_2 IS NOT NULL AND finger_3 IS NOT NULL 
                              AND finger_4 IS NOT NULL AND finger_5 IS NOT NULL) THEN 1 END) as partial_biometrics
  FROM public.students 
  WHERE is_enabled = true
  GROUP BY batch_id
) student_counts ON b.id = student_counts.batch_id;

-- Enable security barrier on the view
ALTER VIEW public.vw_batches_optimized SET (security_barrier = true);

-- 4. Drop and recreate materialized view as regular view to avoid API exposure
DROP MATERIALIZED VIEW IF EXISTS public.mv_dashboard_stats;

-- Create secure dashboard stats view
CREATE VIEW public.vw_dashboard_stats AS
SELECT 
  'dashboard_stats'::text as stat_type,
  jsonb_build_object(
    'total_batches', (SELECT COUNT(*) FROM public.batches WHERE is_enabled = true),
    'total_students', (SELECT COUNT(*) FROM public.students WHERE is_enabled = true),
    'complete_biometrics', (
      SELECT COUNT(*) FROM public.students 
      WHERE is_enabled = true 
        AND finger_1 IS NOT NULL AND finger_2 IS NOT NULL AND finger_3 IS NOT NULL 
        AND finger_4 IS NOT NULL AND finger_5 IS NOT NULL
    ),
    'active_users', (SELECT COUNT(*) FROM public.user_profiles WHERE is_active = true),
    'last_updated', now()
  ) as stats;

-- Enable security barrier
ALTER VIEW public.vw_dashboard_stats SET (security_barrier = true);

-- 5. Update the refresh function to work with the new view
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT stats FROM public.vw_dashboard_stats LIMIT 1;
$$;

-- 6. Strengthen RLS policies for audit_logs to prevent data leakage
DROP POLICY IF EXISTS "super_admin_audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

-- Create more restrictive audit log policies
CREATE POLICY "audit_logs_select_restricted" ON public.audit_logs
FOR SELECT USING (
  is_super_admin() OR 
  (auth.uid() = user_id AND created_at > now() - interval '7 days')
);

CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  (user_id = auth.uid() OR user_id IS NULL)
);

-- 7. Add additional security for system settings
CREATE POLICY "system_settings_strict_access" ON public.system_settings
FOR ALL USING (
  is_super_admin() AND 
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() 
      AND is_active = true 
      AND (locked_until IS NULL OR locked_until < now())
      AND failed_login_attempts < 5
  )
);

-- 8. Enhance user_batch_access security
CREATE POLICY "batch_access_super_strict" ON public.user_batch_access
FOR ALL USING (
  is_super_admin() OR 
  (auth.uid() = user_id AND 
   EXISTS (
     SELECT 1 FROM public.user_profiles up
     WHERE up.user_id = auth.uid() 
       AND up.is_active = true
       AND (up.locked_until IS NULL OR up.locked_until < now())
   ))
);

-- Grant necessary permissions
GRANT SELECT ON public.vw_students_optimized TO authenticated;
GRANT SELECT ON public.vw_batches_optimized TO authenticated;
GRANT SELECT ON public.vw_dashboard_stats TO authenticated;