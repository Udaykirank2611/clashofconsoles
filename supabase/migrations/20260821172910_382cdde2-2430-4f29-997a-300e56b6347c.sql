DROP POLICY IF EXISTS "admins read branches" ON public.branches;
CREATE POLICY "admins read branches" ON public.branches
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'owner'::app_role) OR private.has_branch_access(auth.uid(), id));

DROP POLICY IF EXISTS "admins read menu" ON public.menu_items;
CREATE POLICY "admins read menu" ON public.menu_items
FOR SELECT TO authenticated
USING ((branch_id IS NULL AND private.has_role(auth.uid(), 'owner'::app_role)) OR private.has_branch_access(auth.uid(), branch_id));