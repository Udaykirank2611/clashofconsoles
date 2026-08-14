ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_mode text;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_payment_mode_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_mode_check
  CHECK (payment_mode IS NULL OR payment_mode IN ('upi', 'cash'));