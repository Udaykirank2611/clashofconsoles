import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel, Pill } from "./primitives";
import type { AdminCoupon } from "@/lib/admin/useBranchData";
import { History, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { DAY_LABELS, daysLabel, windowLabel } from "@/lib/booking/coupon-schedule";
import { COUPON_CATEGORY_LABELS, type CouponCategory } from "@/lib/booking/pricing";

export function CouponsPanel({
  coupons,
  branchId,
  branchName,
  onChanged,
}: {
  coupons: AdminCoupon[];
  branchId: string;
  branchName: string;
  onChanged: () => void;
}) {
  const [code, setCode] = useState("");
  const [value, setValue] = useState("10");
  const [type, setType] = useState<"percent" | "flat">("percent");
  const [minOrder, setMinOrder] = useState("0");
  const [category, setCategory] = useState<CouponCategory>("entire_bill");
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiry, setExpiry] = useState("");
  const [minLevel, setMinLevel] = useState("");
  const [maxLevel, setMaxLevel] = useState("");

  const [historyFor, setHistoryFor] = useState<AdminCoupon | null>(null);

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));

  const create = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 3) {
      toast.error("Coupon code needs at least 3 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("coupons").insert({
      branch_id: branchId,
      code: trimmed,
      discount_type: type,
      category,
      value: Number(value) || 0,
      min_order_amount: Number(minOrder) || 0,
      is_active: true,
      active_days: days,
      active_start_time: from && to ? from : null,
      active_end_time: from && to ? to : null,
      usage_limit: maxUses.trim() ? Number(maxUses) : null,
      ends_at: expiry ? new Date(`${expiry}T23:59:59`).toISOString() : null,
      min_level: minLevel.trim() ? Number(minLevel) : null,
      max_level: maxLevel.trim() ? Number(maxLevel) : null,
    });


    setBusy(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "That code already exists." : "Could not create the coupon.");
      return;
    }
    setCode("");
    setCategory("entire_bill");
    setDays([]);
    setFrom("");
    setTo("");
    setMaxUses("");
    setExpiry("");
    setMinLevel("");
    setMaxLevel("");

    toast.success("Coupon created.");
    onChanged();
  };

  const update = async (c: AdminCoupon, patch: Partial<AdminCoupon>) => {
    const { error } = await supabase.from("coupons").update(patch).eq("id", c.id);
    if (error) toast.error("Could not update the coupon.");
    else onChanged();
  };

  const remove = async (c: AdminCoupon) => {
    const { error } = await supabase.from("coupons").delete().eq("id", c.id);
    if (error) toast.error("Could not delete this coupon — it may be linked to a booking.");
    else {
      toast.success("Coupon deleted.");
      onChanged();
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="New coupon">
        <div className="grid gap-3 sm:grid-cols-5">
          <AdminInput label="Code" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="CLASH10" />
          <label className="block">
            <span className="mb-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Type
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "percent" | "flat")}
              className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-sm outline-none focus:border-cyan/50"
            >
              <option value="percent">Percent off</option>
              <option value="flat">Flat ₹ off</option>
            </select>
          </label>
          <AdminInput label="Value" value={value} onChange={(v) => setValue(v.replace(/[^0-9]/g, ""))} />
          <AdminInput label="Min order ₹" value={minOrder} onChange={(v) => setMinOrder(v.replace(/[^0-9]/g, ""))} />
          <label className="block">
            <span className="mb-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Applies to
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CouponCategory)}
              className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-sm outline-none focus:border-cyan/50"
            >
              {(Object.keys(COUPON_CATEGORY_LABELS) as CouponCategory[]).map((k) => (
                <option key={k} value={k}>
                  {COUPON_CATEGORY_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <AdminInput
            label="Max uses (blank = unlimited)"
            value={maxUses}
            onChange={(v) => setMaxUses(v.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 100"
          />
          <label className="block">
            <span className="mb-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Expiry date
            </span>
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-sm outline-none focus:border-cyan/50"
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <AdminInput
            label="Min level (blank = any)"
            value={minLevel}
            onChange={(v) => setMinLevel(v.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 5"
          />
          <AdminInput
            label="Max level (blank = unlimited)"
            value={maxLevel}
            onChange={(v) => setMaxLevel(v.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 10"
          />
        </div>
        <p className="mt-2 text-[0.65rem] text-muted-foreground">
          Gaming-only coupons never discount food, and food-only coupons never discount gaming. Level = the
          guest&apos;s completed visits, so min 2 / max 5 means only levels 2–5 can redeem the code.
        </p>


        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Active days
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={
                    "rounded-full border px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] transition-colors " +
                    (days.includes(i)
                      ? "border-cyan/50 bg-cyan/10 text-cyan"
                      : "border-border bg-surface/60 text-muted-foreground hover:text-foreground")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[0.65rem] text-muted-foreground">
              Leave empty for every day.
            </p>
          </div>
          <div>
            <span className="mb-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Happy hours (slot time)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-sm outline-none focus:border-cyan/50"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="time"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-sm outline-none focus:border-cyan/50"
              />
            </div>
            <p className="mt-1.5 text-[0.65rem] text-muted-foreground">
              Applies to the slot the guest books, not when they book. Leave empty for all day.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <AdminButton variant="primary" disabled={busy} onClick={() => void create()}>
            Create coupon
          </AdminButton>
        </div>
      </Panel>

      <Panel title="Coupons">
        {coupons.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No coupons yet.</p>
        ) : (
          <div className="space-y-3">
            {/* Active coupons sit on top; disabling one returns it to creation order. */}
            {coupons
              .slice()
              .sort((a, b) => Number(Boolean(b.is_active)) - Number(Boolean(a.is_active)))
              .map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface/50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold tracking-wider">{c.code}</span>
                    {c.is_active ? <Pill tone="good">Active</Pill> : <Pill tone="muted">Disabled</Pill>}
                    <Pill tone="muted">
                      {COUPON_CATEGORY_LABELS[(c.category ?? "entire_bill") as CouponCategory]}
                    </Pill>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Used {c.used_count} ·{" "}
                    {c.usage_limit == null
                      ? "unlimited left"
                      : `${Math.max(0, c.usage_limit - c.used_count)} left`}{" "}
                    · min order ₹{Math.round(Number(c.min_order_amount))} ·{" "}
                    {c.ends_at
                      ? `expires ${new Date(c.ends_at).toLocaleDateString("en-IN")}`
                      : "no expiry"}{" "}
                    · {daysLabel(c.active_days)} · {windowLabel(c.active_start_time, c.active_end_time)} ·{" "}
                    {c.min_level == null && c.max_level == null
                      ? "all levels"
                      : c.min_level != null && c.max_level != null
                        ? `levels ${c.min_level}–${c.max_level}`
                        : c.min_level != null
                          ? `level ${c.min_level}+`
                          : `levels up to ${c.max_level}`}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                      Max uses
                      <input
                        defaultValue={c.usage_limit == null ? "" : String(c.usage_limit)}
                        inputMode="numeric"
                        placeholder="∞"
                        onBlur={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          const next = raw ? Number(raw) : null;
                          if (next !== c.usage_limit) void update(c, { usage_limit: next });
                        }}
                        className="w-16 rounded-xl border border-border bg-surface/70 px-2 py-1 text-center text-xs outline-none focus:border-cyan/50"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                      Min level
                      <input
                        defaultValue={c.min_level == null ? "" : String(c.min_level)}
                        inputMode="numeric"
                        placeholder="any"
                        onBlur={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          const next = raw ? Number(raw) : null;
                          if (next !== c.min_level) void update(c, { min_level: next });
                        }}
                        className="w-16 rounded-xl border border-border bg-surface/70 px-2 py-1 text-center text-xs outline-none focus:border-cyan/50"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                      Max level
                      <input
                        defaultValue={c.max_level == null ? "" : String(c.max_level)}
                        inputMode="numeric"
                        placeholder="∞"
                        onBlur={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          const next = raw ? Number(raw) : null;
                          if (next !== c.max_level) void update(c, { max_level: next });
                        }}
                        className="w-16 rounded-xl border border-border bg-surface/70 px-2 py-1 text-center text-xs outline-none focus:border-cyan/50"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                      Expires
                      <input
                        type="date"
                        defaultValue={c.ends_at ? c.ends_at.slice(0, 10) : ""}
                        onBlur={(e) =>
                          void update(c, {
                            ends_at: e.target.value
                              ? new Date(`${e.target.value}T23:59:59`).toISOString()
                              : null,
                          })
                        }
                        className="rounded-xl border border-border bg-surface/70 px-2 py-1 text-xs outline-none focus:border-cyan/50"
                      />
                    </label>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {DAY_LABELS.map((label, i) => {
                      const on = (c.active_days ?? []).includes(i);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() =>
                            void update(c, {
                              active_days: on
                                ? (c.active_days ?? []).filter((x) => x !== i)
                                : [...(c.active_days ?? []), i].sort((a, b) => a - b),
                            })
                          }
                          className={
                            "rounded-full border px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.14em] transition-colors " +
                            (on
                              ? "border-cyan/50 bg-cyan/10 text-cyan"
                              : "border-border bg-surface/60 text-muted-foreground hover:text-foreground")
                          }
                        >
                          {label}
                        </button>
                      );
                    })}
                    <input
                      type="time"
                      defaultValue={c.active_start_time?.slice(0, 5) ?? ""}
                      onBlur={(e) => void update(c, { active_start_time: e.target.value || null })}
                      className="rounded-xl border border-border bg-surface/70 px-2.5 py-1 text-xs outline-none focus:border-cyan/50"
                    />
                    <span className="text-[0.6rem] text-muted-foreground">to</span>
                    <input
                      type="time"
                      defaultValue={c.active_end_time?.slice(0, 5) ?? ""}
                      onBlur={(e) => void update(c, { active_end_time: e.target.value || null })}
                      className="rounded-xl border border-border bg-surface/70 px-2.5 py-1 text-xs outline-none focus:border-cyan/50"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <select
                    value={(c.category ?? "entire_bill") as CouponCategory}
                    onChange={(e) => void update(c, { category: e.target.value as CouponCategory })}
                    className="rounded-xl border border-border bg-surface/70 px-2.5 py-1.5 text-xs outline-none focus:border-cyan/50"
                  >
                    {(Object.keys(COUPON_CATEGORY_LABELS) as CouponCategory[]).map((k) => (
                      <option key={k} value={k}>
                        {COUPON_CATEGORY_LABELS[k]}
                      </option>
                    ))}
                  </select>
                  <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                    {c.discount_type === "percent" ? "% off" : "₹ off"}
                  </span>
                  <input
                    defaultValue={String(Math.round(Number(c.value)))}
                    inputMode="numeric"
                    onBlur={(e) => {
                      const next = Number(e.target.value.replace(/[^0-9]/g, ""));
                      if (Number.isFinite(next) && next !== Number(c.value)) void update(c, { value: next });
                    }}
                    className="w-20 rounded-xl border border-border bg-surface/70 px-3 py-1.5 text-center text-sm outline-none focus:border-cyan/50"
                  />
                </label>
                <AdminButton onClick={() => void update(c, { is_active: !c.is_active })}>
                  {c.is_active ? "Disable" : "Enable"}
                </AdminButton>
                <AdminButton onClick={() => setHistoryFor(historyFor?.id === c.id ? null : c)}>
                  <History className="size-3.5" /> Usage
                </AdminButton>
                <AdminButton variant="danger" onClick={() => void remove(c)}>
                  <Trash2 className="size-3.5" /> Delete
                </AdminButton>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {historyFor ? (
        <RedemptionHistory coupon={historyFor} onClose={() => setHistoryFor(null)} />
      ) : null}
    </div>
  );
}

interface Redemption {
  id: string;
  customer_phone: string;
  discount_amount: number;
  created_at: string;
  bookings: { reference: string } | null;
}

/** Redemptions are written only when a booking is marked completed. */
function RedemptionHistory({ coupon, onClose }: { coupon: AdminCoupon; onClose: () => void }) {
  const [rows, setRows] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("coupon_redemptions")
        .select("id, customer_phone, discount_amount, created_at, bookings(reference)")
        .eq("coupon_id", coupon.id)
        .order("created_at", { ascending: false });
      if (alive) {
        setRows((data ?? []) as unknown as Redemption[]);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [coupon.id]);

  return (
    <Panel title={`${coupon.code} · redemption history`}>
      <div className="mb-3 flex justify-end">
        <AdminButton onClick={onClose}>Close</AdminButton>
      </div>
      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No redemptions yet — a coupon counts as used only after the booking is completed.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface/50 px-4 py-3 text-sm"
            >
              <span className="font-semibold">{r.customer_phone}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {r.bookings?.reference ?? "—"}
              </span>
              <span className="ml-auto font-bold text-emerald-300">
                − ₹{Math.round(Number(r.discount_amount)).toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString("en-IN")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
