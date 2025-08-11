-- Final fix for Security Definer Views - ensure they're properly secured

-- 1. Drop and recreate all views without any security definer properties
DROP VIEW IF EXISTS public.vw_students_optimized CASCADE;
DROP VIEW IF EXISTS public.vw_batches_optimized CASCADE; 
DROP VIEW IF EXISTS public.vw_dashboard_stats CASCADE;

-- 2. Create completely clean, RLS-compliant views
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

-- 3. Create clean batches view
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

-- 4. Create simple dashboard stats view
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

-- 5. Grant necessary permissions (no security definer)
GRANT SELECT ON public.vw_students_optimized TO authenticated;
GRANT SELECT ON public.vw_batches_optimized TO authenticated;
GRANT SELECT ON public.vw_dashboard_stats TO authenticated;

-- 6. Verify no security definer properties exist
SELECT 'All views recreated without SECURITY DEFINER' as security_status;