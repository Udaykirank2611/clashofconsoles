UPDATE public.pricing_rates AS pr
SET price = v.price,
    updated_at = now()
FROM (
  VALUES
    (1, 60, 200::numeric),
    (1, 120, 300::numeric),
    (1, 180, 450::numeric),
    (2, 60, 250::numeric),
    (2, 120, 400::numeric),
    (2, 180, 600::numeric),
    (3, 60, 300::numeric),
    (3, 120, 500::numeric),
    (3, 180, 750::numeric),
    (4, 60, 350::numeric),
    (4, 120, 600::numeric),
    (4, 180, 900::numeric)
) AS v(players, duration_minutes, price)
WHERE pr.players = v.players
  AND pr.duration_minutes = v.duration_minutes;

UPDATE public.pricing_rates
SET price = CASE players
  WHEN 1 THEN 100
  WHEN 2 THEN 125
  WHEN 3 THEN 150
  WHEN 4 THEN 175
END,
updated_at = now()
WHERE duration_minutes = 30
  AND players BETWEEN 1 AND 4;