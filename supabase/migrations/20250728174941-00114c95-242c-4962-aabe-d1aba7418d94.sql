
-- Create student_fingerprints table for storing individual fingerprint records
CREATE TABLE public.student_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  finger_index INTEGER NOT NULL CHECK (finger_index >= 0 AND finger_index <= 4),
  pid_data TEXT NOT NULL,
  quality_score INTEGER,
  image_data TEXT,
  capture_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users
);

-- Add Row Level Security (RLS)
ALTER TABLE public.student_fingerprints ENABLE ROW LEVEL SECURITY;

-- Create policies for student_fingerprints
CREATE POLICY "Authenticated users can view student fingerprints" 
  ON public.student_fingerprints 
  FOR SELECT 
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can create student fingerprints" 
  ON public.student_fingerprints 
  FOR INSERT 
  WITH CHECK ((auth.role() = 'authenticated'::text) AND (auth.uid() = user_id));

CREATE POLICY "Users can update their own student fingerprints" 
  ON public.student_fingerprints 
  FOR UPDATE 
  USING ((auth.role() = 'authenticated'::text) AND ((auth.uid() = user_id) OR (user_id IS NULL)));

CREATE POLICY "Users can delete their own student fingerprints" 
  ON public.student_fingerprints 
  FOR DELETE 
  USING ((auth.role() = 'authenticated'::text) AND ((auth.uid() = user_id) OR (user_id IS NULL)));

-- Create index for better performance
CREATE INDEX idx_student_fingerprints_student_id ON public.student_fingerprints(student_id);
CREATE INDEX idx_student_fingerprints_finger_index ON public.student_fingerprints(student_id, finger_index);
