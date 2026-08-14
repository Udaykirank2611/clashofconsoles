-- 1. Experiences: owner-only writes
DROP POLICY IF EXISTS experiences_admin_all ON public.experiences;
CREATE POLICY experiences_owner_all ON public.experiences
  FOR ALL TO authenticated
  USING (private.is_owner(auth.uid()))
  WITH CHECK (private.is_owner(auth.uid()));

-- 2. Lock down SECURITY DEFINER functions in the exposed API schema
REVOKE EXECUTE ON FUNCTION public.apply_booking_completion() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_past_bookings() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_membership_passes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_bookings() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_slot_availability(uuid, date) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.issue_membership_passes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_booking_reference() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_pass_code(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_booking_created() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_booking_updated() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_reward_on_booking_void() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_branch_workspace() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_booking_transaction() FROM anon, authenticated;

-- Staff dashboard calls these two as the signed-in user
GRANT EXECUTE ON FUNCTION public.complete_past_bookings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_membership_passes() TO authenticated;

-- Server-side (service role) keeps full access
GRANT EXECUTE ON FUNCTION public.apply_booking_completion() TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_past_bookings() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_membership_passes() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_bookings() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_slot_availability(uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_membership_passes() TO service_role;
GRANT EXECUTE ON FUNCTION public.next_booking_reference() TO service_role;
GRANT EXECUTE ON FUNCTION public.next_pass_code(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_booking_created() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_booking_updated() TO service_role;
GRANT EXECUTE ON FUNCTION public.release_reward_on_booking_void() TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_branch_workspace() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_booking_transaction() TO service_role;