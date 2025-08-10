-- Create comprehensive indexes for ultra-fast queries
-- Students table indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_students_batch_id_enabled ON students(batch_id, is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_students_user_id_enabled ON students(user_id, is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_students_name_search ON students USING gin(to_tsvector('english', student_name));
CREATE INDEX IF NOT EXISTS idx_students_mobile_search ON students(mobile_number) WHERE mobile_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_created_at_desc ON students(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_fingerprints ON students(finger_1, finger_2, finger_3, finger_4, finger_5);

-- Batches table indexes for instant loading
CREATE INDEX IF NOT EXISTS idx_batches_enabled_name ON batches(is_enabled, batch_name) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_batches_user_id_enabled ON batches(user_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_batches_created_at_desc ON batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batches_serial_search ON batches(serial_number);
CREATE INDEX IF NOT EXISTS idx_batches_admin_search ON batches(admin_name);

-- User profiles indexes for admin operations
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_active ON user_profiles(role, is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id_active ON user_profiles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at_desc ON user_profiles(created_at DESC);

-- Batch access indexes for permission checks
CREATE INDEX IF NOT EXISTS idx_user_batch_access_user_batch ON user_batch_access(user_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_user_batch_access_batch_id ON user_batch_access(batch_id);

-- System settings indexes for admin dashboard
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Audit logs indexes for admin monitoring
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_action ON audit_logs(table_name, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON audit_logs(created_at DESC);

-- System health logs indexes
CREATE INDEX IF NOT EXISTS idx_system_health_logs_check_type_status ON system_health_logs(check_type, status);
CREATE INDEX IF NOT EXISTS idx_system_health_logs_checked_at_desc ON system_health_logs(checked_at DESC);

-- Student fingerprints indexes for biometric operations
CREATE INDEX IF NOT EXISTS idx_student_fingerprints_student_id ON student_fingerprints(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fingerprints_user_id ON student_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_student_fingerprints_quality ON student_fingerprints(quality_score) WHERE quality_score IS NOT NULL;