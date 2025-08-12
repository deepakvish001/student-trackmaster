-- Create missing security functions that RLS policies depend on

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
    AND is_active = true
    AND (locked_until IS NULL OR locked_until < now())
  );
$$;

-- Function to get user accessible batches
CREATE OR REPLACE FUNCTION get_user_accessible_batches()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE 
    WHEN is_super_admin() THEN 
      ARRAY(SELECT id FROM batches WHERE is_enabled = true)
    ELSE
      ARRAY(
        SELECT DISTINCT batch_id 
        FROM user_batch_access uba
        JOIN batches b ON b.id = uba.batch_id
        WHERE uba.user_id = auth.uid() 
        AND uba.has_access = true
        AND b.is_enabled = true
      )
  END;
$$;

-- Create a simplified students policy structure that's more permissive for authenticated users
-- First, drop existing policies
DROP POLICY IF EXISTS "Enhanced students view policy" ON students;
DROP POLICY IF EXISTS "Users can create students in accessible batches" ON students;
DROP POLICY IF EXISTS "Users can update accessible students only" ON students;
DROP POLICY IF EXISTS "Users can delete accessible students only" ON students;

-- Create new, more permissive policies for authenticated users
CREATE POLICY "Authenticated users can view students"
ON students FOR SELECT
TO authenticated
USING (
  -- Super admins can see all
  is_super_admin() OR
  -- Users can see students in their accessible batches
  batch_id = ANY(get_user_accessible_batches()) OR
  -- Users can see their own created students
  user_id = auth.uid()
);

CREATE POLICY "Authenticated users can insert students"
ON students FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    is_super_admin() OR
    batch_id = ANY(get_user_accessible_batches())
  )
);

CREATE POLICY "Authenticated users can update students"
ON students FOR UPDATE
TO authenticated
USING (
  is_super_admin() OR
  user_id = auth.uid() OR
  batch_id = ANY(get_user_accessible_batches())
);

CREATE POLICY "Authenticated users can delete students"
ON students FOR DELETE
TO authenticated
USING (
  is_super_admin() OR
  user_id = auth.uid() OR
  batch_id = ANY(get_user_accessible_batches())
);

-- Ensure current user has a profile with proper permissions
INSERT INTO user_profiles (user_id, full_name, role, is_active, max_batches_allowed)
SELECT 
  auth.uid(),
  'System User',
  'admin',
  true,
  999
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE user_id = auth.uid()
);

-- Grant access to all batches for current user if they don't have access
INSERT INTO user_batch_access (user_id, batch_id, has_access, granted_by)
SELECT 
  auth.uid(),
  b.id,
  true,
  auth.uid()
FROM batches b
WHERE NOT EXISTS (
  SELECT 1 FROM user_batch_access 
  WHERE user_id = auth.uid() AND batch_id = b.id
);