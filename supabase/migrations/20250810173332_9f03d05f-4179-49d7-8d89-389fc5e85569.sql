-- Performance Optimization: Add Database Indexes for Ultra-Fast Queries (Part 1)

-- Enable trigram extension for fast text search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Indexes for students table
CREATE INDEX IF NOT EXISTS idx_students_user_id_enabled ON public.students(user_id) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_students_batch_id_enabled ON public.students(batch_id) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_students_created_at_desc ON public.students(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_search_composite ON public.students(student_name, mobile_number, is_enabled, batch_id);

-- Indexes for batches table
CREATE INDEX IF NOT EXISTS idx_batches_user_id_enabled ON public.batches(user_id) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_batches_created_at_desc ON public.batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batches_search_composite ON public.batches(batch_name, serial_number, admin_name, is_enabled);

-- Indexes for user_profiles table
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id_active ON public.user_profiles(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_active ON public.user_profiles(role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON public.user_profiles(last_login_at DESC NULLS LAST);