CREATE TABLE public.group_pass_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  label text NOT NULL,
  duration_minutes integer NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, duration_minutes)
);

GRANT SELECT ON public.group_pass_rates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_pass_rates TO authenticated;
GRANT ALL ON public.group_pass_rates TO service_role;

ALTER TABLE public.group_pass_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_pass_rates public read" ON public.group_pass_rates
  FOR SELECT USING (true);

CREATE POLICY "group_pass_rates branch write" ON public.group_pass_rates
  FOR ALL TO authenticated
  USING (private.has_branch_access(auth.uid(), branch_id))
  WITH CHECK (private.has_branch_access(auth.uid(), branch_id));

CREATE TRIGGER group_pass_rates_updated_at
  BEFORE UPDATE ON public.group_pass_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.group_pass_rates (branch_id, label, duration_minutes, price, sort_order)
SELECT b.id, x.label, x.minutes, x.price, x.ord
FROM public.branches b
CROSS JOIN (VALUES ('1 Hour', 60, 800, 1), ('2 Hours', 120, 1400, 2), ('3 Hours', 180, 1600, 3))
  AS x(label, minutes, price, ord);

ALTER TABLE public.bookings
  ADD COLUMN booking_type text NOT NULL DEFAULT 'single',
  ADD COLUMN group_members integer NOT NULL DEFAULT 0;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_booking_type_check CHECK (booking_type IN ('single','group'));