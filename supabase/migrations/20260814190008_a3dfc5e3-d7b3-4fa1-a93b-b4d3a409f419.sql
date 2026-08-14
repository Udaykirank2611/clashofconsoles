
-- 1. Auto-complete past bookings (IST clock)
CREATE OR REPLACE FUNCTION public.complete_past_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
     SET status = 'completed', updated_at = now()
   WHERE status = 'confirmed'
     AND station_id IS NOT NULL
     AND end_time IS NOT NULL
     AND (booking_date + end_time) <= (now() AT TIME ZONE 'Asia/Kolkata');
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_past_bookings() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.expire_stale_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
     SET status = 'expired', updated_at = now()
   WHERE status = 'awaiting_payment'
     AND payment_expires_at IS NOT NULL
     AND payment_expires_at < now();

  PERFORM public.complete_past_bookings();
END;
$$;

-- 2. Loyalty only on completion
CREATE OR REPLACE FUNCTION public.apply_booking_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_visits int;
  v_minutes int;
BEGIN
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    v_phone := regexp_replace(coalesce(NEW.customer_phone, ''), '[^0-9]', '', 'g');
    IF length(v_phone) > 10 THEN
      v_phone := right(v_phone, 10);
    END IF;

    IF length(v_phone) = 10 THEN
      UPDATE public.rewards
         SET status = 'used'
       WHERE booking_id = NEW.id
         AND status = 'available';

      IF NEW.station_id IS NOT NULL THEN
        INSERT INTO public.customers (phone, name, total_visits)
        VALUES (v_phone, coalesce(NULLIF(NEW.customer_name, ''), 'Guest'), 1)
        ON CONFLICT (phone) DO UPDATE
          SET total_visits = public.customers.total_visits + 1
        RETURNING total_visits INTO v_visits;

        IF v_visits % 5 = 0 THEN
          UPDATE public.rewards
             SET status = 'expired'
           WHERE phone = v_phone
             AND status = 'available';

          v_minutes := CASE WHEN v_visits % 10 = 0 THEN 60 ELSE 30 END;
          INSERT INTO public.rewards (phone, status, minutes, earned_at_visit, expires_at_visit)
          VALUES (v_phone, 'available', v_minutes, v_visits, v_visits + 5);
        END IF;
      ELSE
        INSERT INTO public.customers (phone, name, total_visits)
        VALUES (v_phone, coalesce(NULLIF(NEW.customer_name, ''), 'Guest'), 0)
        ON CONFLICT (phone) DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Ledger: gaming bookings only after the session ends; pass/food-only immediately
CREATE OR REPLACE FUNCTION public.sync_booking_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_source text;
  v_cash numeric := 0;
  v_upi numeric := 0;
BEGIN
  IF NEW.status NOT IN ('confirmed','completed','cancelled') THEN
    RETURN NEW;
  END IF;

  -- A confirmed gaming session is not realised until its end time has passed.
  IF NEW.status = 'confirmed'
     AND NEW.station_id IS NOT NULL
     AND (NEW.end_time IS NULL
          OR (NEW.booking_date + NEW.end_time) > (now() AT TIME ZONE 'Asia/Kolkata')) THEN
    RETURN NEW;
  END IF;

  v_status := CASE
    WHEN NEW.status = 'completed' THEN 'completed'
    WHEN NEW.status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END;

  v_source := CASE
    WHEN NEW.pass_id IS NOT NULL THEN 'membership'
    WHEN NEW.coupon_id IS NOT NULL THEN 'coupon'
    ELSE 'website'
  END;

  IF NEW.status <> 'cancelled' THEN
    IF NEW.payment_mode = 'cash' THEN v_cash := coalesce(NEW.total_amount, 0);
    ELSIF NEW.payment_mode = 'upi' THEN v_upi := coalesce(NEW.total_amount, 0);
    END IF;
  END IF;

  INSERT INTO public.booking_transactions (booking_id, branch_id, transaction_status, booking_source, cash_amount, upi_amount)
  VALUES (NEW.id, NEW.branch_id, v_status, v_source, v_cash, v_upi)
  ON CONFLICT (booking_id) DO UPDATE
    SET transaction_status = CASE
          WHEN public.booking_transactions.transaction_status = 'refunded' THEN 'refunded'
          ELSE excluded.transaction_status END,
        cash_amount = excluded.cash_amount,
        upi_amount = excluded.upi_amount,
        updated_at = now();

  RETURN NEW;
END;
$$;
