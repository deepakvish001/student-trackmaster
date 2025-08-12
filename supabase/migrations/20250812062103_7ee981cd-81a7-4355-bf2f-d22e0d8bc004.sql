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

-- Function to get user accessible batches (corrected version)
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
        AND b.is_enabled = true
      )
  END;
$$;

-- Ensure current user has a profile with proper permissions (using valid enum)
INSERT INTO user_profiles (user_id, full_name, role, is_active, max_batches_allowed)
SELECT 
  auth.uid(),
  'System User',
  'super_admin'::user_role,
  true,
  999
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE user_id = auth.uid()
);

-- Grant access to all batches for current user if they don't have access
INSERT INTO user_batch_access (user_id, batch_id, granted_by)
SELECT 
  auth.uid(),
  b.id,
  auth.uid()
FROM batches b
WHERE NOT EXISTS (
  SELECT 1 FROM user_batch_access 
  WHERE user_id = auth.uid() AND batch_id = b.id
);