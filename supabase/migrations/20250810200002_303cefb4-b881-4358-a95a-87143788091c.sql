-- Create comprehensive audit triggers for all major activities

-- 1. Enhanced audit logging function for students table
CREATE OR REPLACE FUNCTION public.log_student_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  action_text text;
  user_name text;
BEGIN
  -- Get user name for better audit messages
  SELECT full_name INTO user_name 
  FROM public.user_profiles 
  WHERE user_id = auth.uid();
  
  user_name := COALESCE(user_name, 'Unknown User');

  IF TG_OP = 'INSERT' THEN
    action_text := user_name || ' created student "' || NEW.student_name || '"';
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (
      auth.uid(),
      action_text,
      'students',
      NEW.id::text,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    action_text := user_name || ' updated student "' || NEW.student_name || '"';
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
      auth.uid(),
      action_text,
      'students',
      NEW.id::text,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    action_text := user_name || ' deleted student "' || OLD.student_name || '"';
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (
      auth.uid(),
      action_text,
      'students',
      OLD.id::text,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$;

-- 2. Enhanced audit logging function for batches table
CREATE OR REPLACE FUNCTION public.log_batch_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  action_text text;
  user_name text;
BEGIN
  -- Get user name for better audit messages
  SELECT full_name INTO user_name 
  FROM public.user_profiles 
  WHERE user_id = auth.uid();
  
  user_name := COALESCE(user_name, 'Unknown User');

  IF TG_OP = 'INSERT' THEN
    action_text := user_name || ' created batch "' || NEW.batch_name || '"';
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (
      auth.uid(),
      action_text,
      'batches',
      NEW.id::text,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    action_text := user_name || ' updated batch "' || NEW.batch_name || '"';
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
      auth.uid(),
      action_text,
      'batches',
      NEW.id::text,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    action_text := user_name || ' deleted batch "' || OLD.batch_name || '"';
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (
      auth.uid(),
      action_text,
      'batches',
      OLD.id::text,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$;

-- 3. Enhanced audit logging function for fingerprints
CREATE OR REPLACE FUNCTION public.log_fingerprint_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  action_text text;
  user_name text;
  student_name text;
BEGIN
  -- Get user name and student name for better audit messages
  SELECT full_name INTO user_name 
  FROM public.user_profiles 
  WHERE user_id = auth.uid();
  
  user_name := COALESCE(user_name, 'Unknown User');

  IF TG_OP = 'INSERT' THEN
    SELECT s.student_name INTO student_name
    FROM public.students s
    WHERE s.id = NEW.student_id;
    
    action_text := user_name || ' captured fingerprint #' || NEW.finger_index || ' for student "' || COALESCE(student_name, 'Unknown') || '"';
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (
      auth.uid(),
      action_text,
      'student_fingerprints',
      NEW.id::text,
      jsonb_build_object(
        'student_id', NEW.student_id,
        'finger_index', NEW.finger_index,
        'quality_score', NEW.quality_score
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT s.student_name INTO student_name
    FROM public.students s
    WHERE s.id = NEW.student_id;
    
    action_text := user_name || ' updated fingerprint #' || NEW.finger_index || ' for student "' || COALESCE(student_name, 'Unknown') || '"';
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
      auth.uid(),
      action_text,
      'student_fingerprints',
      NEW.id::text,
      jsonb_build_object(
        'finger_index', OLD.finger_index,
        'quality_score', OLD.quality_score
      ),
      jsonb_build_object(
        'finger_index', NEW.finger_index,
        'quality_score', NEW.quality_score
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    SELECT s.student_name INTO student_name
    FROM public.students s
    WHERE s.id = OLD.student_id;
    
    action_text := user_name || ' deleted fingerprint #' || OLD.finger_index || ' for student "' || COALESCE(student_name, 'Unknown') || '"';
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (
      auth.uid(),
      action_text,
      'student_fingerprints',
      OLD.id::text,
      jsonb_build_object(
        'student_id', OLD.student_id,
        'finger_index', OLD.finger_index
      )
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$;

-- 4. Create triggers for comprehensive audit logging
DROP TRIGGER IF EXISTS students_audit_trigger ON public.students;
CREATE TRIGGER students_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.log_student_changes();

DROP TRIGGER IF EXISTS batches_audit_trigger ON public.batches;
CREATE TRIGGER batches_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.log_batch_changes();

DROP TRIGGER IF EXISTS fingerprints_audit_trigger ON public.student_fingerprints;
CREATE TRIGGER fingerprints_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.student_fingerprints
  FOR EACH ROW EXECUTE FUNCTION public.log_fingerprint_changes();

-- 5. Enhanced system settings audit logging
CREATE OR REPLACE FUNCTION public.log_system_settings_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  action_text text;
  user_name text;
BEGIN
  -- Get user name for better audit messages
  SELECT full_name INTO user_name 
  FROM public.user_profiles 
  WHERE user_id = auth.uid();
  
  user_name := COALESCE(user_name, 'Unknown User');

  IF TG_OP = 'INSERT' THEN
    action_text := user_name || ' created system setting "' || NEW.setting_key || '"';
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (
      auth.uid(),
      action_text,
      'system_settings',
      NEW.id::text,
      jsonb_build_object(
        'setting_key', NEW.setting_key,
        'setting_value', NEW.setting_value,
        'category', NEW.category
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    action_text := user_name || ' updated system setting "' || NEW.setting_key || '"';
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
      auth.uid(),
      action_text,
      'system_settings',
      NEW.id::text,
      jsonb_build_object(
        'old_value', OLD.setting_value
      ),
      jsonb_build_object(
        'new_value', NEW.setting_value
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    action_text := user_name || ' deleted system setting "' || OLD.setting_key || '"';
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (
      auth.uid(),
      action_text,
      'system_settings',
      OLD.id::text,
      jsonb_build_object(
        'setting_key', OLD.setting_key,
        'setting_value', OLD.setting_value
      )
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS system_settings_audit_trigger ON public.system_settings;
CREATE TRIGGER system_settings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.log_system_settings_changes();

-- 6. Create a function to manually log authentication events (to be called from the app)
CREATE OR REPLACE FUNCTION public.log_auth_event(
  event_type text,
  event_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_name text;
  action_text text;
BEGIN
  -- Get user name for better audit messages
  SELECT full_name INTO user_name 
  FROM public.user_profiles 
  WHERE user_id = auth.uid();
  
  user_name := COALESCE(user_name, 'Unknown User');

  -- Create descriptive action text based on event type
  CASE event_type
    WHEN 'LOGIN' THEN
      action_text := user_name || ' logged in';
    WHEN 'LOGOUT' THEN  
      action_text := user_name || ' logged out';
    WHEN 'LOGIN_FAILED' THEN
      action_text := 'Failed login attempt for ' || COALESCE(event_details->>'email', 'unknown user');
    WHEN 'PASSWORD_CHANGE' THEN
      action_text := user_name || ' changed their password';
    WHEN 'PROFILE_UPDATE' THEN
      action_text := user_name || ' updated their profile';
    ELSE
      action_text := user_name || ' performed ' || event_type;
  END CASE;

  INSERT INTO public.audit_logs (
    user_id, 
    action, 
    table_name, 
    new_values,
    ip_address,
    user_agent
  )
  VALUES (
    auth.uid(),
    action_text,
    'auth_events',
    event_details,
    inet_client_addr(),
    event_details->>'user_agent'
  );
END;
$function$;

-- 7. Create a function to log file operations (PDF downloads, etc.)
CREATE OR REPLACE FUNCTION public.log_file_operation(
  operation_type text,
  file_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_name text;
  action_text text;
BEGIN
  -- Get user name for better audit messages
  SELECT full_name INTO user_name 
  FROM public.user_profiles 
  WHERE user_id = auth.uid();
  
  user_name := COALESCE(user_name, 'Unknown User');

  -- Create descriptive action text
  CASE operation_type
    WHEN 'PDF_DOWNLOAD' THEN
      action_text := user_name || ' downloaded PDF report';
    WHEN 'DATA_EXPORT' THEN
      action_text := user_name || ' exported data';
    WHEN 'BULK_IMPORT' THEN
      action_text := user_name || ' performed bulk import';
    ELSE
      action_text := user_name || ' performed ' || operation_type;
  END CASE;

  INSERT INTO public.audit_logs (
    user_id, 
    action, 
    table_name, 
    new_values
  )
  VALUES (
    auth.uid(),
    action_text,
    'file_operations',
    file_details
  );
END;
$function$;