-- Emergency fix: Temporarily disable all RLS constraints that could cause recursion
-- This is a temporary solution to allow batch creation to work

-- Completely disable RLS on batches table temporarily
ALTER TABLE public.batches DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies that could be causing issues
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all existing policies on batches table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'batches' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.batches';
    END LOOP;
END $$;

-- Create the most basic RLS policy that only checks authentication
CREATE POLICY "Emergency batch access" 
ON public.batches 
FOR ALL
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text AND auth.uid() = user_id);

-- Re-enable RLS with the simple policy
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;