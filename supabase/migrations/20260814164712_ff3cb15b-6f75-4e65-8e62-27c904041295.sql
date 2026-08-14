CREATE TABLE public.daily_closing_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  closed_by uuid,
  closed_by_email text,
  notes text NOT NULL DEFAULT '',
  total_bookings integer NOT NULL DEFAULT 0,
  completed_bookings integer NOT NULL DEFAULT 0,
  cancelled_bookings integer NOT NULL DEFAULT 0,
  pending_bookings integer NOT NULL DEFAULT 0,
  total_customers integer NOT NULL DEFAULT 0,
  gaming_revenue numeric NOT NULL DEFAULT 0,
  food_revenue numeric NOT NULL DEFAULT 0,
  membership_revenue numeric NOT NULL DEFAULT 0,
  coupon_discounts numeric NOT NULL DEFAULT 0,
  student_discounts numeric NOT NULL DEFAULT 0,
  cash_revenue numeric NOT NULL DEFAULT 0,
  upi_revenue numeric NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (branch_id, report_date)
);

GRANT SELECT, INSERT, UPDATE ON public.daily_closing_reports TO authenticated;
GRANT ALL ON public.daily_closing_reports TO service_role;

ALTER TABLE public.daily_closing_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read closing reports for their branch"
  ON public.daily_closing_reports FOR SELECT TO authenticated
  USING (private.has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff save closing reports for their branch"
  ON public.daily_closing_reports FOR INSERT TO authenticated
  WITH CHECK (private.has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff update closing reports for their branch"
  ON public.daily_closing_reports FOR UPDATE TO authenticated
  USING (private.has_branch_access(auth.uid(), branch_id))
  WITH CHECK (private.has_branch_access(auth.uid(), branch_id));

CREATE INDEX daily_closing_reports_branch_date_idx
  ON public.daily_closing_reports (branch_id, report_date DESC);

CREATE TRIGGER daily_closing_reports_updated_at
  BEFORE UPDATE ON public.daily_closing_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();