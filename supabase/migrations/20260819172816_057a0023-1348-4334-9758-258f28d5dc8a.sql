-- 1. Remove all anon (signed-out) privileges on sensitive PII/financial tables.
REVOKE ALL ON public.bookings FROM anon;
REVOKE ALL ON public.membership_passes FROM anon;
REVOKE ALL ON public.admin_notifications FROM anon;
REVOKE ALL ON public.booking_transactions FROM anon;
REVOKE ALL ON public.message_templates FROM anon;

-- 2. Narrow authenticated privileges to what the policies actually allow.
REVOKE ALL ON public.bookings FROM authenticated;
GRANT SELECT, UPDATE ON public.bookings TO authenticated;

REVOKE ALL ON public.membership_passes FROM authenticated;
GRANT SELECT ON public.membership_passes TO authenticated;

REVOKE ALL ON public.admin_notifications FROM authenticated;
GRANT SELECT, UPDATE ON public.admin_notifications TO authenticated;

REVOKE ALL ON public.booking_transactions FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.booking_transactions TO authenticated;

REVOKE ALL ON public.message_templates FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;

GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.membership_passes TO service_role;
GRANT ALL ON public.admin_notifications TO service_role;
GRANT ALL ON public.booking_transactions TO service_role;
GRANT ALL ON public.message_templates TO service_role;

-- 3. Message templates: replace the public-read policy with branch-scoped staff read.
DROP POLICY IF EXISTS "Message templates are readable" ON public.message_templates;
CREATE POLICY "Staff read message templates for their branch"
  ON public.message_templates FOR SELECT TO authenticated
  USING (private.has_branch_access(auth.uid(), branch_id));
