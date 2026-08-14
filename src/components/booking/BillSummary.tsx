import { Gamepad2, UtensilsCrossed, ShieldCheck, Ticket, GraduationCap, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { inr, type Bill, type CouponCategory } from "@/lib/booking/pricing";

export interface BillLine {
  key: string;
  label: string;
  amount: number;
  hint?: string;
}

const CATEGORY_TAG: Record<CouponCategory, string> = {
  gaming: "Gaming coupon",
  food: "Food coupon",
  entire_bill: "Entire bill coupon",
};

function Line({
  label,
  value,
  hint,
  tone = "base",
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "base" | "muted" | "green" | "red";
  strong?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
      <dt
        className={cn(
          "min-w-0 text-xs",
          tone === "green" && "font-semibold text-emerald-300",
          tone === "red" && "font-semibold text-rose-300",
          tone === "base" && "text-foreground/85",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        <span className="block truncate">{label}</span>
        {hint ? <span className="mt-0.5 block truncate text-[0.62rem] text-muted-foreground">{hint}</span> : null}
      </dt>
      <dd
        className={cn(
          "shrink-0 text-right text-sm tabular-nums",
          strong ? "font-black" : "font-semibold",
          tone === "green" && "text-emerald-300",
          tone === "red" && "text-rose-300",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** "1 Hour 30 Minutes" */
export function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts = [
    ...(h ? [`${h} Hour${h > 1 ? "s" : ""}`] : []),
    ...(m ? [`${m} Minutes`] : []),
  ];
  return parts.join(" ") || "0 Minutes";
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background/40 p-4 backdrop-blur-xl">
      <header className="mb-3 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg border border-border bg-surface/70 text-cyan">
          {icon}
        </span>
        <h3 className="text-[0.62rem] font-extrabold uppercase tracking-[0.2em]">{title}</h3>
      </header>
      <dl className="space-y-2">{children}</dl>
    </section>
  );
}

/**
 * Premium, category-separated bill.
 * Gaming and food are totalled independently so a gaming coupon can never
 * discount food (and vice-versa), and the student discount is derived from
 * the gaming total alone.
 */
export function BillSummary({
  gamingLines,
  foodLines,
  bill,
  couponCode,
  couponCategory,
  taxPercent = 0,
  reward = null,
  footer,
}: {
  gamingLines: BillLine[];
  foodLines: BillLine[];
  bill: Bill;
  couponCode?: string | null;
  couponCategory?: CouponCategory | null;
  taxPercent?: number;
  /** Loyalty reward applied to the console session, shown as free play time. */
  reward?: { bookedMinutes: number; rewardMinutes: number } | null;
  footer?: React.ReactNode;
}) {
  const tag = couponCategory ? CATEGORY_TAG[couponCategory] : "Coupon";
  const codeLabel = couponCode ? `${tag} · ${couponCode}` : tag;

  return (
    <div className="space-y-4">
      {gamingLines.length ? (
        <Card icon={<Gamepad2 className="size-4" />} title="Gaming charges">
          {gamingLines.map((l) => (
            <Line key={l.key} label={l.label} value={inr(l.amount)} {...(l.hint ? { hint: l.hint } : {})} />
          ))}
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <Line label="Gaming subtotal" value={inr(bill.gamingSubtotal)} strong />
            {bill.gamingDiscount ? (
              <>
                <Line label={codeLabel} value={`− ${inr(bill.gamingDiscount)}`} tone="green" />
                <Line label="Gaming total" value={inr(bill.gamingTotal)} strong />
              </>
            ) : null}
          </div>
          {reward ? (
            <div className="mt-3 space-y-2 rounded-xl border border-emerald-300/35 bg-emerald-300/8 p-3">
              <p className="flex items-center gap-1.5 text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-emerald-300">
                <Gift className="size-3.5" /> Loyalty reward applied
              </p>
              <Line label="Gaming time" value={durationLabel(reward.bookedMinutes)} />
              <Line label="Reward applied" value={`${durationLabel(reward.rewardMinutes)} free`} tone="green" />
              <Line
                label="Total play time"
                value={durationLabel(reward.bookedMinutes + reward.rewardMinutes)}
                strong
              />
              <Line label="Amount charged" value={`${durationLabel(reward.bookedMinutes)} only`} tone="muted" />
            </div>
          ) : null}
        </Card>
      ) : null}

      {foodLines.length ? (
        <Card icon={<UtensilsCrossed className="size-4" />} title="Food & drinks">
          {foodLines.map((l) => (
            <Line key={l.key} label={l.label} value={inr(l.amount)} {...(l.hint ? { hint: l.hint } : {})} />
          ))}
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <Line label="Food subtotal" value={inr(bill.foodSubtotal)} strong />
            {bill.foodDiscount ? (
              <>
                <Line label={codeLabel} value={`− ${inr(bill.foodDiscount)}`} tone="green" />
                <Line label="Food total" value={inr(bill.foodTotal)} strong />
              </>
            ) : null}
          </div>
        </Card>
      ) : null}

      <section className="rounded-2xl border border-border bg-background/40 p-4 backdrop-blur-xl">
        <dl className="space-y-2">
          <Line label="Gaming total" value={inr(bill.gamingTotal)} tone="muted" />
          <Line label="Food total" value={inr(bill.foodTotal)} tone="muted" />
          <div className="border-t border-border pt-2">
            <Line label="Combined total" value={inr(bill.combined)} strong />
          </div>

          {bill.billDiscount ? (
            <Line
              label={couponCode ? `Entire bill coupon · ${couponCode}` : "Entire bill coupon"}
              value={`− ${inr(bill.billDiscount)}`}
              tone="green"
            />
          ) : null}

          {bill.studentDiscount ? (
            <Line label="Student discount (20% of gaming)" value={`− ${inr(bill.studentDiscount)}`} tone="red" />
          ) : null}

          {taxPercent ? <Line label={`Taxes (${taxPercent}%)`} value={inr(bill.tax)} tone="muted" /> : null}
        </dl>

        {bill.studentDiscount ? (
          <p className="mt-3 flex gap-2 rounded-xl border border-amber-300/30 bg-amber-300/8 p-3 text-[0.66rem] leading-relaxed text-amber-100/90">
            <GraduationCap className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Student Discount is applicable only on Gaming Services. A valid Student ID must be shown
              at the café during check-in. Failure to present a valid Student ID will result in the
              discount being removed and the remaining amount becoming payable.
            </span>
          </p>
        ) : null}
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-cyan/35 bg-linear-to-r from-primary/12 via-cyan/12 to-violet/12 px-4 py-4 shadow-[0_30px_80px_-45px_var(--cyan)]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan to-transparent"
        />
        <div className="flex items-end justify-between gap-3">
          <span className="text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-cyan">
            Grand total
          </span>
          <span key={bill.grandTotal} className="text-2xl font-black tabular-nums animate-[scale-in_0.25s_ease-out]">
            {inr(bill.grandTotal)}
          </span>
        </div>
        {bill.totalDiscount ? (
          <p className="mt-1.5 flex items-center justify-end gap-1.5 text-[0.62rem] font-semibold text-emerald-300">
            <Ticket className="size-3" /> You save {inr(bill.totalDiscount)}
          </p>
        ) : null}
      </section>

      {footer ?? (
        <p className="flex items-center justify-center gap-1.5 text-[0.65rem] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-cyan" /> Secure booking · confirmed after payment
        </p>
      )}
    </div>
  );
}
