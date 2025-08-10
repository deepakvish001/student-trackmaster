-- Create user_batch_access table for many-to-many relationship
CREATE TABLE public.user_batch_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  granted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, batch_id)
);

-- Enable RLS
ALTER TABLE public.user_batch_access ENABLE ROW LEVEL SECURITY;

-- Create policies for user_batch_access
CREATE POLICY "Super admins can manage all batch access" 
ON public.user_batch_access 
FOR ALL 
USING (is_super_admin());

CREATE POLICY "Users can view their own batch access" 
ON public.user_batch_access 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create function to check if user has batch access
CREATE OR REPLACE FUNCTION public.user_has_batch_access(target_user_id uuid, target_batch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_batch_access 
    WHERE user_id = target_user_id AND batch_id = target_batch_id
  ) OR is_super_admin();
$$;

-- Update existing policies to include batch access control
-- First, update the batches table policies
DROP POLICY IF EXISTS "Users can only view their own batches" ON public.batches;
CREATE POLICY "Users can view batches they have access to" 
ON public.batches 
FOR SELECT 
USING (
  (auth.role() = 'authenticated'::text) AND 
  (
    is_super_admin() OR 
    (auth.uid() = user_id) OR 
    user_has_batch_access(auth.uid(), id)
  )
);

DROP POLICY IF EXISTS "Users can update their own batches" ON public.batches;
CREATE POLICY "Users can update batches they own or have access to" 
ON public.batches 
FOR UPDATE 
USING (
  (auth.role() = 'authenticated'::text) AND 
  (
    is_super_admin() OR 
    (auth.uid() = user_id) OR 
    (user_id IS NULL AND user_has_batch_access(auth.uid(), id))
  )
);

DROP POLICY IF EXISTS "Users can delete their own batches" ON public.batches;
CREATE POLICY "Users can delete batches they own" 
ON public.batches 
FOR DELETE 
USING (
  (auth.role() = 'authenticated'::text) AND 
  (is_super_admin() OR (auth.uid() = user_id))
);

-- Update students table policies to check batch access
DROP POLICY IF EXISTS "Users can only view their own students" ON public.students;
CREATE POLICY "Users can view students in accessible batches" 
ON public.students 
FOR SELECT 
USING (
  (auth.role() = 'authenticated'::text) AND 
  (
    is_super_admin() OR 
    (auth.uid() = user_id) OR 
    user_has_batch_access(auth.uid(), batch_id)
  )
);

DROP POLICY IF EXISTS "Users can update their own students" ON public.students;
CREATE POLICY "Users can update students in accessible batches" 
ON public.students 
FOR UPDATE 
USING (
  (auth.role() = 'authenticated'::text) AND 
  (
    is_super_admin() OR 
    (auth.uid() = user_id) OR 
    (user_id IS NULL AND user_has_batch_access(auth.uid(), batch_id))
  )
);

DROP POLICY IF EXISTS "Users can delete their own students" ON public.students;
CREATE POLICY "Users can delete students in accessible batches" 
ON public.students 
FOR DELETE 
USING (
  (auth.role() = 'authenticated'::text) AND 
  (
    is_super_admin() OR 
    (auth.uid() = user_id) OR 
    user_has_batch_access(auth.uid(), batch_id)
  )
);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_user_batch_access_updated_at
BEFORE UPDATE ON public.user_batch_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();