-- Performance Optimization: Create Optimized Views and Functions (Part 3)

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