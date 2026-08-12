import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel, Pill } from "./primitives";
import type { AdminCoupon } from "@/lib/admin/useBranchData";
import { Trash2 } from "lucide-react";
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
        <p className="mt-2 text-[0.65rem] text-muted-foreground">
          Gaming-only coupons never discount food, and food-only coupons never discount gaming.
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
            {coupons.map((c) => (
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
                    Used {c.used_count} times · min order ₹{Math.round(Number(c.min_order_amount))} ·{" "}
                    {daysLabel(c.active_days)} · {windowLabel(c.active_start_time, c.active_end_time)}
                  </p>
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
                <AdminButton variant="danger" onClick={() => void remove(c)}>
                  <Trash2 className="size-3.5" /> Delete
                </AdminButton>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
