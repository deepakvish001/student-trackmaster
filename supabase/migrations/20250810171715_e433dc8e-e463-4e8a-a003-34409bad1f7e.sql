-- Enhanced Security and Session Management
-- Add security-related columns and improve RLS policies

-- Add security columns to user_profiles if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'failed_login_attempts') THEN
    ALTER TABLE public.user_profiles ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'locked_until') THEN
    ALTER TABLE public.user_profiles ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'password_changed_at') THEN
    ALTER TABLE public.user_profiles ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'session_token') THEN
    ALTER TABLE public.user_profiles ADD COLUMN session_token TEXT;
  END IF;
END $$;

-- Create enhanced security function for checking account locks
CREATE OR REPLACE FUNCTION public.is_account_locked(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT locked_until > now() FROM public.user_profiles WHERE user_id = target_user_id),
    false
  );
$$;

-- Create function to handle failed login attempts
CREATE OR REPLACE FUNCTION public.handle_failed_login(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_attempts integer;
  max_attempts integer := 5;
  lockout_duration interval := '30 minutes';
BEGIN
  -- Get current failed attempts
  SELECT COALESCE(failed_login_attempts, 0) INTO current_attempts
  FROM public.user_profiles 
  WHERE user_id = target_user_id;

  -- Increment failed attempts
  current_attempts := current_attempts + 1;

  -- Check if account should be locked
  IF current_attempts >= max_attempts THEN
    UPDATE public.user_profiles 
    SET 
      failed_login_attempts = current_attempts,
      locked_until = now() + lockout_duration,
      updated_at = now()
    WHERE user_id = target_user_id;

    RETURN json_build_object(
      'locked', true, 
      'attempts', current_attempts,
      'locked_until', now() + lockout_duration
    );
  ELSE
    UPDATE public.user_profiles 
    SET 
      failed_login_attempts = current_attempts,
      updated_at = now()
    WHERE user_id = target_user_id;

    RETURN json_build_object(
      'locked', false, 
      'attempts', current_attempts,
      'remaining_attempts', max_attempts - current_attempts
    );
  END IF;
END;
$$;

-- Create function to reset failed login attempts on successful login
CREATE OR REPLACE FUNCTION public.reset_failed_login_attempts(target_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.user_profiles 
  SET 
    failed_login_attempts = 0,
    locked_until = NULL,
    last_login_at = now(),
    updated_at = now()
  WHERE user_id = target_user_id;
$$;

-- Enhanced audit logging with IP tracking
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

-- Create function to log high-risk activities
CREATE OR REPLACE FUNCTION public.log_high_risk_activity(
  activity_type text,
  target_user_id uuid,
  risk_level integer,
  details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    risk_score,
    new_values,
    ip_address,
    created_at
  ) VALUES (
    target_user_id,
    activity_type,
    'security_event',
    risk_level,
    details,
    inet_client_addr(),
    now()
  );

  -- If high risk, also log to system health
  IF risk_level >= 8 THEN
    INSERT INTO public.system_health_logs (
      check_type,
      status,
      details,
      checked_at
    ) VALUES (
      'SECURITY_ALERT',
      'HIGH_RISK',
      jsonb_build_object(
        'activity_type', activity_type,
        'user_id', target_user_id,
        'risk_score', risk_level,
        'details', details
      ),
      now()
    );
  END IF;
END;
$$;

-- Enhanced RLS policies for students table with batch access control
DROP POLICY IF EXISTS "Users can view accessible students only" ON public.students;
CREATE POLICY "Enhanced students view policy" ON public.students
FOR SELECT 
TO authenticated
USING (
  -- Super admin can see all
  public.is_super_admin() OR
  -- User can see their own students
  (auth.uid() = user_id) OR
  -- User can see students in batches they have access to
  (batch_id = ANY(public.get_user_accessible_batches())) OR
  -- Additional security: check if user account is active
  (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND (locked_until IS NULL OR locked_until < now())
    )
  )
);

-- Enhanced RLS policies for batches table
DROP POLICY IF EXISTS "Users can view accessible batches only" ON public.batches;
CREATE POLICY "Enhanced batches view policy" ON public.batches
FOR SELECT 
TO authenticated
USING (
  -- Super admin can see all
  public.is_super_admin() OR
  -- User can see their own batches
  (auth.uid() = user_id) OR
  -- User can see batches they have explicit access to
  (id = ANY(public.get_user_accessible_batches())) OR
  -- Additional security: check if user account is active
  (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND (locked_until IS NULL OR locked_until < now())
    )
  )
);

-- Enhanced policy for student fingerprints with additional security checks
DROP POLICY IF EXISTS "Users can only view fingerprints for their own students" ON public.student_fingerprints;
CREATE POLICY "Enhanced fingerprints view policy" ON public.student_fingerprints
FOR SELECT 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  (
    -- Super admin can see all
    public.is_super_admin() OR
    -- User can see fingerprints for students they own
    EXISTS (
      SELECT 1 FROM public.students s
      INNER JOIN public.user_profiles up ON s.user_id = up.user_id
      WHERE s.id = student_fingerprints.student_id 
      AND s.user_id = auth.uid()
      AND up.is_active = true
      AND (up.locked_until IS NULL OR up.locked_until < now())
    ) OR
    -- User can see fingerprints for students in accessible batches
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_fingerprints.student_id 
      AND s.batch_id = ANY(public.get_user_accessible_batches())
    )
  )
);

-- Create security trigger to monitor high-risk database operations
CREATE OR REPLACE FUNCTION public.security_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Log deletion of critical data
  IF TG_OP = 'DELETE' THEN
    PERFORM public.log_high_risk_activity(
      TG_TABLE_NAME || '_DELETION',
      COALESCE(OLD.user_id, auth.uid()),
      7,
      jsonb_build_object(
        'deleted_record_id', COALESCE(OLD.id::text, 'unknown'),
        'table_name', TG_TABLE_NAME,
        'timestamp', now()
      )
    );
    RETURN OLD;
  END IF;

  -- Log modification of security-sensitive fields
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'user_profiles' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      PERFORM public.log_high_risk_activity(
        'ROLE_CHANGE',
        NEW.user_id,
        9,
        jsonb_build_object(
          'old_role', OLD.role,
          'new_role', NEW.role,
          'changed_by', auth.uid()
        )
      );
    END IF;

    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      PERFORM public.log_high_risk_activity(
        'ACCOUNT_STATUS_CHANGE',
        NEW.user_id,
        8,
        jsonb_build_object(
          'old_status', OLD.is_active,
          'new_status', NEW.is_active,
          'changed_by', auth.uid()
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply security triggers to critical tables
DROP TRIGGER IF EXISTS security_audit_user_profiles ON public.user_profiles;
CREATE TRIGGER security_audit_user_profiles
  BEFORE UPDATE OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.security_audit_trigger();

DROP TRIGGER IF EXISTS security_audit_students ON public.students;
CREATE TRIGGER security_audit_students
  BEFORE DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.security_audit_trigger();

DROP TRIGGER IF EXISTS security_audit_batches ON public.batches;
CREATE TRIGGER security_audit_batches
  BEFORE DELETE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.security_audit_trigger();