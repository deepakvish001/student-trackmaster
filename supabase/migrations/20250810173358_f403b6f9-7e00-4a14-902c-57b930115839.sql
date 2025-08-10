-- Performance Optimization: Add Database Indexes for Ultra-Fast Queries (Part 2)

-- Indexes for audit_logs table
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON public.audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name_created ON public.audit_logs(table_name, created_at DESC);

-- Indexes for system_health_logs table
CREATE INDEX IF NOT EXISTS idx_system_health_logs_checked_at_desc ON public.system_health_logs(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_logs_check_type_checked ON public.system_health_logs(check_type, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_logs_status_checked ON public.system_health_logs(status, checked_at DESC);

-- Indexes for student_fingerprints table
CREATE INDEX IF NOT EXISTS idx_student_fingerprints_student_id ON public.student_fingerprints(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fingerprints_user_id ON public.student_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_student_fingerprints_finger_index ON public.student_fingerprints(finger_index);
CREATE INDEX IF NOT EXISTS idx_student_fingerprints_created_at_desc ON public.student_fingerprints(created_at DESC);

-- Indexes for user_batch_access table
CREATE INDEX IF NOT EXISTS idx_user_batch_access_user_id ON public.user_batch_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_batch_access_batch_id ON public.user_batch_access(batch_id);
CREATE INDEX IF NOT EXISTS idx_user_batch_access_granted_by ON public.user_batch_access(granted_by);
CREATE INDEX IF NOT EXISTS idx_user_batch_access_composite ON public.user_batch_access(user_id, batch_id);

-- Indexes for system_settings table
CREATE INDEX IF NOT EXISTS idx_system_settings_category_key ON public.system_settings(category, setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);