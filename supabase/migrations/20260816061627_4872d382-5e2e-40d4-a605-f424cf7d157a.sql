CREATE TABLE public.site_media (
  key text PRIMARY KEY,
  label text NOT NULL DEFAULT '',
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_media TO authenticated;
GRANT ALL ON public.site_media TO service_role;

ALTER TABLE public.site_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_media public read" ON public.site_media FOR SELECT USING (true);
CREATE POLICY "site_media owner write" ON public.site_media FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER update_site_media_updated_at BEFORE UPDATE ON public.site_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_media (key, label, media_type, url) VALUES
  ('hero_background', 'Home page hero background (behind the logo)', 'image', NULL),
  ('food_banner', 'Food banner (menu page & booking food step)', 'image', NULL);