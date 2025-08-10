-- Enable realtime for user_batch_access table
ALTER TABLE public.user_batch_access REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_batch_access;

-- Create function to get user's accessible batch IDs
CREATE OR REPLACE FUNCTION public.get_user_accessible_batches(target_user_id uuid DEFAULT auth.uid())
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT batch_id 
      FROM public.user_batch_access 
      WHERE user_id = target_user_id
    ), 
    ARRAY[]::uuid[]
  );
$$;

-- Update batch policies to be more restrictive
DROP POLICY IF EXISTS "Users can view batches they have access to" ON public.batches;
CREATE POLICY "Users can view accessible batches only" 
ON public.batches 
FOR SELECT 
USING (
  (auth.role() = 'authenticated'::text) AND 
  (
    public.is_super_admin() OR 
    (auth.uid() = user_id) OR 
    (id = ANY(public.get_user_accessible_batches()))
  )
);

-- Update students policies to be more restrictive  
DROP POLICY IF EXISTS "Users can view students in accessible batches" ON public.students;
CREATE POLICY "Users can view accessible students only" 
ON public.students 
FOR SELECT 
USING (
  (auth.role() = 'authenticated'::text) AND 
  (
    public.is_super_admin() OR 
    (auth.uid() = user_id) OR 
    (batch_id = ANY(public.get_user_accessible_batches()))
  )
);

DROP POLICY IF EXISTS "Users can update students in accessible batches" ON public.students;
CREATE POLICY "Users can update accessible students only" 
ON public.students 
FOR UPDATE 
USING (
  (auth.role() = 'authenticated'::text) AND 
  (
    public.is_super_admin() OR 
    (auth.uid() = user_id) OR 
    (batch_id = ANY(public.get_user_accessible_batches()))
  )
);

DROP POLICY IF EXISTS "Users can delete students in accessible batches" ON public.students;
CREATE POLICY "Users can delete accessible students only" 
ON public.students 
FOR DELETE 
USING (
  (auth.role() = 'authenticated'::text) AND 
  (
    public.is_super_admin() OR 
    (auth.uid() = user_id) OR 
    (batch_id = ANY(public.get_user_accessible_batches()))
  )
);

-- Update batch policies for updates to be more restrictive
DROP POLICY IF EXISTS "Users can update batches they own or have access to" ON public.batches;
CREATE POLICY "Users can update accessible batches only" 
ON public.batches 
FOR UPDATE 
USING (
  (auth.role() = 'authenticated'::text) AND 
  (
    public.is_super_admin() OR 
    (auth.uid() = user_id) OR 
    (id = ANY(public.get_user_accessible_batches()))
  )
);

-- Students can only be created in accessible batches
DROP POLICY IF EXISTS "Authenticated users can create students" ON public.students;
CREATE POLICY "Users can create students in accessible batches" 
ON public.students 
FOR INSERT 
WITH CHECK (
  (auth.role() = 'authenticated'::text) AND 
  (auth.uid() = user_id) AND
  (
    public.is_super_admin() OR 
    (batch_id = ANY(public.get_user_accessible_batches()))
  )
);