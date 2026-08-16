-- Update Silver Tier perks
UPDATE public.homepage_cards
SET features = ARRAY['10 hours of console play', 'Use across any available PS5', 'Priority walk-in seating', 'Early access to newly added games']
WHERE title = 'Silver' AND kind = 'membership';

-- Update Gold Tier perks
UPDATE public.homepage_cards
SET features = ARRAY['20 hours of console play', 'Use across any available PS5', 'Priority slot booking', 'Early access to newly added games', 'Instant booking confirmation priority']
WHERE title = 'Gold' AND kind = 'membership';