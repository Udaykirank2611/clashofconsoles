CREATE TABLE public.game_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  accent text NOT NULL DEFAULT 'pink',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.game_section_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.game_sections(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL DEFAULT '',
  badge text NOT NULL DEFAULT '',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX game_section_items_section_idx ON public.game_section_items(section_id);

GRANT SELECT ON public.game_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_sections TO authenticated;
GRANT ALL ON public.game_sections TO service_role;

GRANT SELECT ON public.game_section_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_section_items TO authenticated;
GRANT ALL ON public.game_section_items TO service_role;

ALTER TABLE public.game_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_section_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_sections public read" ON public.game_sections FOR SELECT USING (true);
CREATE POLICY "game_sections staff write" ON public.game_sections FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'owner'::app_role) OR private.has_role(auth.uid(), 'branch_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'owner'::app_role) OR private.has_role(auth.uid(), 'branch_admin'::app_role));

CREATE POLICY "game_section_items public read" ON public.game_section_items FOR SELECT USING (true);
CREATE POLICY "game_section_items staff write" ON public.game_section_items FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'owner'::app_role) OR private.has_role(auth.uid(), 'branch_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'owner'::app_role) OR private.has_role(auth.uid(), 'branch_admin'::app_role));

CREATE TRIGGER update_game_sections_updated_at BEFORE UPDATE ON public.game_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_game_section_items_updated_at BEFORE UPDATE ON public.game_section_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.game_sections (id, title, subtitle, accent, sort_order) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Top 10 This Month', 'The titles our floor cannot stop playing', 'pink', 1),
  ('22222222-2222-4222-8222-222222222222', 'Party Favourites', 'Best played with four controllers and zero mercy', 'violet', 2),
  ('33333333-3333-4333-8333-333333333333', 'Racing & Cockpit', 'Wheel, pedals and a whole lot of tyre smoke', 'cyan', 3),
  ('44444444-4444-4444-8444-444444444444', 'VR Arena Picks', 'Step inside — headset on, reality off', 'primary', 4);

INSERT INTO public.game_section_items (section_id, name, platform, badge, sort_order) VALUES
  ('11111111-1111-4111-8111-111111111111', 'EA FC 25', 'PS5', '#1', 1),
  ('11111111-1111-4111-8111-111111111111', 'Call of Duty: Modern Warfare III', 'PS5', '#2', 2),
  ('11111111-1111-4111-8111-111111111111', 'Mortal Kombat 1', 'PS5', '#3', 3),
  ('11111111-1111-4111-8111-111111111111', 'WWE 2K24', 'PS5', '#4', 4),
  ('11111111-1111-4111-8111-111111111111', 'Cricket 24', 'PS5', '#5', 5),
  ('11111111-1111-4111-8111-111111111111', 'GTA V', 'PS5', '#6', 6),
  ('11111111-1111-4111-8111-111111111111', 'Tekken 8', 'PS5', '#7', 7),
  ('11111111-1111-4111-8111-111111111111', 'Gran Turismo 7', 'Racing', '#8', 8),
  ('11111111-1111-4111-8111-111111111111', 'Spider-Man 2', 'PS5', '#9', 9),
  ('11111111-1111-4111-8111-111111111111', 'Fortnite', 'PS5', '#10', 10),
  ('22222222-2222-4222-8222-222222222222', 'EA FC 25', 'PS5', '4 players', 1),
  ('22222222-2222-4222-8222-222222222222', 'Mortal Kombat 1', 'PS5', 'Versus', 2),
  ('22222222-2222-4222-8222-222222222222', 'WWE 2K24', 'PS5', 'Tag team', 3),
  ('22222222-2222-4222-8222-222222222222', 'It Takes Two', 'PS5', 'Co-op', 4),
  ('33333333-3333-4333-8333-333333333333', 'Assetto Corsa Competizione', 'Racing', 'Sim', 1),
  ('33333333-3333-4333-8333-333333333333', 'F1 24', 'Racing', 'Cockpit', 2),
  ('33333333-3333-4333-8333-333333333333', 'Need for Speed Unbound', 'Racing', 'Arcade', 3),
  ('33333333-3333-4333-8333-333333333333', 'Asphalt Legends', 'Racing', 'Casual', 4),
  ('44444444-4444-4444-8444-444444444444', 'Beat Saber', 'VR', 'Rhythm', 1),
  ('44444444-4444-4444-8444-444444444444', 'Superhot VR', 'VR', 'Action', 2),
  ('44444444-4444-4444-8444-444444444444', 'Half-Life: Alyx', 'VR', 'Story', 3),
  ('44444444-4444-4444-8444-444444444444', 'Richie''s Plank Experience', 'VR', 'Party', 4);