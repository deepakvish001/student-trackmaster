
-- Fix function search path vulnerabilities and strengthen security
-- 1. Update handle_new_user_records function with proper search path
CREATE OR REPLACE FUNCTION public.handle_new_user_records()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$function$;

-- 2. Update update_updated_at_column function with proper search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. Make user_id NOT NULL in batches table (critical for RLS)
ALTER TABLE public.batches ALTER COLUMN user_id SET NOT NULL;

-- 4. Make user_id NOT NULL in students table (critical for RLS)
ALTER TABLE public.students ALTER COLUMN user_id SET NOT NULL;

-- 5. Update RLS policies to remove nullable user_id conditions
-- Drop existing policies for batches
DROP POLICY IF EXISTS "Users can delete their own batches" ON public.batches;
DROP POLICY IF EXISTS "Users can update their own batches" ON public.batches;

-- Create new stricter policies for batches
CREATE POLICY "Users can delete their own batches" ON public.batches
FOR DELETE 
USING ((auth.role() = 'authenticated'::text) AND (auth.uid() = user_id));

CREATE POLICY "Users can update their own batches" ON public.batches
FOR UPDATE 
USING ((auth.role() = 'authenticated'::text) AND (auth.uid() = user_id));

-- Drop existing policies for students
DROP POLICY IF EXISTS "Users can delete their own students" ON public.students;
DROP POLICY IF EXISTS "Users can update their own students" ON public.students;

-- Create new stricter policies for students
CREATE POLICY "Users can delete their own students" ON public.students
FOR DELETE 
USING ((auth.role() = 'authenticated'::text) AND (auth.uid() = user_id));

CREATE POLICY "Users can update their own students" ON public.students
FOR UPDATE 
USING ((auth.role() = 'authenticated'::text) AND (auth.uid() = user_id));

-- 6. Add triggers to ensure user_id is always set
CREATE OR REPLACE FUNCTION public.ensure_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  
  -- Ensure user_id matches the authenticated user for security
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'user_id must match authenticated user';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Apply triggers to both tables
DROP TRIGGER IF EXISTS ensure_batches_user_id ON public.batches;
CREATE TRIGGER ensure_batches_user_id
  BEFORE INSERT OR UPDATE ON public.batches
  FOR EACH ROW EXECUTE PROCEDURE public.ensure_user_id();

DROP TRIGGER IF EXISTS ensure_students_user_id ON public.students;
CREATE TRIGGER ensure_students_user_id
  BEFORE INSERT OR UPDATE ON public.students
  FOR EACH ROW EXECUTE PROCEDURE public.ensure_user_id();

-- 7. Add security audit function for monitoring
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  table_name text DEFAULT NULL,
  record_id uuid DEFAULT NULL,
  details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Log security events for monitoring
  -- In production, you might want to log to a separate audit table
  RAISE LOG 'SECURITY_EVENT: % on % (record: %, user: %, details: %)', 
    event_type, 
    COALESCE(table_name, 'unknown'), 
    COALESCE(record_id::text, 'unknown'),
    COALESCE(auth.uid()::text, 'anonymous'),
    COALESCE(details::text, '{}');
END;
$function$;
