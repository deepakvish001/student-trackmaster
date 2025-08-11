-- Enable realtime for students table to ensure instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;

-- Enable realtime for batches table 
ALTER PUBLICATION supabase_realtime ADD TABLE public.batches;

-- Enable realtime for student_fingerprints table
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_fingerprints;

-- Set replica identity to FULL for complete row data in realtime updates
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.batches REPLICA IDENTITY FULL;
ALTER TABLE public.student_fingerprints REPLICA IDENTITY FULL;

-- Create a function to broadcast custom events for instant UI updates
CREATE OR REPLACE FUNCTION public.broadcast_student_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Broadcast to realtime for instant UI updates
  PERFORM pg_notify('student_changes', json_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'record_id', COALESCE(NEW.id::text, OLD.id::text),
    'timestamp', extract(epoch from now())
  )::text);
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for real-time broadcasting
DROP TRIGGER IF EXISTS broadcast_student_changes_trigger ON public.students;
CREATE TRIGGER broadcast_student_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_student_changes();

DROP TRIGGER IF EXISTS broadcast_batch_changes_trigger ON public.batches;
CREATE TRIGGER broadcast_batch_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_student_changes();

DROP TRIGGER IF EXISTS broadcast_fingerprint_changes_trigger ON public.student_fingerprints;
CREATE TRIGGER broadcast_fingerprint_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.student_fingerprints
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_student_changes();