-- Add max_batches_allowed column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN max_batches_allowed integer NOT NULL DEFAULT 1;

-- Add comment for clarity
COMMENT ON COLUMN public.user_profiles.max_batches_allowed IS 'Maximum number of batches this user is allowed to create';

-- Update existing RLS policies for batches to ensure users can always see their own created batches
DROP POLICY IF EXISTS "Users can view accessible batches only" ON public.batches;

CREATE POLICY "Users can view accessible batches only" 
ON public.batches 
FOR SELECT 
USING (
  (auth.role() = 'authenticated'::text) AND 
  (
    is_super_admin() OR 
    (auth.uid() = user_id) OR 
    (id = ANY (get_user_accessible_batches()))
  )
);

-- Update batch creation policy to check max_batches_allowed
DROP POLICY IF EXISTS "Authenticated users can create batches" ON public.batches;

CREATE POLICY "Authenticated users can create batches" 
ON public.batches 
FOR INSERT 
WITH CHECK (
  (auth.role() = 'authenticated'::text) AND 
  (auth.uid() = user_id) AND
  (
    is_super_admin() OR
    (
      SELECT COUNT(*) 
      FROM public.batches 
      WHERE user_id = auth.uid()
    ) < (
      SELECT COALESCE(max_batches_allowed, 1) 
      FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);