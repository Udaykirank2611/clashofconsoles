import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Phone, Gift, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  lookupCustomer,
  registerCustomer,
  VISITS_PER_REWARD,
  type LoyaltyCustomer,
} from "@/lib/loyalty.functions";
import { Field } from "./ui";

/**
 * First step of every booking: the phone number.
 * Existing numbers are recognised instantly; new numbers only need a name.
 * No OTP, no password, no login.
 */
export function PhoneGate({ onReady }: { onReady: (customer: LoyaltyCustomer) => void }) {
  const lookupFn = useServerFn(lookupCustomer);
  const registerFn = useServerFn(registerCustomer);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setError(null);
    const digits = phone.replace(/[^\d]/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setBusy(true);
    try {
      const res = await lookupFn({ data: { phone: digits } });
      if (res.found && res.customer) {
        onReady(res.customer);
        return;
      }
      setNeedsName(true);
    } catch {
      toast.error("Network problem — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError("Please enter your name");
      return;
    }
    setBusy(true);
    try {
      const res = await registerFn({ data: { phone, name: name.trim() } });
      if (!res.ok || !res.customer) {
        toast.error(res.message ?? "Could not save your details.");
        return;
      }
      onReady(res.customer);
    } catch {
      toast.error("Network problem — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-3xl border border-border bg-surface/60 p-7 backdrop-blur-2xl sm:p-9">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan/35 bg-cyan/10 px-3.5 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.24em] text-cyan">
          <Phone className="size-3.5" /> Step 1 · Your number
        </span>
        <h2 className="mt-5 text-2xl font-black leading-tight sm:text-3xl">
          {needsName ? "Welcome! What's your name?" : "Enter your phone number"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {needsName
            ? "We only need your name — no OTP, no password."
            : "We use it to track your visits and unlock free gaming rewards."}
        </p>

        <div className="mt-6 space-y-4">
          {needsName ? (
            <Field label="Full name" value={name} onChange={setName} placeholder="Your name" />
          ) : (
            <Field
              label="Mobile number"
              value={phone}
              onChange={(v) => setPhone(v.replace(/[^\d+\s]/g, ""))}
              placeholder="98XXXXXXXX"
            />
          )}
          {error ? <p className="text-xs font-semibold text-rose-300">{error}</p> : null}

          <button
            type="button"
            disabled={busy}
            onClick={() => void (needsName ? create() : check())}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-primary via-cyan to-violet px-6 py-3.5 text-sm font-black uppercase tracking-[0.16em] text-primary-foreground transition-transform duration-300",
              busy ? "opacity-70" : "hover:-translate-y-0.5",
            )}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {needsName ? "Start booking" : "Continue"}
            {!busy ? <ArrowRight className="size-4" /> : null}
          </button>

          {needsName ? (
            <button
              type="button"
              onClick={() => setNeedsName(false)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Use a different number
            </button>
          ) : null}
        </div>

        <p className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-background/40 px-4 py-3 text-[0.68rem] text-muted-foreground">
          <Gift className="size-3.5 shrink-0 text-cyan" />
          Play {VISITS_PER_REWARD} gaming sessions and get 30 minutes free.
        </p>
      </div>
    </div>
  );
}

/** Compact loyalty progress strip shown once the phone number is known. */
export function LoyaltyStrip({ customer }: { customer: LoyaltyCustomer }) {
  const eligible = customer.rewardsAvailable > 0;
  return (
    <div className="mx-auto mt-6 w-full max-w-3xl rounded-2xl border border-border bg-surface/55 px-4 py-3 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="min-w-0 flex-1 truncate text-sm font-bold">
          Welcome back, <span className="text-gradient">{customer.name}</span>
        </p>
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {customer.totalVisits} visit{customer.totalVisits === 1 ? "" : "s"}
        </span>
        {eligible ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-[0.65rem] font-bold text-emerald-300">
            <Sparkles className="size-3" /> 🎉 You have a FREE 30 Minute Gaming Reward available.
          </span>
        ) : (
          <span className="flex items-center gap-2 text-[0.68rem] font-semibold text-cyan">
            {customer.cycleProgress} / {VISITS_PER_REWARD} visits
            <span className="text-muted-foreground">
              · {customer.visitsToReward} more for 30 free minutes
            </span>
          </span>
        )}
      </div>
      {!eligible ? (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-linear-to-r from-primary via-cyan to-violet transition-all duration-500"
            style={{ width: `${(customer.cycleProgress / VISITS_PER_REWARD) * 100}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
