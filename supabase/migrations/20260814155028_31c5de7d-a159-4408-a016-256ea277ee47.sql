ALTER TYPE public.reward_status ADD VALUE IF NOT EXISTS 'expired';

ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS earned_at_visit integer,
  ADD COLUMN IF NOT EXISTS expires_at_visit integer,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reward_minutes integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.apply_booking_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_visits int;
  v_minutes int;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    v_phone := regexp_replace(coalesce(NEW.customer_phone, ''), '[^0-9]', '', 'g');
    IF length(v_phone) > 10 THEN
      v_phone := right(v_phone, 10);
    END IF;

    IF length(v_phone) = 10 THEN
      -- A reward attached to this booking is consumed on completion.
      UPDATE public.rewards
         SET status = 'used'
       WHERE booking_id = NEW.id
         AND status = 'available';

      -- Only gaming visits (a console session) count towards milestones.
      IF NEW.station_id IS NOT NULL THEN
        INSERT INTO public.customers (phone, name, total_visits)
        VALUES (v_phone, coalesce(NULLIF(NEW.customer_name, ''), 'Guest'), 1)
        ON CONFLICT (phone) DO UPDATE
          SET total_visits = public.customers.total_visits + 1
        RETURNING total_visits INTO v_visits;

        IF v_visits % 5 = 0 THEN
          -- Never hold two milestone rewards: expire anything still unused.
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
$function$;