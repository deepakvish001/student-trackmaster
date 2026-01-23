
-- =====================================================
-- COMPLETE DATABASE SCHEMA SETUP
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USER PROFILES TABLE
-- =====================================================
CREATE TABLE public.user_profiles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL DEFAULT '',
    role text NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'user')),
    avatar_url text,
    is_active boolean NOT NULL DEFAULT true,
    max_batches_allowed integer DEFAULT 1,
    last_login_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. BATCHES TABLE
-- =====================================================
CREATE TABLE public.batches (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_name text NOT NULL,
    serial_number text UNIQUE NOT NULL,
    admin_name text NOT NULL,
    username text NOT NULL,
    max_students integer NOT NULL DEFAULT 50,
    is_enabled boolean NOT NULL DEFAULT true,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. STUDENTS TABLE
-- =====================================================
CREATE TABLE public.students (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_name text NOT NULL,
    mobile_number text,
    email text,
    mobile text,
    address text,
    batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
    is_enabled boolean NOT NULL DEFAULT true,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    finger_1 text,
    finger_2 text,
    finger_3 text,
    finger_4 text,
    finger_5 text,
    finger_1_image text,
    finger_2_image text,
    finger_3_image text,
    finger_4_image text,
    finger_5_image text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 4. STUDENT FINGERPRINTS TABLE
-- =====================================================
CREATE TABLE public.student_fingerprints (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    finger_index integer NOT NULL,
    pid_data text NOT NULL,
    quality_score integer,
    image_data text,
    capture_timestamp timestamptz,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. USER BATCH ACCESS TABLE
-- =====================================================
CREATE TABLE public.user_batch_access (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, batch_id)
);

-- =====================================================
-- 6. AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    table_name text,
    record_id text,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    user_agent text,
    description text,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 7. SYSTEM SETTINGS TABLE
-- =====================================================
CREATE TABLE public.system_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    key text UNIQUE NOT NULL,
    value jsonb NOT NULL,
    category text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_batches_user_id ON public.batches(user_id);
CREATE INDEX idx_batches_is_enabled ON public.batches(is_enabled);
CREATE INDEX idx_students_batch_id ON public.students(batch_id);
CREATE INDEX idx_students_user_id ON public.students(user_id);
CREATE INDEX idx_students_is_enabled ON public.students(is_enabled);
CREATE INDEX idx_student_fingerprints_student_id ON public.student_fingerprints(student_id);
CREATE INDEX idx_user_batch_access_user_id ON public.user_batch_access(user_id);
CREATE INDEX idx_user_batch_access_batch_id ON public.user_batch_access(batch_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_system_settings_key ON public.system_settings(key);
CREATE INDEX idx_system_settings_category ON public.system_settings(category);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to handle new user creation (auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user is super admin (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = check_user_id AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Function to check if user has batch access
CREATE OR REPLACE FUNCTION public.has_batch_access(check_user_id uuid, check_batch_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_batch_access
        WHERE user_id = check_user_id AND batch_id = check_batch_id
    ) OR public.is_super_admin(check_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Function to get system settings
CREATE OR REPLACE FUNCTION public.get_system_settings()
RETURNS jsonb AS $$
DECLARE
    result jsonb := '{}';
    setting_row RECORD;
BEGIN
    FOR setting_row IN SELECT key, value, category FROM public.system_settings LOOP
        result := jsonb_set(result, ARRAY[setting_row.key], setting_row.value);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update system settings
CREATE OR REPLACE FUNCTION public.update_system_settings(settings jsonb)
RETURNS jsonb AS $$
DECLARE
    setting_key text;
    setting_value jsonb;
BEGIN
    FOR setting_key, setting_value IN SELECT * FROM jsonb_each(settings) LOOP
        INSERT INTO public.system_settings (key, value, updated_at)
        VALUES (setting_key, setting_value, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
    END LOOP;
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to toggle user status
CREATE OR REPLACE FUNCTION public.toggle_user_status(target_user_id uuid, calling_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    current_status boolean;
    new_status boolean;
BEGIN
    -- Prevent self-toggle
    IF target_user_id = calling_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot toggle your own status');
    END IF;
    
    -- Get current status
    SELECT is_active INTO current_status FROM public.user_profiles WHERE user_id = target_user_id;
    
    IF current_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    new_status := NOT current_status;
    
    UPDATE public.user_profiles SET is_active = new_status, updated_at = now() WHERE user_id = target_user_id;
    
    RETURN jsonb_build_object('success', true, 'new_status', new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update user status
CREATE OR REPLACE FUNCTION public.update_user_status(target_user_id uuid, new_status boolean)
RETURNS jsonb AS $$
BEGIN
    UPDATE public.user_profiles SET is_active = new_status, updated_at = now() WHERE user_id = target_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to delete user account
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS jsonb AS $$
BEGIN
    -- Delete related records (cascades will handle most, but explicit for clarity)
    DELETE FROM public.user_batch_access WHERE user_id = target_user_id;
    DELETE FROM public.user_profiles WHERE user_id = target_user_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers for all tables
CREATE TRIGGER handle_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_batches_updated_at
    BEFORE UPDATE ON public.batches
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_student_fingerprints_updated_at
    BEFORE UPDATE ON public.student_fingerprints
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_user_batch_access_updated_at
    BEFORE UPDATE ON public.user_batch_access
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_batch_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- USER_PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all profiles"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can update all profiles"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert profiles"
    ON public.user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_super_admin(auth.uid()) OR auth.uid() = user_id);

-- BATCHES POLICIES
CREATE POLICY "Users can view accessible batches"
    ON public.batches FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.user_batch_access WHERE user_id = auth.uid() AND batch_id = id)
    );

CREATE POLICY "Users can create batches"
    ON public.batches FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can update their own batches"
    ON public.batches FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can delete their own batches"
    ON public.batches FOR DELETE
    TO authenticated
    USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- STUDENTS POLICIES
CREATE POLICY "Users can view students in accessible batches"
    ON public.students FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        user_id = auth.uid() OR
        public.has_batch_access(auth.uid(), batch_id)
    );

CREATE POLICY "Users can create students"
    ON public.students FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        public.has_batch_access(auth.uid(), batch_id)
    );

CREATE POLICY "Users can update students in accessible batches"
    ON public.students FOR UPDATE
    TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        user_id = auth.uid() OR
        public.has_batch_access(auth.uid(), batch_id)
    );

CREATE POLICY "Users can delete students in accessible batches"
    ON public.students FOR DELETE
    TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        user_id = auth.uid() OR
        public.has_batch_access(auth.uid(), batch_id)
    );

-- STUDENT_FINGERPRINTS POLICIES
CREATE POLICY "Users can view fingerprints of accessible students"
    ON public.student_fingerprints FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_id AND (s.user_id = auth.uid() OR public.has_batch_access(auth.uid(), s.batch_id))
        )
    );

CREATE POLICY "Users can create fingerprints for accessible students"
    ON public.student_fingerprints FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_id AND (s.user_id = auth.uid() OR public.has_batch_access(auth.uid(), s.batch_id))
        )
    );

CREATE POLICY "Users can update fingerprints of accessible students"
    ON public.student_fingerprints FOR UPDATE
    TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_id AND (s.user_id = auth.uid() OR public.has_batch_access(auth.uid(), s.batch_id))
        )
    );

CREATE POLICY "Users can delete fingerprints of accessible students"
    ON public.student_fingerprints FOR DELETE
    TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_id AND (s.user_id = auth.uid() OR public.has_batch_access(auth.uid(), s.batch_id))
        )
    );

-- USER_BATCH_ACCESS POLICIES
CREATE POLICY "Users can view their own batch access"
    ON public.user_batch_access FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage batch access"
    ON public.user_batch_access FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- AUDIT_LOGS POLICIES
CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- SYSTEM_SETTINGS POLICIES
CREATE POLICY "Authenticated users can view system settings"
    ON public.system_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Super admins can manage system settings"
    ON public.system_settings FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- =====================================================
-- ENABLE REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_batch_access;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
