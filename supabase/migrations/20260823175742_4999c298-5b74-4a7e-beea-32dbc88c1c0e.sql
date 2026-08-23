GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

UPDATE public.customers c
SET created_at = b.first_seen
FROM (SELECT customer_phone, min(created_at) AS first_seen FROM public.bookings GROUP BY customer_phone) b
WHERE b.customer_phone = c.phone;