
-- Fix critical security vulnerability: Replace overly permissive RLS policies
-- Currently all policies use 'true' which allows unrestricted public access

-- Drop existing overly permissive policies for batches table
DROP POLICY IF EXISTS "Allow public delete access to batches" ON public.batches;
DROP POLICY IF EXISTS "Allow public insert access to batches" ON public.batches;
DROP POLICY IF EXISTS "Allow public read access to batches" ON public.batches;
DROP POLICY IF EXISTS "Allow public update access to batches" ON public.batches;

-- Drop existing overly permissive policies for students table
DROP POLICY IF EXISTS "Allow public delete access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public insert access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public read access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public update access to students" ON public.students;

-- Add user_id column to batches table to link batches to authenticated users
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update existing batches to have a user_id (this is temporary - in production you'd handle this differently)
-- For now, we'll make user_id nullable and add proper policies

-- Create secure RLS policies for batches table (authenticated users only)
CREATE POLICY "Authenticated users can view batches" 
  ON public.batches 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create batches" 
  ON public.batches 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can update their own batches" 
  ON public.batches 
  FOR UPDATE 
  USING (auth.role() = 'authenticated' AND (auth.uid() = user_id OR user_id IS NULL));

CREATE POLICY "Users can delete their own batches" 
  ON public.batches 
  FOR DELETE 
  USING (auth.role() = 'authenticated' AND (auth.uid() = user_id OR user_id IS NULL));

-- Add user_id column to students table for user-specific access
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create secure RLS policies for students table (authenticated users only)
CREATE POLICY "Authenticated users can view students" 
  ON public.students 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create students" 
  ON public.students 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can update their own students" 
  ON public.students 
  FOR UPDATE 
  USING (auth.role() = 'authenticated' AND (auth.uid() = user_id OR user_id IS NULL));

CREATE POLICY "Users can delete their own students" 
  ON public.students 
  FOR DELETE 
  USING (auth.role() = 'authenticated' AND (auth.uid() = user_id OR user_id IS NULL));

-- Create function to automatically set user_id on inserts
CREATE OR REPLACE FUNCTION public.handle_new_user_records()
RETURNS trigger AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically set user_id
DROP TRIGGER IF EXISTS on_batches_created ON public.batches;
CREATE TRIGGER on_batches_created
  BEFORE INSERT ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_records();

DROP TRIGGER IF EXISTS on_students_created ON public.students;
CREATE TRIGGER on_students_created
  BEFORE INSERT ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_records();
