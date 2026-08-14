CREATE TYPE public.pass_kind AS ENUM ('bronze','silver','gold','membership','combo','unlimited');

CREATE TABLE public.membership_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  phone text NOT NULL,
  customer_name text NOT NULL,
  pass_type public.pass_kind NOT NULL,
  plan_name text NOT NULL,
  source_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_on date NOT NULL,
  total_minutes integer,
  remaining_minutes integer,
  total_uses integer,
  remaining_uses integer,
  price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.membership_passes TO authenticated;
GRANT ALL ON public.membership_passes TO service_role;

ALTER TABLE public.membership_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read passes for their branch"
ON public.membership_passes FOR SELECT TO authenticated
USING (private.has_branch_access(auth.uid(), branch_id));

CREATE TRIGGER membership_passes_updated_at
BEFORE UPDATE ON public.membership_passes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX membership_passes_phone_idx ON public.membership_passes (phone);
CREATE INDEX membership_passes_branch_idx ON public.membership_passes (branch_id);

ALTER TABLE public.bookings
  ADD COLUMN pass_id uuid REFERENCES public.membership_passes(id) ON DELETE SET NULL,
  ADD COLUMN pass_minutes integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.next_pass_code(_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := 'COC-' || _prefix || '-';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.membership_passes p WHERE p.code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_membership_passes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  it record;
  n int;
  v_type public.pass_kind;
  v_prefix text;
  v_hours numeric;
  v_expires date;
  v_minutes int;
  v_uses int;
  v_label text;
BEGIN
  IF NEW.status NOT IN ('confirmed','completed') THEN RETURN NEW; END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.membership_passes p WHERE p.source_booking_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  FOR it IN
    SELECT label, quantity, unit_price
    FROM public.booking_items
    WHERE booking_id = NEW.id AND kind = 'addon' AND station_id IS NULL
  LOOP
    v_label := lower(it.label);

    IF v_label LIKE '%bronze%' THEN v_type := 'bronze'; v_prefix := 'BR';
    ELSIF v_label LIKE '%silver%' THEN v_type := 'silver'; v_prefix := 'SL';
    ELSIF v_label LIKE '%gold%' THEN v_type := 'gold'; v_prefix := 'GD';
    ELSIF v_label LIKE '%combo%' THEN v_type := 'combo'; v_prefix := 'CB';
    ELSIF v_label LIKE '%unlimited%' THEN v_type := 'unlimited'; v_prefix := 'UP';
    ELSIF v_label LIKE '%member%' THEN v_type := 'membership'; v_prefix := 'MB';
    ELSE CONTINUE;
    END IF;

    v_hours := NULL;
    SELECT mp.hours_included INTO v_hours
    FROM public.membership_plans mp
    WHERE mp.branch_id = NEW.branch_id
      AND lower(it.label) LIKE '%' || lower(mp.name) || '%'
    ORDER BY length(mp.name) DESC
    LIMIT 1;

    IF v_type = 'combo' THEN
      v_expires := NEW.booking_date;
      v_minutes := NULL;
      v_uses := 1;
    ELSIF v_type = 'unlimited' THEN
      v_expires := (now() AT TIME ZONE 'Asia/Kolkata')::date + 30;
      v_minutes := NULL;
      v_uses := NULL;
    ELSE
      v_expires := (now() AT TIME ZONE 'Asia/Kolkata')::date + 30;
      v_minutes := (coalesce(v_hours, 0) * 60)::int;
      v_uses := NULL;
    END IF;

    FOR n IN 1..greatest(it.quantity, 1) LOOP
      INSERT INTO public.membership_passes (
        code, branch_id, phone, customer_name, pass_type, plan_name, source_booking_id,
        expires_on, total_minutes, remaining_minutes, total_uses, remaining_uses, price, status
      ) VALUES (
        public.next_pass_code(v_prefix), NEW.branch_id, NEW.customer_phone, NEW.customer_name,
        v_type, it.label, NEW.id, v_expires, v_minutes, v_minutes, v_uses, v_uses,
        coalesce(it.unit_price, 0), 'active'
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_issue_passes
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.issue_membership_passes();

CREATE OR REPLACE FUNCTION public.expire_membership_passes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.membership_passes
     SET status = 'expired'
   WHERE status = 'active'
     AND expires_on < (now() AT TIME ZONE 'Asia/Kolkata')::date;
$$;