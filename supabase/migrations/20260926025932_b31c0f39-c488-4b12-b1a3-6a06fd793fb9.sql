CREATE TABLE public.admin_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  is_disabled boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_profiles TO service_role;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  username text NOT NULL,
  full_name text,
  role text,
  branch text,
  browser text,
  device text,
  success boolean NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_login_events_created_idx ON public.admin_login_events (created_at DESC);
GRANT ALL ON public.admin_login_events TO service_role;
ALTER TABLE public.admin_login_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  browser text,
  device text,
  login_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX admin_sessions_user_idx ON public.admin_sessions (user_id);
GRANT ALL ON public.admin_sessions TO service_role;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_profiles (user_id, username, full_name)
SELECT DISTINCT u.id, lower(u.email), '' FROM auth.users u
JOIN public.user_roles r ON r.user_id = u.id
WHERE u.email IS NOT NULL
ON CONFLICT DO NOTHING;