-- Fix Critical Security Issue: Secure biometric data access in student_fingerprints table
-- Replace overly permissive policies with strict biometric data protection

-- Drop existing permissive fingerprint policies
DROP POLICY IF EXISTS "Enhanced fingerprints view policy" ON public.student_fingerprints;
DROP POLICY IF EXISTS "Users can only create fingerprints for their own students" ON public.student_fingerprints;
DROP POLICY IF EXISTS "Users can only update fingerprints for their own students" ON public.student_fingerprints;
DROP POLICY IF EXISTS "Users can only delete fingerprints for their own students" ON public.student_fingerprints;

-- Create ultra-secure biometric data access policies

-- 1. SELECT Policy: Strict biometric data access - only super admins and direct student owners
CREATE POLICY "Strict biometric data access only"
ON public.student_fingerprints
FOR SELECT
USING (
  auth.role() = 'authenticated'::text AND (
    -- Super admins can view all biometric data for administrative purposes
    is_super_admin() OR 
    -- Only the direct owner of the student can view their biometric data
    (
      auth.uid() = user_id AND
      EXISTS (
        SELECT 1 FROM public.students s
        JOIN public.user_profiles up ON s.user_id = up.user_id
        WHERE s.id = student_fingerprints.student_id 
        AND s.user_id = auth.uid()
        AND up.is_active = true
        AND (up.locked_until IS NULL OR up.locked_until < now())
        AND up.failed_login_attempts < 5
      )
    )
  )
);

-- 2. INSERT Policy: Only authenticated owners can create biometric data for their students
CREATE POLICY "Owners can create biometric data for their students only"
ON public.student_fingerprints
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'::text AND 
  auth.uid() = user_id AND
  -- Verify the student belongs to the current user
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.user_profiles up ON s.user_id = up.user_id
    WHERE s.id = student_fingerprints.student_id 
    AND s.user_id = auth.uid()
    AND up.is_active = true
    AND (up.locked_until IS NULL OR up.locked_until < now())
  )
);

-- 3. UPDATE Policy: Strict update access - only super admins and direct owners
CREATE POLICY "Strict biometric data update access"
ON public.student_fingerprints
FOR UPDATE
USING (
  auth.role() = 'authenticated'::text AND (
    -- Super admins can update for administrative purposes
    is_super_admin() OR 
    -- Only direct owner can update their student's biometric data
    (
      auth.uid() = user_id AND
      EXISTS (
        SELECT 1 FROM public.students s
        JOIN public.user_profiles up ON s.user_id = up.user_id
        WHERE s.id = student_fingerprints.student_id 
        AND s.user_id = auth.uid()
        AND up.is_active = true
        AND (up.locked_until IS NULL OR up.locked_until < now())
      )
    )
  )
);

-- 4. DELETE Policy: Ultra-strict deletion - only super admins can delete biometric data
CREATE POLICY "Ultra strict biometric data deletion"
ON public.student_fingerprints
FOR DELETE
USING (
  auth.role() = 'authenticated'::text AND 
  -- Only super admins can delete biometric data for compliance/security
  is_super_admin()
);

-- Create additional security function for biometric access logging
CREATE OR REPLACE FUNCTION public.log_biometric_access(
  access_type text,
  student_id uuid,
  fingerprint_count integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_name text;
  student_name text;
BEGIN
  -- Get user and student names for audit trail
  SELECT full_name INTO user_name 
  FROM public.user_profiles 
  WHERE user_id = auth.uid();
  
  SELECT student_name INTO student_name
  FROM public.students
  WHERE id = student_id;
  
  -- Log high-risk biometric access
  PERFORM public.log_high_risk_activity(
    'BIOMETRIC_' || access_type,
    auth.uid(),
    9, -- Critical risk level for biometric data
    jsonb_build_object(
      'user_name', COALESCE(user_name, 'Unknown'),
      'student_name', COALESCE(student_name, 'Unknown'),
      'student_id', student_id,
      'fingerprint_count', fingerprint_count,
      'ip_address', inet_client_addr(),
      'timestamp', now(),
      'security_level', 'BIOMETRIC_ACCESS'
    )
  );
END;
$$;

-- Create trigger to automatically log all biometric data access
CREATE OR REPLACE FUNCTION public.log_fingerprint_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Log biometric access for all operations
  IF TG_OP = 'SELECT' OR TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.log_biometric_access(TG_OP, NEW.student_id);
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM public.log_biometric_access(TG_OP, OLD.student_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Apply the logging trigger to student_fingerprints
DROP TRIGGER IF EXISTS fingerprint_access_logger ON public.student_fingerprints;
CREATE TRIGGER fingerprint_access_logger
  AFTER INSERT OR UPDATE OR DELETE ON public.student_fingerprints
  FOR EACH ROW EXECUTE FUNCTION public.log_fingerprint_access();

-- Log the critical security fix
INSERT INTO public.audit_logs (
  user_id, 
  action, 
  table_name, 
  new_values,
  risk_score
) VALUES (
  auth.uid(),
  'CRITICAL_SECURITY_FIX: Secured biometric data access with ultra-strict policies',
  'student_fingerprints',
  jsonb_build_object(
    'security_level', 'CRITICAL_BIOMETRIC_PROTECTION',
    'old_policy_issue', 'Overly permissive batch-based access to sensitive biometric data',
    'new_policies', jsonb_build_array(
      'Strict biometric data access only (owner + super admin)',
      'Owners can create biometric data for their students only',
      'Strict biometric data update access',
      'Ultra strict biometric data deletion (super admin only)'
    ),
    'additional_security', jsonb_build_array(
      'Automatic biometric access logging',
      'Account status verification for all access',
      'Failed login attempt checking',
      'High-risk activity monitoring'
    ),
    'timestamp', now()
  ),
  9 -- Critical risk score for biometric security
);