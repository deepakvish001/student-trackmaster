-- Performance Optimization: Add Database Indexes for Ultra-Fast Queries
-- This will dramatically speed up all queries across the website

-- Indexes for students table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_user_id_enabled ON public.students(user_id) WHERE is_enabled = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_batch_id_enabled ON public.students(batch_id) WHERE is_enabled = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_created_at_desc ON public.students(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_student_name_trgm ON public.students USING gin(student_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_mobile_number_trgm ON public.students USING gin(mobile_number gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_search_composite ON public.students(student_name, mobile_number, is_enabled, batch_id);

-- Indexes for batches table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_user_id_enabled ON public.batches(user_id) WHERE is_enabled = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_created_at_desc ON public.batches(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_batch_name_trgm ON public.batches USING gin(batch_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_serial_number_trgm ON public.batches USING gin(serial_number gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_search_composite ON public.batches(batch_name, serial_number, admin_name, is_enabled);

-- Indexes for user_profiles table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_user_id_active ON public.user_profiles(user_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_role_active ON public.user_profiles(role) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_last_login ON public.user_profiles(last_login_at DESC NULLS LAST);

-- Indexes for audit_logs table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at_desc ON public.audit_logs(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id_created ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action_created ON public.audit_logs(action, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_table_name_created ON public.audit_logs(table_name, created_at DESC);

-- Indexes for system_health_logs table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_health_logs_checked_at_desc ON public.system_health_logs(checked_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_health_logs_check_type_checked ON public.system_health_logs(check_type, checked_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_health_logs_status_checked ON public.system_health_logs(status, checked_at DESC);

-- Indexes for student_fingerprints table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_fingerprints_student_id ON public.student_fingerprints(student_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_fingerprints_user_id ON public.student_fingerprints(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_fingerprints_finger_index ON public.student_fingerprints(finger_index);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_fingerprints_created_at_desc ON public.student_fingerprints(created_at DESC);

-- Indexes for user_batch_access table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_batch_access_user_id ON public.user_batch_access(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_batch_access_batch_id ON public.user_batch_access(batch_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_batch_access_granted_by ON public.user_batch_access(granted_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_batch_access_composite ON public.user_batch_access(user_id, batch_id);

-- Indexes for system_settings table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_settings_category_key ON public.system_settings(category, setting_key);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);

-- Enable trigram extension for fast text search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create materialized view for dashboard stats (ultra-fast loading)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM public.students WHERE is_enabled = true) as total_students,
  (SELECT COUNT(*) FROM public.batches WHERE is_enabled = true) as total_batches,
  (SELECT COUNT(*) FROM public.user_profiles WHERE is_active = true) as total_users,
  (SELECT SUM(max_students) FROM public.batches WHERE is_enabled = true) as total_capacity,
  (SELECT COUNT(*) FROM public.students WHERE is_enabled = true AND 
   finger_1 IS NOT NULL AND finger_2 IS NOT NULL AND finger_3 IS NOT NULL AND 
   finger_4 IS NOT NULL AND finger_5 IS NOT NULL) as complete_biometrics,
  (SELECT COUNT(*) FROM public.students WHERE is_enabled = true AND 
   (finger_1 IS NOT NULL OR finger_2 IS NOT NULL OR finger_3 IS NOT NULL OR 
    finger_4 IS NOT NULL OR finger_5 IS NOT NULL) AND NOT 
   (finger_1 IS NOT NULL AND finger_2 IS NOT NULL AND finger_3 IS NOT NULL AND 
    finger_4 IS NOT NULL AND finger_5 IS NOT NULL)) as partial_biometrics,
  now() as last_updated;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_stats_updated ON public.mv_dashboard_stats(last_updated);

-- Function to refresh dashboard stats efficiently
CREATE OR REPLACE FUNCTION public.refresh_dashboard_stats()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_stats;
$$;

-- Create optimized view for student list with batch info
CREATE OR REPLACE VIEW public.vw_students_optimized AS
SELECT 
  s.id,
  s.student_name,
  s.mobile_number,
  s.address,
  s.created_at,
  s.updated_at,
  s.batch_id,
  s.is_enabled,
  s.user_id,
  s.finger_1,
  s.finger_2,
  s.finger_3,
  s.finger_4,
  s.finger_5,
  b.batch_name,
  b.admin_name,
  -- Computed fields for faster filtering
  CASE WHEN s.finger_1 IS NOT NULL AND s.finger_2 IS NOT NULL AND 
            s.finger_3 IS NOT NULL AND s.finger_4 IS NOT NULL AND 
            s.finger_5 IS NOT NULL THEN 'complete'
       WHEN s.finger_1 IS NOT NULL OR s.finger_2 IS NOT NULL OR 
            s.finger_3 IS NOT NULL OR s.finger_4 IS NOT NULL OR 
            s.finger_5 IS NOT NULL THEN 'partial'
       ELSE 'none' END as biometric_status,
  (CASE WHEN s.finger_1 IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN s.finger_2 IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN s.finger_3 IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN s.finger_4 IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN s.finger_5 IS NOT NULL THEN 1 ELSE 0 END) as fingerprint_count
FROM public.students s
INNER JOIN public.batches b ON s.batch_id = b.id
WHERE s.is_enabled = true AND b.is_enabled = true;

-- Create optimized view for batch list with student counts
CREATE OR REPLACE VIEW public.vw_batches_optimized AS
SELECT 
  b.*,
  COALESCE(sc.student_count, 0) as student_count,
  COALESCE(sc.complete_biometrics, 0) as complete_biometrics,
  COALESCE(sc.partial_biometrics, 0) as partial_biometrics,
  ROUND((COALESCE(sc.student_count, 0)::decimal / NULLIF(b.max_students, 0)) * 100, 2) as utilization_rate
FROM public.batches b
LEFT JOIN (
  SELECT 
    batch_id,
    COUNT(*) as student_count,
    COUNT(*) FILTER (WHERE finger_1 IS NOT NULL AND finger_2 IS NOT NULL AND 
                          finger_3 IS NOT NULL AND finger_4 IS NOT NULL AND 
                          finger_5 IS NOT NULL) as complete_biometrics,
    COUNT(*) FILTER (WHERE (finger_1 IS NOT NULL OR finger_2 IS NOT NULL OR 
                           finger_3 IS NOT NULL OR finger_4 IS NOT NULL OR 
                           finger_5 IS NOT NULL) AND NOT 
                          (finger_1 IS NOT NULL AND finger_2 IS NOT NULL AND 
                           finger_3 IS NOT NULL AND finger_4 IS NOT NULL AND 
                           finger_5 IS NOT NULL)) as partial_biometrics
  FROM public.students 
  WHERE is_enabled = true
  GROUP BY batch_id
) sc ON b.id = sc.batch_id
WHERE b.is_enabled = true;