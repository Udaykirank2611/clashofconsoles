ALTER TABLE public.admin_profiles DROP COLUMN IF EXISTS full_name;
ALTER TABLE public.admin_login_events DROP COLUMN IF EXISTS full_name;
ALTER TABLE public.admin_login_events ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE public.admin_sessions ADD COLUMN IF NOT EXISTS ip_address text;