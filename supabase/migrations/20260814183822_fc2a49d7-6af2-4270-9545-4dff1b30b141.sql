CREATE OR REPLACE FUNCTION public.release_reward_on_booking_void()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('cancelled','expired') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.rewards
       SET booking_id = NULL
     WHERE booking_id = NEW.id
       AND status = 'available';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_reward_on_booking_void ON public.bookings;
CREATE TRIGGER trg_release_reward_on_booking_void
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.release_reward_on_booking_void();

-- free rewards stuck on cancelled/expired bookings
UPDATE public.rewards r
   SET booking_id = NULL
  FROM public.bookings b
 WHERE r.booking_id = b.id
   AND r.status = 'available'
   AND b.status IN ('cancelled','expired');