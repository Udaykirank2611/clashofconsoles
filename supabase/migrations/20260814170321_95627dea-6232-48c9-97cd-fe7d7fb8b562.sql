CREATE TABLE public.booking_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  transaction_status text NOT NULL DEFAULT 'pending',
  booking_source text NOT NULL DEFAULT 'website',
  upi_provider text,
  cash_amount numeric NOT NULL DEFAULT 0,
  upi_amount numeric NOT NULL DEFAULT 0,
  admin_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_transactions TO authenticated;
GRANT ALL ON public.booking_transactions TO service_role;
ALTER TABLE public.booking_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read own branch transactions" ON public.booking_transactions
  FOR SELECT TO authenticated USING (private.has_branch_access(auth.uid(), branch_id));
CREATE POLICY "Staff insert own branch transactions" ON public.booking_transactions
  FOR INSERT TO authenticated WITH CHECK (private.has_branch_access(auth.uid(), branch_id));
CREATE POLICY "Staff update own branch transactions" ON public.booking_transactions
  FOR UPDATE TO authenticated USING (private.has_branch_access(auth.uid(), branch_id))
  WITH CHECK (private.has_branch_access(auth.uid(), branch_id));

CREATE INDEX booking_transactions_branch_idx ON public.booking_transactions (branch_id);

CREATE TABLE public.daily_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  expense_date date NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  paid_at time NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::time,
  paid_from text NOT NULL DEFAULT 'cash',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_expenses TO authenticated;
GRANT ALL ON public.daily_expenses TO service_role;
ALTER TABLE public.daily_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage own branch expenses" ON public.daily_expenses
  FOR ALL TO authenticated USING (private.has_branch_access(auth.uid(), branch_id))
  WITH CHECK (private.has_branch_access(auth.uid(), branch_id));

CREATE INDEX daily_expenses_branch_date_idx ON public.daily_expenses (branch_id, expense_date);

CREATE TABLE public.daily_opening_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  balance_date date NOT NULL,
  opening_cash numeric NOT NULL DEFAULT 0,
  opening_bank numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, balance_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_opening_balances TO authenticated;
GRANT ALL ON public.daily_opening_balances TO service_role;
ALTER TABLE public.daily_opening_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage own branch balances" ON public.daily_opening_balances
  FOR ALL TO authenticated USING (private.has_branch_access(auth.uid(), branch_id))
  WITH CHECK (private.has_branch_access(auth.uid(), branch_id));

CREATE TRIGGER booking_transactions_updated_at BEFORE UPDATE ON public.booking_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER daily_expenses_updated_at BEFORE UPDATE ON public.daily_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER daily_opening_balances_updated_at BEFORE UPDATE ON public.daily_opening_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_booking_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
  v_source text;
  v_cash numeric := 0;
  v_upi numeric := 0;
BEGIN
  IF NEW.status NOT IN ('confirmed','completed','cancelled') THEN
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

  IF NEW.status <> 'cancelled' THEN
    IF NEW.payment_mode = 'cash' THEN v_cash := coalesce(NEW.total_amount, 0);
    ELSIF NEW.payment_mode = 'upi' THEN v_upi := coalesce(NEW.total_amount, 0);
    END IF;
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
$$;

CREATE TRIGGER bookings_sync_transaction
AFTER INSERT OR UPDATE OF status, payment_mode, total_amount ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_booking_transaction();

INSERT INTO public.booking_transactions (booking_id, branch_id, transaction_status, booking_source, cash_amount, upi_amount)
SELECT b.id, b.branch_id,
  CASE WHEN b.status = 'completed' THEN 'completed' WHEN b.status = 'cancelled' THEN 'cancelled' ELSE 'pending' END,
  CASE WHEN b.pass_id IS NOT NULL THEN 'membership' WHEN b.coupon_id IS NOT NULL THEN 'coupon' ELSE 'website' END,
  CASE WHEN b.status <> 'cancelled' AND b.payment_mode = 'cash' THEN coalesce(b.total_amount,0) ELSE 0 END,
  CASE WHEN b.status <> 'cancelled' AND b.payment_mode = 'upi' THEN coalesce(b.total_amount,0) ELSE 0 END
FROM public.bookings b
WHERE b.status IN ('confirmed','completed','cancelled')
ON CONFLICT (booking_id) DO NOTHING;