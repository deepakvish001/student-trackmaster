
-- Add fingerprint image columns to store actual captured fingerprint images
ALTER TABLE public.students 
ADD COLUMN finger_1_image TEXT,
ADD COLUMN finger_2_image TEXT,
ADD COLUMN finger_3_image TEXT,
ADD COLUMN finger_4_image TEXT,
ADD COLUMN finger_5_image TEXT;

-- Add comments to describe the new columns
COMMENT ON COLUMN public.students.finger_1_image IS 'Base64 encoded fingerprint image data from MFS100 device';
COMMENT ON COLUMN public.students.finger_2_image IS 'Base64 encoded fingerprint image data from MFS100 device';
COMMENT ON COLUMN public.students.finger_3_image IS 'Base64 encoded fingerprint image data from MFS100 device';
COMMENT ON COLUMN public.students.finger_4_image IS 'Base64 encoded fingerprint image data from MFS100 device';
COMMENT ON COLUMN public.students.finger_5_image IS 'Base64 encoded fingerprint image data from MFS100 device';
