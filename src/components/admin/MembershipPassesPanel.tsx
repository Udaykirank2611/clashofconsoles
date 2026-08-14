import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Loader2, Search, Ticket } from "lucide-react";
import { lookupPass, listPasses } from "@/lib/passes.functions";
import { PASS_TYPE_LABELS, hoursLabel, passRuleNote, type PassInfo } from "@/lib/passes";
import { Panel, AdminButton } from "./primitives";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<PassInfo["status"], string> = {
  active: "border-emerald-300/40 bg-emerald-300/10 text-emerald-300",
  used: "border-border bg-surface/60 text-muted-foreground",
  expired: "border-rose-400/40 bg-rose-400/10 text-rose-300",
};

function remainingLabel(p: PassInfo) {
  if (p.remainingMinutes !== null) return hoursLabel(p.remainingMinutes);
  if (p.remainingUses !== null) return `${p.remainingUses} use${p.remainingUses === 1 ? "" : "s"}`;
  return "Unlimited";
}

/**
 * Admin: redeem a pass by its Pass ID and browse every pass issued for this
 * branch, with balances, validity and status.
 */
export function MembershipPassesPanel({ branchId }: { branchId: string }) {
  const listFn = useServerFn(listPasses);
  const lookupFn = useServerFn(lookupPass);

  const { data: passes = [], isLoading } = useQuery({
    queryKey: ["admin-passes", branchId],
    queryFn: () => listFn({ data: { branchId } }),
    staleTime: 20_000,
  });

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    { pass: PassInfo | null; valid: boolean; message: string } | null
  >(null);

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return passes;
    return passes.filter((p) =>
      [p.code, p.customerName, p.phone, p.planName].some((v) => v.toLowerCase().includes(q)),
    );
  }, [passes, query]);

  const verify = async () => {
    const value = code.trim().toUpperCase();
    if (value.length < 6) {
      setResult({ pass: null, valid: false, message: "Enter the full Pass ID." });
      return;
    }
    setBusy(true);
    try {
      const res = await lookupFn({ data: { code: value } });
      setResult({ pass: res.pass ?? null, valid: res.valid, message: res.message });
    } catch {
      setResult({ pass: null, valid: false, message: "Network problem — please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="Pass redemption">
        <div className="flex flex-wrap items-start gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") void verify();
            }}
            placeholder="Enter Pass ID · COC-GD-1A2B3C"
            aria-label="Pass ID"
            className="min-w-0 flex-1 rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm font-bold tracking-[0.12em] outline-none focus:border-cyan/50"
          />
          <AdminButton variant="primary" onClick={() => void verify()} disabled={busy}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Ticket className="size-3.5" />}{" "}
            Verify pass
          </AdminButton>
        </div>

        {result ? (
          result.pass ? (
            <div
              className={cn(
                "mt-4 rounded-2xl border p-4",
                result.valid
                  ? "border-emerald-300/40 bg-emerald-300/5"
                  : "border-rose-400/40 bg-rose-400/5",
              )}
            >
              <p
                className={cn(
                  "flex items-center gap-2 text-[0.6rem] font-black uppercase tracking-[0.2em]",
                  result.valid ? "text-emerald-300" : "text-rose-300",
                )}
              >
                <BadgeCheck className="size-3.5" /> {result.message}
              </p>
              <h3 className="mt-2 text-lg font-black">
                {PASS_TYPE_LABELS[result.pass.passType]} · {result.pass.planName}
              </h3>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Pass ID" value={result.pass.code} />
                <Stat label="Customer" value={`${result.pass.customerName} · ${result.pass.phone}`} />
                <Stat label="Valid until" value={result.pass.expiresOn} />
                <Stat label="Remaining" value={remainingLabel(result.pass)} />
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">{passRuleNote(result.pass)}</p>
              {result.valid ? (
                <a
                  href={`/book?pass=${result.pass.code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-full border border-cyan/40 px-4 py-2 text-xs font-bold text-cyan transition-colors hover:bg-cyan/10"
                >
                  Book with this pass
                </a>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-400/5 px-4 py-3 text-xs font-semibold text-rose-300">
              {result.message}
            </p>
          )
        ) : null}
      </Panel>

      <Panel
        title="All passes"
        action={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ID, name or phone"
              aria-label="Search passes"
              className="w-56 rounded-full border border-border bg-surface/60 py-2 pl-9 pr-3 text-xs outline-none focus:border-cyan/50"
            />
          </div>
        }
      >
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading passes…</p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No passes issued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-xs">
              <thead className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  {["Pass ID", "Customer", "Type", "Purchased", "Expires", "Remaining", "Status"].map(
                    (h) => (
                      <th key={h} className="pb-2 pr-3 font-bold">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-border/70">
                    <td className="py-3 pr-3 font-bold tracking-[0.08em]">{p.code}</td>
                    <td className="py-3 pr-3">
                      <span className="block font-semibold">{p.customerName}</span>
                      <span className="text-muted-foreground">{p.phone}</span>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="block">{PASS_TYPE_LABELS[p.passType]}</span>
                      <span className="text-muted-foreground">{p.planName}</span>
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {p.purchasedAt.slice(0, 10)}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{p.expiresOn}</td>
                    <td className="py-3 pr-3 font-semibold">{remainingLabel(p)}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.14em]",
                          STATUS_TONE[p.status],
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 px-3 py-2">
      <dt className="text-[0.55rem] font-black uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 truncate text-xs font-extrabold">{value}</dd>
    </div>
  );
}
