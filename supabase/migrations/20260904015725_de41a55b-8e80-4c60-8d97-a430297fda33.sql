CREATE TABLE public.cash_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  deposit_date date NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  paid_at time NOT NULL DEFAULT '00:00',
  deposit_to text NOT NULL DEFAULT 'cash' CHECK (deposit_to IN ('cash','bank')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_deposits TO authenticated;
GRANT ALL ON public.cash_deposits TO service_role;

ALTER TABLE public.cash_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage own branch deposits"
ON public.cash_deposits FOR ALL TO authenticated
USING (private.has_branch_access(auth.uid(), branch_id))
WITH CHECK (private.has_branch_access(auth.uid(), branch_id));

CREATE INDEX cash_deposits_branch_date_idx ON public.cash_deposits (branch_id, deposit_date);

CREATE TRIGGER update_cash_deposits_updated_at
BEFORE UPDATE ON public.cash_deposits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();