ALTER TABLE public.site_media DROP CONSTRAINT IF EXISTS site_media_media_type_check;
ALTER TABLE public.site_media ADD CONSTRAINT site_media_media_type_check CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text, 'text'::text]));

INSERT INTO public.site_media (key, label, media_type, url) VALUES
  ('gallery_1', 'Inside the Arena — photo 1 (tall, left)', 'image', NULL),
  ('gallery_2', 'Inside the Arena — photo 2', 'image', NULL),
  ('gallery_3', 'Inside the Arena — photo 3', 'image', NULL),
  ('gallery_4', 'Inside the Arena — photo 4 (tall, right)', 'image', NULL),
  ('gallery_5', 'Inside the Arena — photo 5 (wide, bottom)', 'image', NULL),
  ('google_rating', 'Google rating (e.g. 4.9)', 'text', NULL),
  ('google_rating_caption', 'Google badge caption (e.g. Rated on Google Maps)', 'text', NULL),
  ('google_reviews_url', 'Google reviews link (opens when badge is clicked)', 'text', NULL)
ON CONFLICT (key) DO NOTHING;