import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { addFoodToBooking } from "@/lib/booking-admin.functions";
import type { AdminBooking, AdminMenuItem } from "@/lib/admin/useBranchData";
import { AdminButton, money } from "./primitives";
import { cn } from "@/lib/utils";
import { ModalPortal } from "./ModalPortal";

/** Add extra food/drinks to a confirmed booking and record how it was paid. */
export function AddFoodDialog({
  booking,
  menu,
  onClose,
  onSaved,
}: {
  booking: AdminBooking;
  menu: AdminMenuItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const categories = useMemo(() => {
    const list = menu.filter((m) => m.is_available);
    return Array.from(new Set(list.map((m) => m.category)));
  }, [menu]);
  const [category, setCategory] = useState(categories[0] ?? "");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [payMode, setPayMode] = useState<"upi" | "cash">("cash");
  const [saving, setSaving] = useState(false);
  /** Off-menu lines the admin types in by hand. */
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState(1);
  const [customLines, setCustomLines] = useState<{ name: string; price: number; quantity: number }[]>([]);
  const addFood = useServerFn(addFoodToBooking);

  const items = menu.filter((m) => m.is_available && m.category === category);
  const picked = menu.filter((m) => (qty[m.id] ?? 0) > 0);
  const customTotal = customLines.reduce((s, c) => s + c.price * c.quantity, 0);
  const total = picked.reduce((s, m) => s + Number(m.price) * (qty[m.id] ?? 0), 0) + customTotal;

  const bump = (id: string, delta: number) =>
    setQty((q) => {
      const next = Math.max(0, (q[id] ?? 0) + delta);
      const copy = { ...q };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });

  const submit = async () => {
    if (!picked.length && !customLines.length) return;
    setSaving(true);
    const res = await addFood({
      data: {
        bookingId: booking.id,
        paymentMode: payMode,
        items: picked.map((m) => ({ menuItemId: m.id, quantity: qty[m.id]! })),
        custom: customLines,
      },
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.message ?? "Could not add these items.");
      return;
    }
    setCustomLines([]);
    toast.success(`Items added — ${money(total)} paid by ${payMode === "cash" ? "cash" : "UPI"}.`);
    onSaved();
    onClose();
  };

  return (
    <ModalPortal onClose={onClose}>
      <div className="mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col overflow-y-auto rounded-3xl border border-border bg-surface p-4 shadow-2xl sm:p-6">
        <h3 className="text-sm font-black uppercase tracking-[0.18em]">Add food</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {booking.reference} · {booking.customer_name} · current total {money(booking.total_amount)}
        </p>

        {categories.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No menu items available for this branch.</p>
        ) : (
          <>
            <label className="mt-4 block space-y-1.5">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Category
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-border bg-surface/70 px-3 py-2 text-sm outline-none focus:border-cyan/50"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <ul className="mt-4 max-h-52 space-y-2 overflow-y-auto pr-1 sm:max-h-64">
              {items.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/40 px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{m.name}</span>
                    <span className="text-[0.65rem] text-muted-foreground">{money(Number(m.price))}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <AdminButton disabled={!qty[m.id]} onClick={() => bump(m.id, -1)}>
                      −
                    </AdminButton>
                    <span className="w-5 text-center text-sm font-black">{qty[m.id] ?? 0}</span>
                    <AdminButton onClick={() => bump(m.id, 1)}>+</AdminButton>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-2xl border border-dashed border-border bg-background/40 p-3">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Other item (not on the menu)
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[1.4fr_0.8fr_auto_auto]">
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Item name"
                  className="rounded-2xl border border-border bg-surface/70 px-3 py-2 text-sm outline-none focus:border-cyan/50"
                />
                <input
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Price ₹"
                  inputMode="numeric"
                  className="rounded-2xl border border-border bg-surface/70 px-3 py-2 text-sm tabular-nums outline-none focus:border-cyan/50"
                />
                <span className="flex items-center gap-2">
                  <AdminButton disabled={customQty <= 1} onClick={() => setCustomQty((q) => Math.max(1, q - 1))}>
                    −
                  </AdminButton>
                  <span className="w-5 text-center text-sm font-black">{customQty}</span>
                  <AdminButton onClick={() => setCustomQty((q) => q + 1)}>+</AdminButton>
                </span>
                <AdminButton
                  variant="primary"
                  onClick={() => {
                    const name = customName.trim();
                    const price = Number(customPrice);
                    if (!name || !Number.isFinite(price)) return;
                    setCustomLines((l) => [...l, { name, price, quantity: customQty }]);
                    setCustomName("");
                    setCustomPrice("");
                    setCustomQty(1);
                  }}
                >
                  Add
                </AdminButton>
              </div>
              {customLines.length ? (
                <ul className="mt-2 space-y-1 text-xs">
                  {customLines.map((c, i) => (
                    <li key={`${c.name}-${i}`} className="flex items-center justify-between gap-3">
                      <span>
                        {c.quantity} × {c.name}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums">{money(c.price * c.quantity)}</span>
                        <button
                          type="button"
                          onClick={() => setCustomLines((l) => l.filter((_, j) => j !== i))}
                          className="text-rose-500 hover:underline"
                        >
                          remove
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {picked.length || customLines.length ? (
              <div className="mt-3 rounded-2xl border border-border/70 bg-background/40 p-3 text-xs">
                {customLines.map((c, i) => (
                  <div key={`c-${i}`} className="flex justify-between gap-3">
                    <span>
                      {c.quantity} × {c.name}
                    </span>
                    <span className="font-semibold tabular-nums">{money(c.price * c.quantity)}</span>
                  </div>
                ))}
                {picked.map((m) => (
                  <div key={m.id} className="flex justify-between gap-3">
                    <span>
                      {qty[m.id]} × {m.name}
                    </span>
                    <span className="font-semibold tabular-nums">{money(Number(m.price) * qty[m.id]!)}</span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-border/70 pt-2 text-sm font-black">
                  <span>Added total</span>
                  <span>{money(total)}</span>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              {(["cash", "upi"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMode(m)}
                  className={cn(
                    "flex-1 rounded-2xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors",
                    payMode === m ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-border bg-surface/60",
                  )}
                >
                  {m === "cash" ? "Cash" : "UPI"}
                </button>
              ))}
            </div>

            <div className="sticky bottom-0 -mx-4 mt-4 flex justify-end gap-2 border-t border-border/70 bg-surface px-4 pb-1 pt-3 sm:-mx-6 sm:px-6">
              <AdminButton onClick={onClose}>Cancel</AdminButton>
              <AdminButton variant="success" disabled={saving || (!picked.length && !customLines.length)} onClick={() => void submit()}>
                {saving ? "Saving…" : `Paid · ${money(total)}`}
              </AdminButton>
            </div>
          </>
        )}
      </div>
    </ModalPortal>
  );
}
