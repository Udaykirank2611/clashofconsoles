import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AdminRole {
  role: "owner" | "branch_admin";
  branch_id: string | null;
}

export interface AdminBranch {
  id: string;
  name: string;
  slug: string;
  city: string;
  tax_percent: number;
}

export interface AdminSession {
  loading: boolean;
  session: Session | null;
  roles: AdminRole[];
  branches: AdminBranch[];
  branchId: string | null;
  setBranchId: (id: string) => void;
  isOwner: boolean;
  signOut: () => Promise<void>;
}

/** Session + branch scope for the admin dashboard. */
export function useAdminSession(): AdminSession {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async (s: Session | null) => {
      if (!active) return;
      setSession(s);
      if (!s) {
        setRoles([]);
        setBranches([]);
        setLoading(false);
        return;
      }
      const [{ data: roleRows }, { data: branchRows }] = await Promise.all([
        supabase.from("user_roles").select("role, branch_id").eq("user_id", s.user.id),
        supabase.from("branches").select("id, name, slug, city, tax_percent").order("sort_order"),
      ]);
      if (!active) return;
      const nextRoles = (roleRows ?? []) as AdminRole[];
      const owner = nextRoles.some((r) => r.role === "owner");
      const allowed = ((branchRows ?? []) as AdminBranch[]).filter(
        (b) => owner || nextRoles.some((r) => r.branch_id === b.id),
      );
      setRoles(nextRoles);
      setBranches(allowed);
      setBranchId((prev) => prev ?? allowed[0]?.id ?? null);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setBranchId(null);
  }, []);

  return {
    loading,
    session,
    roles,
    branches,
    branchId,
    setBranchId,
    isOwner: roles.some((r) => r.role === "owner"),
    signOut,
  };
}
