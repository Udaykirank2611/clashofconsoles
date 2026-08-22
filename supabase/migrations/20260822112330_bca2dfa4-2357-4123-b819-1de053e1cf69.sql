CREATE OR REPLACE FUNCTION public.expire_stale_bookings()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.bookings
     SET status = 'expired', updated_at = now()
   WHERE status = 'awaiting_payment'
     AND payment_expires_at IS NOT NULL
     AND payment_expires_at < now();
END;
$function$;