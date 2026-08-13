DROP POLICY IF EXISTS "admins manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "experience_rates_admin_all" ON public.experience_rates;
DROP POLICY IF EXISTS "membership_admin_all" ON public.membership_plans;
DROP POLICY IF EXISTS "site_offers_admin_all" ON public.site_offers;

CREATE OR REPLACE FUNCTION private.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = _user_id AND r.role = 'owner'
  );
$$;

DROP POLICY IF EXISTS "staff manage customers" ON public.customers;
CREATE POLICY "owners manage customers" ON public.customers
  FOR ALL TO authenticated
  USING (private.is_owner(auth.uid()))
  WITH CHECK (private.is_owner(auth.uid()));

DROP POLICY IF EXISTS "staff manage rewards" ON public.rewards;
CREATE POLICY "owners manage rewards" ON public.rewards
  FOR ALL TO authenticated
  USING (private.is_owner(auth.uid()))
  WITH CHECK (private.is_owner(auth.uid()));