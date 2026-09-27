import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  changeMyPassword,
  createAccount,
  deleteAccount,
  forceLogout,
  listAccounts,
  listActiveSessions,
  listLoginEvents,
  resetAccountPassword,
  setAccountDisabled,
  updateAccount,
  type LoginAccount,
} from "@/lib/security.functions";
import { getSessionId } from "@/lib/admin/sessionTracker";
import { AdminButton, AdminInput, Panel, Pill } from "./primitives";
import type { AdminBranch } from "@/lib/admin/useAdminSession";

const PAGE = 20;
const when = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Never";

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE));
  if (pages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-xs">
      <AdminButton disabled={page === 0} onClick={() => onPage(page - 1)}>Prev</AdminButton>
      <span className="text-muted-foreground">Page {page + 1} of {pages}</span>
      <AdminButton disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Next</AdminButton>
    </div>
  );
}

const th = "px-3 py-2 text-left text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground";
const td = "px-3 py-2 align-top";

export function SecurityPanel({ branches }: { branches: AdminBranch[] }) {
  return (
    <div className="space-y-6">
      <ChangePassword />
      <Accounts branches={branches} />
      <Sessions />
      <Events success />
      <Events success={false} />
    </div>
  );
}

function ChangePassword() {
  const change = useServerFn(changeMyPassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (next !== confirm) { toast.error("New passwords don't match."); return; }
    setBusy(true);
    try {
      const res = await change({ data: { current, next, sessionId: getSessionId() } });
      if (!res.ok) { toast.error(res.message ?? "Could not change password."); return; }
      setCurrent(""); setNext(""); setConfirm("");
      toast.success("Password changed. Other devices were signed out.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change password.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title="Change my password">
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminInput label="Current password" type="password" value={current} onChange={setCurrent} />
        <AdminInput label="New password" type="password" value={next} onChange={setNext} placeholder="8+ chars, letter & number" />
        <AdminInput label="Confirm new password" type="password" value={confirm} onChange={setConfirm} />
      </div>
      <div className="mt-4 flex justify-end">
        <AdminButton variant="primary" disabled={busy || !current || !next} onClick={() => void submit()}>
          {busy ? "Saving…" : "Change password"}
        </AdminButton>
      </div>
    </Panel>
  );
}

type Form = { userId?: string; fullName: string; username: string; role: "owner" | "branch_admin"; branchId: string; password: string; disabled: boolean };

function Accounts({ branches }: { branches: AdminBranch[] }) {
  const list = useServerFn(listAccounts);
  const create = useServerFn(createAccount);
  const update = useServerFn(updateAccount);
  const disable = useServerFn(setAccountDisabled);
  const reset = useServerFn(resetAccountPassword);
  const remove = useServerFn(deleteAccount);
  const [rows, setRows] = useState<LoginAccount[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => list().then(setRows).catch(() => toast.error("Could not load accounts.")), [list]);
  useEffect(() => void load(), [load]);

  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>, ok: string) => {
    setBusy(true);
    try {
      const res = await fn();
      if (!res.ok) { toast.error(res.message ?? "Something went wrong."); return; }
      toast.success(ok);
      setForm(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!form) return;
    const base = {
      fullName: form.fullName,
      username: form.username,
      role: form.role,
      branchId: form.role === "owner" ? null : form.branchId || null,
    };
    if (form.userId) {
      void run(() => update({ data: { ...base, userId: form.userId!, disabled: form.disabled } }), "Account updated.");
    } else {
      void run(() => create({ data: { ...base, password: form.password } }), "Account created.");
    }
  };

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <Panel title="Login accounts">
      <div className="mb-3 flex justify-end">
        <AdminButton
          variant="primary"
          onClick={() => setForm({ fullName: "", username: "", role: "branch_admin", branchId: branches[0]?.id ?? "", password: "", disabled: false })}
        >
          + New account
        </AdminButton>
      </div>

      {form ? (
        <div className="mb-4 grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-2">
          <AdminInput label="Full name" value={form.fullName} onChange={(v) => set({ fullName: v })} />
          <AdminInput label="Username" value={form.username} onChange={(v) => set({ username: v })} />
          <label className="block">
            <span className="mb-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Role</span>
            <select value={form.role} onChange={(e) => set({ role: e.target.value as Form["role"] })} className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-sm">
              <option value="branch_admin">Branch Manager</option>
              <option value="owner">Super Admin</option>
            </select>
          </label>
          {form.role === "branch_admin" ? (
            <label className="block">
              <span className="mb-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Branch</span>
              <select value={form.branchId} onChange={(e) => set({ branchId: e.target.value })} className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-sm">
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          ) : <div />}
          {form.userId ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.disabled} onChange={(e) => set({ disabled: e.target.checked })} /> Disabled
            </label>
          ) : (
            <AdminInput label="Password" type="password" value={form.password} onChange={(v) => set({ password: v })} placeholder="8+ chars, letter & number" />
          )}
          <div className="flex items-end justify-end gap-2 sm:col-span-2">
            <AdminButton onClick={() => setForm(null)}>Cancel</AdminButton>
            <AdminButton variant="primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</AdminButton>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th className={th}>Name</th><th className={th}>Username</th><th className={th}>Role</th><th className={th}>Branch</th><th className={th}>Status</th><th className={th}>Last login</th><th className={th} /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className="border-t border-border">
                <td className={td}>{r.fullName}</td>
                <td className={td}>{r.username}</td>
                <td className={td}>{r.role}</td>
                <td className={td}>{r.branch}</td>
                <td className={td}>{r.disabled ? <Pill tone="bad">Disabled</Pill> : <Pill tone="good">Active</Pill>}</td>
                <td className={td}>{when(r.lastLogin)}</td>
                <td className={td}>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <AdminButton onClick={() => setForm({ userId: r.userId, fullName: r.fullName, username: r.username, role: r.role === "Super Admin" ? "owner" : "branch_admin", branchId: r.branchId ?? branches[0]?.id ?? "", password: "", disabled: r.disabled })}>Edit</AdminButton>
                    <AdminButton disabled={busy} onClick={() => void run(() => disable({ data: { userId: r.userId, disabled: !r.disabled } }), r.disabled ? "Account enabled." : "Account disabled.")}>
                      {r.disabled ? "Enable" : "Disable"}
                    </AdminButton>
                    <AdminButton
                      disabled={busy}
                      onClick={() => {
                        const pw = window.prompt(`New password for ${r.username} (8+ chars, letter & number):`);
                        if (pw) void run(() => reset({ data: { userId: r.userId, password: pw } }), "Password reset. They were signed out.");
                      }}
                    >
                      Reset password
                    </AdminButton>
                    <AdminButton
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Delete ${r.username}? This cannot be undone.`))
                          void run(() => remove({ data: { userId: r.userId } }), "Account deleted.");
                      }}
                    >
                      Delete
                    </AdminButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

type SessionRow = Awaited<ReturnType<typeof listActiveSessions>>[number];

function Sessions() {
  const list = useServerFn(listActiveSessions);
  const kick = useServerFn(forceLogout);
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [page, setPage] = useState(0);
  const load = useCallback(
    () => list({ data: { sessionId: getSessionId() } }).then(setRows).catch(() => undefined),
    [list],
  );
  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(t);
  }, [load]);
  return (
    <Panel title="Active sessions">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th className={th}>User</th><th className={th}>Branch</th><th className={th}>Device</th><th className={th}>Signed in</th><th className={th}>Status</th><th className={th} /></tr></thead>
          <tbody>
            {rows.slice(page * PAGE, page * PAGE + PAGE).map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className={td}>{s.fullName || s.username}<div className="text-xs text-muted-foreground">{s.username}</div></td>
                <td className={td}>{s.branch}</td>
                <td className={td}>{[s.browser, s.device].filter(Boolean).join(" · ") || "—"}</td>
                <td className={td}>{when(s.loginAt)}</td>
                <td className={td}>{s.isCurrent ? <Pill tone="good">This device</Pill> : <Pill tone={s.status === "Online" ? "good" : "muted"}>{s.status}</Pill>}</td>
                <td className={td}>
                  {!s.isCurrent ? (
                    <AdminButton
                      onClick={async () => {
                        const res = await kick({ data: { targetId: s.id, sessionId: getSessionId() } });
                        if (!res.ok) toast.error(res.message ?? "Failed.");
                        else { toast.success("Session will be signed out shortly."); void load(); }
                      }}
                    >
                      Force logout
                    </AdminButton>
                  ) : null}
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td className={td} colSpan={6}>No active sessions.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={rows.length} onPage={setPage} />
    </Panel>
  );
}

type EventRow = Awaited<ReturnType<typeof listLoginEvents>>[number];

function Events({ success }: { success: boolean }) {
  const list = useServerFn(listLoginEvents);
  const [rows, setRows] = useState<EventRow[]>([]);
  const [page, setPage] = useState(0);
  useEffect(() => {
    void list({ data: { success } }).then(setRows).catch(() => undefined);
  }, [list, success]);
  return (
    <Panel title={success ? "Login activity" : "Failed login attempts"}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>When</th><th className={th}>Username</th><th className={th}>Name</th>
              <th className={th}>Role</th><th className={th}>Branch</th><th className={th}>Device</th>
              {!success ? <th className={th}>Reason</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.slice(page * PAGE, page * PAGE + PAGE).map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className={td}>{when(e.created_at)}</td>
                <td className={td}>{e.username}</td>
                <td className={td}>{e.full_name ?? "—"}</td>
                <td className={td}>{e.role ?? "—"}</td>
                <td className={td}>{e.branch ?? "—"}</td>
                <td className={td}>{[e.browser, e.device].filter(Boolean).join(" · ") || "—"}</td>
                {!success ? <td className={td}><Pill tone="bad">{e.reason ?? "Failed"}</Pill></td> : null}
              </tr>
            ))}
            {!rows.length ? <tr><td className={td} colSpan={7}>Nothing yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={rows.length} onPage={setPage} />
    </Panel>
  );
}
