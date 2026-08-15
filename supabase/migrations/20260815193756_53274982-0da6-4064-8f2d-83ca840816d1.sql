CREATE OR REPLACE FUNCTION public.apply_booking_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_visits int;
  v_next int;
  v_minutes int;
  v_is_gaming boolean;
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

      -- Any played session counts as a visit: console, experience add-on
      -- (cockpit / VR / snooker / theatre / lounge) or a whole-cafe group booking.
      v_is_gaming := NEW.station_id IS NOT NULL
        OR coalesce(NEW.booking_type, '') = 'group'
        OR EXISTS (
             SELECT 1 FROM public.booking_items bi
              WHERE bi.booking_id = NEW.id
                AND bi.kind = 'addon'
           );

      IF v_is_gaming THEN
        INSERT INTO public.customers (phone, name, total_visits)
        VALUES (v_phone, coalesce(NULLIF(NEW.customer_name, ''), 'Guest'), 1)
        ON CONFLICT (phone) DO UPDATE
          SET total_visits = public.customers.total_visits + 1
        RETURNING total_visits INTO v_visits;

        -- The reward is granted one visit early so it can be used DURING the
        -- milestone visit itself (5th visit free 30 min, 10th visit free 1 hour).
        v_next := v_visits + 1;
        IF v_next % 5 = 0 THEN
          UPDATE public.rewards
             SET status = 'expired'
           WHERE phone = v_phone
             AND status = 'available';

          v_minutes := CASE WHEN v_next % 10 = 0 THEN 60 ELSE 30 END;
          INSERT INTO public.rewards (phone, status, minutes, earned_at_visit, expires_at_visit)
          VALUES (v_phone, 'available', v_minutes, v_visits, v_next + 5);
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

-- Backfill: customers who are one visit away from a milestone should already hold the reward.
INSERT INTO public.rewards (phone, status, minutes, earned_at_visit, expires_at_visit)
SELECT c.phone,
       'available'::reward_status,
       CASE WHEN (c.total_visits + 1) % 10 = 0 THEN 60 ELSE 30 END,
       c.total_visits,
       c.total_visits + 6
  FROM public.customers c
 WHERE (c.total_visits + 1) % 5 = 0
   AND NOT EXISTS (
     SELECT 1 FROM public.rewards r
      WHERE r.phone = c.phone AND r.status = 'available'
   );