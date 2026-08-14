import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Loader2, Ticket, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { lookupPass, type PassLookup } from "@/lib/passes.functions";
import {
  PASS_TYPE_LABELS,
  hoursLabel,
  passRuleNote,
  type PassInfo,
} from "@/lib/passes";

export interface AppliedPass {
  pass: PassInfo;
  rules: NonNullable<PassLookup["rules"]>;
}

/**
 * Membership / combo / unlimited pass redemption for the customer booking flow.
 * The guest types their Pass ID, we verify it server-side and, when valid, the
 * gaming session is covered by the pass instead of being charged.
 */
export function PassRedeem({
  applied,
  onApply,
  onClear,
  plannedMinutes,
  initialCode = "",
}: {
  applied: AppliedPass | null;
  onApply: (a: AppliedPass) => void;
  onClear: () => void;
  /** Minutes currently selected for the console session, for the after-balance. */
  plannedMinutes: number | null;
  initialCode?: string;
}) {
  const lookupFn = useServerFn(lookupPass);
  const [open, setOpen] = useState(Boolean(initialCode));
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* A "?pass=" link prefills the field so the guest only has to verify. */
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      setOpen(true);
    }
  }, [initialCode]);

  const verify = async (raw?: string) => {
    const value = (raw ?? code).trim().toUpperCase();
    setError(null);
    if (value.length < 6) {
      setError("Enter your full Pass ID");
      return;
    }
    setBusy(true);
    try {
      const res = await lookupFn({ data: { code: value } });
      if (!res.found || !res.valid || !res.pass || !res.rules) {
        setError(res.message || "This Pass ID is not valid.");
        return;
      }
      onApply({ pass: res.pass, rules: res.rules });
      toast.success("Pass verified", { description: PASS_TYPE_LABELS[res.pass.passType] });
    } catch {
      toast.error("Network problem — please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (applied) {
    const { pass, rules } = applied;
    const used = plannedMinutes ?? 0;
    const after =
      pass.remainingMinutes === null ? null : Math.max(0, pass.remainingMinutes - used);

    return (
      <div className="rounded-3xl border border-emerald-300/40 bg-emerald-300/5 p-5 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[0.6rem] font-black uppercase tracking-[0.2em] text-emerald-300">
              <BadgeCheck className="size-3.5" /> Pass applied
            </p>
            <h3 className="mt-2 truncate text-lg font-black">
              {PASS_TYPE_LABELS[pass.passType]} · {pass.planName}
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {pass.code} · {pass.customerName} · {pass.branchName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClear();
              setCode("");
              setOpen(true);
            }}
            aria-label="Remove pass"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-border transition-colors hover:border-rose-400/50"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          <Stat label="Valid until" value={pass.expiresOn} />
          <Stat
            label="Balance before"
            value={
              pass.remainingMinutes === null
                ? pass.remainingUses !== null
                  ? `${pass.remainingUses} use${pass.remainingUses === 1 ? "" : "s"}`
                  : "Unlimited"
                : hoursLabel(pass.remainingMinutes)
            }
          />
          <Stat
            label="Balance after"
            value={
              after === null
                ? pass.remainingUses !== null
                  ? `${Math.max(0, pass.remainingUses - 1)} use${
                      Math.max(0, pass.remainingUses - 1) === 1 ? "" : "s"
                    }`
                  : "Unlimited"
                : hoursLabel(after)
            }
          />
        </dl>

        <p className="mt-4 rounded-2xl border border-border bg-surface/50 px-4 py-3 text-[0.7rem] text-muted-foreground">
          {passRuleNote(pass)}
          {rules.maxMinutes
            ? ` Maximum ${hoursLabel(rules.maxMinutes)} for this booking.`
            : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-surface/60 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-extrabold">
            <Ticket className="size-4 text-violet" /> Already have a pass?
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Redeem your Membership, Combo or Unlimited Pass with its Pass ID.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-full border border-violet/40 px-4 py-2 text-xs font-bold text-violet transition-colors hover:bg-violet/10"
        >
          {open ? "Cancel" : "Redeem pass"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 flex flex-wrap items-start gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") void verify();
            }}
            placeholder="COC-BR-1A2B3C"
            aria-label="Pass ID"
            className={cn(
              "min-w-0 flex-1 rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm font-bold tracking-[0.12em] outline-none transition-colors focus:border-violet/60",
              error && "border-rose-400/60",
            )}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void verify()}
            className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-primary to-violet px-5 py-3 text-sm font-black text-background disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Verify
          </button>
          {error ? <p className="w-full text-xs font-semibold text-rose-300">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 px-3 py-2">
      <dt className="text-[0.55rem] font-black uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-extrabold">{value}</dd>
    </div>
  );
}
