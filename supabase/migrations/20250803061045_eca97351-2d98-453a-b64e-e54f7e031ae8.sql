
-- Add mobile number and address fields to the students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS mobile_number text,
ADD COLUMN IF NOT EXISTS address text;
