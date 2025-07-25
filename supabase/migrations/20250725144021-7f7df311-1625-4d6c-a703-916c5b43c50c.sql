
-- Fix database security and add performance indexes

-- 1. Create indexes for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_batch_id ON public.students (batch_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_user_id ON public.students (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_created_at ON public.students (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_user_id ON public.batches (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_created_at ON public.batches (created_at DESC);

-- 2. Create user roles table for role-based access control
CREATE TYPE public.user_role AS ENUM ('admin', 'operator', 'viewer');

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'operator',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_profiles WHERE user_id = auth.uid();
$$;

-- RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (public.get_user_role() = 'admin');

-- 3. Create system health monitoring table
CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  response_time_ms INTEGER
);

-- Index for health logs
CREATE INDEX IF NOT EXISTS idx_system_health_logs_checked_at ON public.system_health_logs (checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_logs_status ON public.system_health_logs (status);

-- 4. Create audit log table for detailed tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit log policies
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (public.get_user_role() = 'admin');

CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values,
    now()
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- 6. Create triggers for automatic audit logging
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Add audit triggers to important tables
DROP TRIGGER IF EXISTS audit_students_trigger ON public.students;
CREATE TRIGGER audit_students_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_batches_trigger ON public.batches;
CREATE TRIGGER audit_batches_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- 7. Create function for system health checks
CREATE OR REPLACE FUNCTION public.record_health_check(
  p_check_type TEXT,
  p_status TEXT,
  p_details JSONB DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL
) RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  health_id UUID;
BEGIN
  INSERT INTO public.system_health_logs (
    check_type,
    status,
    details,
    response_time_ms,
    checked_at
  ) VALUES (
    p_check_type,
    p_status,
    p_details,
    p_response_time_ms,
    now()
  ) RETURNING id INTO health_id;
  
  RETURN health_id;
END;
$$;

-- 8. Update existing tables with updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_students') THEN
    CREATE TRIGGER set_updated_at_students
      BEFORE UPDATE ON public.students
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_batches') THEN
    CREATE TRIGGER set_updated_at_batches
      BEFORE UPDATE ON public.batches
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_user_profiles') THEN
    CREATE TRIGGER set_updated_at_user_profiles
      BEFORE UPDATE ON public.user_profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;
