import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminStation {
  id: string;
  branch_id: string;
  name: string;
  station_type: string;
  status: "available" | "maintenance" | "blocked";
  hourly_price: number;
  is_addon: boolean;
  sort_order: number;
  group_label: string;
  games: string[];
  description: string | null;
  image_url: string | null;
}

export interface AdminBookingItem {
  id: string;
  label: string;
  quantity: number;
  line_total: number;
  kind: "food" | "addon";
  /** Null for passes/offers; set for timed experience add-ons. */
  station_id: string | null;
  /** Set for food lines — used to resolve the menu category. */
  menu_item_id?: string | null;
  unit_price: number;
  start_time: string | null;
  end_time: string | null;
  /** Extra hours the guest added on top of the base package. */
  extra_hours: number;
  extra_hour_price: number;
}

export interface AdminBooking {
  id: string;
  reference: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  players: number;
  booking_type?: string | null;
  reward_minutes?: number | null;
  game_title: string | null;

  status:
    | "awaiting_payment"
    | "payment_pending"
    | "pending"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "expired";
  payment_utr: string | null;
  payment_mode: string | null;
  payment_note: string | null;
  payment_submitted_at: string | null;
  payment_expires_at: string | null;

  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  special_instructions: string | null;
  coupon_code: string | null;
  session_amount: number;
  addons_amount: number;
  food_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  student_discount: boolean;
  student_discount_amount: number;
  station_id: string;
  created_at: string;
  gaming_stations: { name: string } | null;
  booking_items: AdminBookingItem[];
  /** Membership / combo / unlimited passes issued from this booking. */
  membership_passes?: AdminIssuedPass[];
}

/** A pass issued by a booking, shown in the confirmation message. */
export interface AdminIssuedPass {
  code: string;
  pass_type: string;
  plan_name: string;
  expires_on: string;
  remaining_minutes: number | null;
  remaining_uses: number | null;
  status: string;
}

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "flat" | "percent";
  /** Which part of the bill the coupon discounts. */
  category: "gaming" | "food" | "entire_bill";

  value: number;
  min_order_amount: number;
  is_active: boolean;
  used_count: number;
  /** Null when the coupon has no usage cap. */
  usage_limit: number | null;
  /** ISO expiry timestamp, or null for no expiry. */
  ends_at: string | null;
  /** Weekdays (0 = Sunday) the coupon is valid on. Empty = every day. */
  active_days: number[];
  /** Happy-hour window checked against the booked slot time. */
  active_start_time: string | null;
  active_end_time: string | null;
  /** Loyalty level range that may use this coupon. Null = no bound. */
  min_level: number | null;
  max_level: number | null;
}



/** A branch-owned session duration + price row. */
export interface AdminSessionOption {
  id: string;
  branch_id: string;
  label: string;
  duration_minutes: number;
  players: number;
  price: number;
  is_active: boolean;
  sort_order: number;
}

/** A branch-owned Group Pass duration + price row. */
export interface AdminGroupPassRate {
  id: string;
  branch_id: string;
  label: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  sort_order: number;
}

export interface AdminMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  is_available: boolean;
  branch_id: string;
  sort_order: number;
}

export interface BranchData {
  loading: boolean;
  stations: AdminStation[];
  bookings: AdminBooking[];
  coupons: AdminCoupon[];
  sessions: AdminSessionOption[];
  groupRates: AdminGroupPassRate[];
  menu: AdminMenuItem[];
  refresh: () => Promise<void>;
}

/** Live branch-scoped data for the dashboard. Nothing here is shared with another branch. */
export function useBranchData(branchId: string | null): BranchData {
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState<AdminStation[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [sessions, setSessions] = useState<AdminSessionOption[]>([]);
  const [groupRates, setGroupRates] = useState<AdminGroupPassRate[]>([]);
  const [menu, setMenu] = useState<AdminMenuItem[]>([]);

  const refresh = useCallback(async () => {
    if (!branchId) return;
    const [s, b, c, r, g, m] = await Promise.all([
      supabase.from("gaming_stations").select("*").eq("branch_id", branchId).order("sort_order"),
      supabase
        .from("bookings")
        .select("*, gaming_stations(name), booking_items(id,label,quantity,unit_price,line_total,kind,station_id,menu_item_id,start_time,end_time,extra_hours,extra_hour_price), membership_passes!membership_passes_source_booking_id_fkey(code,pass_type,plan_name,expires_on,remaining_minutes,remaining_uses,status)")
        .eq("branch_id", branchId)
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: true })
        .limit(200),
      supabase
        .from("coupons")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false }),
      supabase
        .from("session_options")
        .select("*")
        .eq("branch_id", branchId)
        .order("sort_order")
        .order("duration_minutes"),
      supabase
        .from("group_pass_rates")
        .select("*")
        .eq("branch_id", branchId)
        .order("sort_order")
        .order("duration_minutes"),
      supabase
        .from("menu_items")
        .select("id, name, category, price, is_available, branch_id, sort_order")
        .eq("branch_id", branchId)
        .order("sort_order"),
    ]);
    setStations((s.data ?? []) as unknown as AdminStation[]);
    setBookings((b.data ?? []) as unknown as AdminBooking[]);
    setCoupons((c.data ?? []) as unknown as AdminCoupon[]);
    setSessions((r.data ?? []) as unknown as AdminSessionOption[]);
    setGroupRates((g.data ?? []) as unknown as AdminGroupPassRate[]);
    setMenu((m.data ?? []) as unknown as AdminMenuItem[]);
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!branchId) return;
    const tables = [
      "bookings",
      "gaming_stations",
      "menu_items",
      "session_options",
      "group_pass_rates",
      "coupons",
      "branches",
    ];
    let channel = supabase.channel(`admin-${branchId}`);
    for (const table of tables) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => void refresh());
    }
    channel.subscribe();
    // Polling fallback so the panel stays current if the realtime socket drops.
    const timer = window.setInterval(() => void refresh(), 25000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [branchId, refresh]);


  return { loading, stations, bookings, coupons, sessions, groupRates, menu, refresh };
}
