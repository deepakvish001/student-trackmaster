-- Enable real-time updates for audit_logs table
-- First, set replica identity to full for complete row data
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;