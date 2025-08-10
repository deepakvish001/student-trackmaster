-- Fix critical security vulnerability in student_fingerprints table
-- Current policy allows any authenticated user to view all biometric data
-- This violates privacy laws and creates security risks

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view student fingerprints" ON public.student_fingerprints;

-- Create a secure SELECT policy that only allows users to view fingerprints for their own students
-- This uses a JOIN approach to ensure users can only access fingerprints for students they own
CREATE POLICY "Users can only view fingerprints for their own students" ON public.student_fingerprints
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE students.id = student_fingerprints.student_id 
    AND students.user_id = auth.uid()
  )
);

-- Also ensure the UPDATE policy follows the same pattern for consistency
DROP POLICY IF EXISTS "Users can update their own student fingerprints" ON public.student_fingerprints;

CREATE POLICY "Users can only update fingerprints for their own students" ON public.student_fingerprints
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE students.id = student_fingerprints.student_id 
    AND students.user_id = auth.uid()
  )
);

-- Update DELETE policy for consistency
DROP POLICY IF EXISTS "Users can delete their own student fingerprints" ON public.student_fingerprints;

CREATE POLICY "Users can only delete fingerprints for their own students" ON public.student_fingerprints
FOR DELETE 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE students.id = student_fingerprints.student_id 
    AND students.user_id = auth.uid()
  )
);

-- Ensure INSERT policy is properly restrictive
DROP POLICY IF EXISTS "Authenticated users can create student fingerprints" ON public.student_fingerprints;

CREATE POLICY "Users can only create fingerprints for their own students" ON public.student_fingerprints
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND 
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE students.id = student_fingerprints.student_id 
    AND students.user_id = auth.uid()
  )
);