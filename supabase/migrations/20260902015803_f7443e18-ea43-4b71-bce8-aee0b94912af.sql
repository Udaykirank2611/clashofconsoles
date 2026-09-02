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
  v_days int;
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
    v_days := NULL;
    SELECT mp.hours_included,
           NULLIF(regexp_replace(coalesce(mp.validity, ''), '[^0-9]', '', 'g'), '')::int
      INTO v_hours, v_days
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
      v_expires := (now() AT TIME ZONE 'Asia/Kolkata')::date + coalesce(v_days, 15);
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