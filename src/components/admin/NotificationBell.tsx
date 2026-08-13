import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, Gamepad2, IndianRupee, Ticket, UtensilsCrossed, Gift, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { money } from "./primitives";

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  booking_id: string | null;
  booking_reference: string | null;
  customer_phone: string | null;
  amount: number | null;
  read_at: string | null;
  created_at: string;
}

const ICONS: Record<string, React.ReactNode> = {
  new_booking: <Gamepad2 className="size-3.5" />,
  food_order: <UtensilsCrossed className="size-3.5" />,
  payment: <IndianRupee className="size-3.5" />,
  coupon: <Ticket className="size-3.5" />,
  reward: <Gift className="size-3.5" />,
  cancelled: <XCircle className="size-3.5" />,
};

const ago = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/** Bell + dropdown of branch notifications, generated automatically by the backend. */
export function NotificationBell({
  branchId,
  onOpenBooking,
}: {
  branchId: string;
  onOpenBooking: (reference: string) => void;
}) {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("admin_notifications")
      .select("id, type, title, body, booking_id, booking_reference, customer_phone, amount, read_at, created_at")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data ?? []) as unknown as AdminNotification[]);
  }, [branchId]);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`notifications-${branchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications", filter: `branch_id=eq.${branchId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [branchId, load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = useMemo(() => items.filter((i) => !i.read_at).length, [items]);

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    setItems((prev) =>
      prev.map((i) => (ids.includes(i.id) ? { ...i, read_at: new Date().toISOString() } : i)),
    );
    await supabase.from("admin_notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative grid size-9 place-items-center rounded-full border border-border bg-surface/70 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Bell className="size-4" />
        {unread ? (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.6rem] font-black text-primary-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,90vw)] overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.22em] text-muted-foreground">
              Notifications
            </span>
            <button
              type="button"
              disabled={!unread}
              onClick={() => void markRead(items.filter((i) => !i.read_at).map((i) => i.id))}
              className="flex items-center gap-1 text-[0.65rem] font-semibold text-cyan disabled:opacity-40"
            >
              <Check className="size-3" /> Mark all read
            </button>
          </div>

          <ul className="max-h-[26rem] divide-y divide-border overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-10 text-center text-xs text-muted-foreground">Nothing yet.</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      void markRead([n.id]);
                      if (n.booking_reference) {
                        onOpenBooking(n.booking_reference);
                        setOpen(false);
                      }
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface/60",
                      !n.read_at && "bg-cyan/5",
                    )}
                  >
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-surface/70 text-cyan">
                      {ICONS[n.type] ?? <Bell className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-xs font-bold">{n.title}</span>
                        {!n.read_at ? <span className="size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.68rem] text-muted-foreground">{n.body}</span>
                      <span className="mt-0.5 block text-[0.62rem] text-muted-foreground">
                        {n.customer_phone ? `${n.customer_phone} · ` : ""}
                        {n.booking_reference ? `${n.booking_reference} · ` : ""}
                        {ago(n.created_at)}
                      </span>
                    </span>
                    {n.amount != null ? (
                      <span className="shrink-0 text-xs font-bold tabular-nums">{money(n.amount)}</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
