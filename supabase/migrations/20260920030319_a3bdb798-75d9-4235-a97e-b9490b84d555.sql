CREATE TABLE public.branch_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  holiday_date date NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, holiday_date)
);

GRANT SELECT ON public.branch_holidays TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_holidays TO authenticated;
GRANT ALL ON public.branch_holidays TO service_role;

ALTER TABLE public.branch_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Holidays are viewable by everyone"
  ON public.branch_holidays FOR SELECT
  USING (true);

CREATE POLICY "Staff manage holidays for their branch"
  ON public.branch_holidays FOR ALL
  TO authenticated
  USING (
    private.has_branch_access(auth.uid(), branch_id)
  )
  WITH CHECK (
    private.has_branch_access(auth.uid(), branch_id)
  );

CREATE TRIGGER update_branch_holidays_updated_at
  BEFORE UPDATE ON public.branch_holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();