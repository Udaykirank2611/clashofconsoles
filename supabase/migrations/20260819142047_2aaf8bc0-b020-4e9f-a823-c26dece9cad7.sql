CREATE OR REPLACE FUNCTION public.sync_booking_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
  v_source text;
  v_cash numeric := 0;
  v_upi numeric := 0;
  v_prev_cash numeric := 0;
  v_prev_upi numeric := 0;
  v_prev numeric := 0;
  v_total numeric := 0;
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

  v_total := coalesce(NEW.total_amount, 0);

  SELECT coalesce(cash_amount, 0), coalesce(upi_amount, 0)
    INTO v_prev_cash, v_prev_upi
    FROM public.booking_transactions
   WHERE booking_id = NEW.id;
  v_prev := coalesce(v_prev_cash, 0) + coalesce(v_prev_upi, 0);

  IF NEW.status = 'cancelled' THEN
    v_cash := 0;
    v_upi := 0;
  ELSIF v_prev > 0 THEN
    -- An explicit cash/UPI split was recorded by staff: keep that split and
    -- rescale it to the current bill so the ledger always matches the total.
    v_cash := round(v_total * v_prev_cash / v_prev);
    v_upi := v_total - v_cash;
  ELSIF NEW.payment_mode = 'cash' THEN
    v_cash := v_total;
  ELSIF NEW.payment_mode = 'upi' THEN
    v_upi := v_total;
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
$function$;