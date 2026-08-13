CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  coupon_code text NOT NULL,
  customer_phone text NOT NULL,
  discount_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, coupon_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read coupon redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated
  USING (private.has_branch_access(auth.uid(), branch_id));

CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_reference text,
  customer_phone text,
  amount numeric,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_notifications_branch_created_idx
  ON public.admin_notifications (branch_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read notifications" ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (private.has_branch_access(auth.uid(), branch_id));
CREATE POLICY "staff update notifications" ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (private.has_branch_access(auth.uid(), branch_id))
  WITH CHECK (private.has_branch_access(auth.uid(), branch_id));

CREATE OR REPLACE FUNCTION public.notify_booking_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_station text;
  v_food boolean;
BEGIN
  v_food := NEW.station_id IS NULL
        AND coalesce(NEW.session_amount,0) = 0
        AND coalesce(NEW.addons_amount,0) = 0
        AND coalesce(NEW.food_amount,0) > 0;

  SELECT s.name INTO v_station FROM public.gaming_stations s WHERE s.id = NEW.station_id;

  INSERT INTO public.admin_notifications (branch_id, type, title, body, booking_id, booking_reference, customer_phone, amount)
  VALUES (
    NEW.branch_id,
    CASE WHEN v_food THEN 'food_order' ELSE 'new_booking' END,
    CASE WHEN v_food THEN 'New Food Order' ELSE 'New Booking' END,
    NEW.customer_name
      || CASE WHEN v_food THEN '' ELSE ' · ' || coalesce(v_station, 'No station') END
      || ' · ' || to_char(NEW.booking_date, 'DD Mon')
      || CASE WHEN NEW.start_time IS NULL THEN '' ELSE ' ' || to_char(NEW.start_time, 'HH12:MI AM') END,
    NEW.id, NEW.reference, NEW.customer_phone, NEW.total_amount
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_notify_created
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_created();

CREATE OR REPLACE FUNCTION public.notify_booking_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_discount numeric;
BEGIN
  -- Payment / UTR submitted
  IF NEW.payment_utr IS NOT NULL AND OLD.payment_utr IS DISTINCT FROM NEW.payment_utr THEN
    INSERT INTO public.admin_notifications (branch_id, type, title, body, booking_id, booking_reference, customer_phone, amount)
    VALUES (NEW.branch_id, 'payment', 'Payment Verification Required',
      NEW.customer_name || ' · UTR ' || NEW.payment_utr,
      NEW.id, NEW.reference, NEW.customer_phone, NEW.total_amount);
  END IF;

  -- Cancelled / rejected
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    INSERT INTO public.admin_notifications (branch_id, type, title, body, booking_id, booking_reference, customer_phone, amount)
    VALUES (NEW.branch_id, 'cancelled', 'Booking Cancelled',
      NEW.customer_name || ' · ' || to_char(NEW.booking_date, 'DD Mon'),
      NEW.id, NEW.reference, NEW.customer_phone, NEW.total_amount);
  END IF;

  -- Completed: record coupon redemption + loyalty reward notice
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
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

-- Name sorts after bookings_completion_loyalty so reward status is already applied.
CREATE TRIGGER bookings_notify_updated
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_updated();