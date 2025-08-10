-- Fix security warnings by setting search_path for all functions
ALTER FUNCTION public.validate_user_login() SET search_path = '';
ALTER FUNCTION public.handle_new_user_records() SET search_path = '';
ALTER FUNCTION public.handle_new_user_profile() SET search_path = '';
ALTER FUNCTION public.get_current_user_role() SET search_path = '';
ALTER FUNCTION public.is_super_admin() SET search_path = '';
ALTER FUNCTION public.update_user_role(uuid, user_role) SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';