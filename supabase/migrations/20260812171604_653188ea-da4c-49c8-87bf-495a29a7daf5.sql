CREATE OR REPLACE FUNCTION public.apply_booking_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone text;
  v_visits int;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    v_phone := regexp_replace(coalesce(NEW.customer_phone, ''), '[^0-9]', '', 'g');
    IF length(v_phone) > 10 THEN
      v_phone := right(v_phone, 10);
    END IF;

    IF length(v_phone) = 10 THEN
      INSERT INTO public.customers (phone, name, total_visits)
      VALUES (v_phone, coalesce(NULLIF(NEW.customer_name, ''), 'Guest'), 1)
      ON CONFLICT (phone) DO UPDATE
        SET total_visits = public.customers.total_visits + 1
      RETURNING total_visits INTO v_visits;

      UPDATE public.rewards
         SET status = 'used'
       WHERE booking_id = NEW.id
         AND status = 'available';

      IF v_visits % 5 = 0 THEN
        INSERT INTO public.rewards (phone, status) VALUES (v_phone, 'available');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_completion_loyalty ON public.bookings;
CREATE TRIGGER bookings_completion_loyalty
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.apply_booking_completion();