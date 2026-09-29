INSERT INTO public.site_media (key, label, media_type, url)
VALUES
  ('review_1_name', 'Player Feedback 1 — Name', 'text', 'Aarav M.'),
  ('review_1_role', 'Player Feedback 1 — Label', 'text', 'Weekend Regular'),
  ('review_1_text', 'Player Feedback 1 — Review', 'text', 'The setup genuinely feels like an esports arena. Zero lag, great screens and the seating is unreal for long sessions.'),
  ('review_2_name', 'Player Feedback 2 — Name', 'text', 'Sana K.'),
  ('review_2_role', 'Player Feedback 2 — Label', 'text', 'Squad Captain'),
  ('review_2_text', 'Player Feedback 2 — Review', 'text', 'We booked the multiplayer bay for a birthday clash — staff were quick, the snacks were hot and everyone left grinning.'),
  ('review_3_name', 'Player Feedback 3 — Name', 'text', 'Rohit V.'),
  ('review_3_role', 'Player Feedback 3 — Label', 'text', 'FC Player'),
  ('review_3_text', 'Player Feedback 3 — Review', 'text', 'Easily the cleanest, coolest gaming lounge I''ve been to in Hyderabad. The loyalty offer keeps pulling us back.')
ON CONFLICT (key) DO NOTHING;