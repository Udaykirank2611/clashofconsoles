import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createBranchAdmin } from "@/lib/admin.functions";
import { AdminButton, AdminInput, Panel } from "./primitives";
import type { AdminBranch } from "@/lib/admin/useAdminSession";

/** Owner-only: create a dedicated login for a branch manager. */
export function OwnerPanel({ branches }: { branches: AdminBranch[] }) {
  const create = useServerFn(createBranchAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || password.length < 8 || !branchId) {
      toast.error("Enter an email, a password of 8+ characters and a branch.");
      return;
    }
    setBusy(true);
    const res = await create({ data: { email: email.trim(), password, branchId } });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.message ?? "Could not create the login.");
      return;
    }
    setEmail("");
    setPassword("");
    toast.success("Branch login created.");
  };

  return (
    <Panel title="Branch logins">
      <p className="mb-4 text-xs text-muted-foreground">
        Create a login that can manage only one branch. Share the email and password with that manager.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminInput label="Email" value={email} onChange={setEmail} type="email" placeholder="manager@clash.com" />
        <AdminInput label="Password" value={password} onChange={setPassword} type="password" placeholder="Min 8 characters" />
        <label className="block">
          <span className="mb-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Branch
          </span>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-sm outline-none focus:border-cyan/50"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <AdminButton variant="primary" disabled={busy} onClick={() => void submit()}>
          {busy ? "Creating…" : "Create login"}
        </AdminButton>
      </div>
    </Panel>
  );
}
