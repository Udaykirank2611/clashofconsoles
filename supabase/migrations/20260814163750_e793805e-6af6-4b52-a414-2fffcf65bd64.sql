REVOKE EXECUTE ON FUNCTION public.next_pass_code(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_membership_passes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.issue_membership_passes() FROM anon, authenticated;