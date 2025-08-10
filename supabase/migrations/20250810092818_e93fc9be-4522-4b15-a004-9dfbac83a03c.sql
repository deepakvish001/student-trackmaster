-- Fix critical security vulnerability in batches and students tables
-- Current policies allow any authenticated user to view all records
-- This violates privacy and allows unauthorized access to sensitive data

-- Fix BATCHES table security
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view batches" ON public.batches;

-- Create secure SELECT policy for batches - users can only see their own batches
-- Also allow super_admin to view all batches for administrative purposes
CREATE POLICY "Users can only view their own batches" ON public.batches
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  (
    auth.uid() = user_id OR 
    public.is_super_admin()
  )
);

-- Fix STUDENTS table security  
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;

-- Create secure SELECT policy for students - users can only see their own students
-- Also allow super_admin to view all students for administrative purposes
CREATE POLICY "Users can only view their own students" ON public.students
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  (
    auth.uid() = user_id OR 
    public.is_super_admin()
  )
);

-- Important: Address the nullable user_id issue
-- Add comments for future reference about the security implications
COMMENT ON COLUMN public.batches.user_id IS 'SECURITY: This column should not be nullable to ensure proper RLS. NULL values may be accessible by all users.';
COMMENT ON COLUMN public.students.user_id IS 'SECURITY: This column should not be nullable to ensure proper RLS. NULL values may be accessible by all users.';

-- Update any existing NULL user_id records to prevent access issues
-- Note: This is commented out to avoid data loss - should be handled carefully
-- UPDATE public.batches SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
-- UPDATE public.students SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;