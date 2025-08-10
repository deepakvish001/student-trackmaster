-- Create indexes to improve performance for the students table
-- Index for filtering by is_enabled (most common filter)
CREATE INDEX IF NOT EXISTS idx_students_is_enabled ON students (is_enabled);

-- Index for searching by student name (case insensitive)
CREATE INDEX IF NOT EXISTS idx_students_name_lower ON students (LOWER(student_name));

-- Index for filtering by batch_id
CREATE INDEX IF NOT EXISTS idx_students_batch_id ON students (batch_id);

-- Composite index for common query patterns (enabled + batch + created_at)
CREATE INDEX IF NOT EXISTS idx_students_composite ON students (is_enabled, batch_id, created_at DESC);

-- Index for mobile number search
CREATE INDEX IF NOT EXISTS idx_students_mobile ON students (mobile_number);

-- Index for searching across name and mobile
CREATE INDEX IF NOT EXISTS idx_students_text_search ON students 
  USING gin ((LOWER(student_name) || ' ' || COALESCE(mobile_number, '')));

-- Create indexes for batches table
CREATE INDEX IF NOT EXISTS idx_batches_is_enabled ON batches (is_enabled);
CREATE INDEX IF NOT EXISTS idx_batches_name ON batches (batch_name);

-- Create indexes for user_profiles table to speed up authentication queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles (role);

COMMENT ON INDEX idx_students_composite IS 'Composite index for efficient student queries with filters and sorting';
COMMENT ON INDEX idx_students_text_search IS 'GIN index for full-text search across student name and mobile';