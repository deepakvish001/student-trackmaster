-- Enable real-time for students table
ALTER TABLE public.students REPLICA IDENTITY FULL;

-- Add students table to realtime publication (if not already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;

-- Also enable for batches table to track batch changes
ALTER TABLE public.batches REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.batches;