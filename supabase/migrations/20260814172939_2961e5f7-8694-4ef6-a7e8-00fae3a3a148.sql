-- TEST MODE: count loyalty visits / rewards as soon as a booking is confirmed.
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
  IF NEW.status IN ('confirmed','completed')
     AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('confirmed','completed')) THEN
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

DROP TRIGGER IF EXISTS bookings_completion_loyalty ON public.bookings;
CREATE TRIGGER bookings_completion_loyalty
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.apply_booking_completion();

-- TEST MODE: record coupon redemptions + reward notices at confirmation time too.
CREATE OR REPLACE FUNCTION public.notify_booking_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discount numeric;
BEGIN
  IF NEW.payment_utr IS NOT NULL AND OLD.payment_utr IS DISTINCT FROM NEW.payment_utr THEN
    INSERT INTO public.admin_notifications (branch_id, type, title, body, booking_id, booking_reference, customer_phone, amount)
    VALUES (NEW.branch_id, 'payment', 'Payment Verification Required',
      NEW.customer_name || ' · UTR ' || NEW.payment_utr,
      NEW.id, NEW.reference, NEW.customer_phone, NEW.total_amount);
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    INSERT INTO public.admin_notifications (branch_id, type, title, body, booking_id, booking_reference, customer_phone, amount)
    VALUES (NEW.branch_id, 'cancelled', 'Booking Cancelled',
      NEW.customer_name || ' · ' || to_char(NEW.booking_date, 'DD Mon'),
      NEW.id, NEW.reference, NEW.customer_phone, NEW.total_amount);
  END IF;

  IF NEW.status IN ('confirmed','completed') AND OLD.status NOT IN ('confirmed','completed') THEN
    IF NEW.coupon_id IS NOT NULL THEN
      v_discount := coalesce(NEW.gaming_discount_amount,0) + coalesce(NEW.food_discount_amount,0) + coalesce(NEW.bill_discount_amount,0);

      INSERT INTO public.coupon_redemptions (coupon_id, branch_id, booking_id, coupon_code, customer_phone, discount_amount)
      VALUES (NEW.coupon_id, NEW.branch_id, NEW.id, coalesce(NEW.coupon_code, ''), NEW.customer_phone, v_discount)
      ON CONFLICT (booking_id, coupon_id) DO NOTHING;

      IF FOUND THEN
        UPDATE public.coupons SET used_count = used_count + 1 WHERE id = NEW.coupon_id;

        INSERT INTO public.admin_notifications (branch_id, type, title, body, booking_id, booking_reference, customer_phone, amount)
        VALUES (NEW.branch_id, 'coupon', 'Coupon Redeemed',
          coalesce(NEW.coupon_code, 'Coupon') || ' · ₹' || round(v_discount)::text || ' off',
          NEW.id, NEW.reference, NEW.customer_phone, v_discount);
      END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM public.rewards r WHERE r.booking_id = NEW.id AND r.status = 'used') THEN
      INSERT INTO public.admin_notifications (branch_id, type, title, body, booking_id, booking_reference, customer_phone, amount)
      VALUES (NEW.branch_id, 'reward', 'Loyalty Reward Redeemed',
        'Free 30 minute reward used', NEW.id, NEW.reference, NEW.customer_phone, NULL);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;