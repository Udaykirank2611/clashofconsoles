DO $$ BEGIN
  CREATE TYPE public.coupon_category AS ENUM ('gaming', 'food', 'entire_bill');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS category public.coupon_category NOT NULL DEFAULT 'entire_bill';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS gaming_discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS food_discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bill_discount_amount numeric NOT NULL DEFAULT 0;