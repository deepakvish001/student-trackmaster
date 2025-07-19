-- Create batches table
CREATE TABLE public.batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number TEXT NOT NULL UNIQUE,
  batch_name TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  username TEXT NOT NULL,
  max_students INTEGER NOT NULL DEFAULT 50,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  finger_1 TEXT,
  finger_2 TEXT,
  finger_3 TEXT,
  finger_4 TEXT,
  finger_5 TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed based on your auth requirements)
CREATE POLICY "Allow public read access to batches" 
ON public.batches 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to batches" 
ON public.batches 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to batches" 
ON public.batches 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to batches" 
ON public.batches 
FOR DELETE 
USING (true);

CREATE POLICY "Allow public read access to students" 
ON public.students 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to students" 
ON public.students 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to students" 
ON public.students 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to students" 
ON public.students 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_students_batch_id ON public.students(batch_id);
CREATE INDEX idx_batches_is_enabled ON public.batches(is_enabled);
CREATE INDEX idx_students_is_enabled ON public.students(is_enabled);