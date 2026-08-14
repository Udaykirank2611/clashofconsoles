/**
 * Shared booking domain types. Client-safe — no server imports.
 * Admin panel (future) can reuse these directly.
 */

export type StationType =
  | "console"
  | "driving_simulator"
  | "vr"
  | "snooker"
  | "private_theatre"
  | "private_lounge";
export type StationStatus = "available" | "maintenance" | "blocked";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "expired";

export interface Branch {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  image_url: string | null;
  map_url: string | null;
  opens_at: string;
  closes_at: string;
  slot_minutes: number;
  tax_percent: number;
  sort_order: number;
}

export interface Station {
  id: string;
  branch_id: string;
  name: string;
  station_type: StationType;
  description: string | null;
  image_url: string | null;
  hourly_price: number;
  status: StationStatus;
  is_addon: boolean;
  sort_order: number;
  /** Admin-editable heading this station is grouped under on the booking page. */
  group_label: string;
  /** Admin-editable list of game titles playable on this station. */
  games: string[];
}

/** Admin-editable price tier for a non-console experience (theatre, cockpit, snooker, lounge). */
export interface StationRate {
  id: string;
  station_id: string;
  branch_id: string;
  label: string;
  note: string;
  duration_minutes: number;
  price: number;
  sort_order: number;
  is_active: boolean;
  /** When true this row is the "every extra 1 hour" add-on, not a base package. */
  is_extra_hour: boolean;
}

/** A game title shown on a console's card in the booking flow. Admin-managed per station. */
export interface StationGame {
  id: string;
  station_id: string;
  branch_id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  branch_id: string;
  show_on_home: boolean;
  name: string;
  category: string;
  description: string | null;
  price: number;
  image_url: string | null;
  sort_order: number;
}

/** A branch-owned session duration + price. */
export interface SessionOption {
  id: string;
  branch_id: string;
  label: string;
  duration_minutes: number;
  players: number;
  price: number;
  sort_order: number;
}

/** Branch-owned Group Pass duration + price (books the whole café). */
export interface GroupPassRate {
  id: string;
  branch_id: string;
  label: string;
  duration_minutes: number;
  price: number;
  sort_order: number;
}

/** Single Pass = normal booking. Group Pass = whole café reserved for a group. */
export type BookingType = "single" | "group";

/** Maximum members allowed on a Group Pass. */
export const GROUP_PASS_MAX_MEMBERS = 10;



/** A membership plan / unlimited pass / combo offer that can be added to a booking. */
export interface PassOption {
  id: string;
  branch_id: string;
  kind: "membership" | "offer";
  name: string;
  subtitle: string;
  price: number;
  validity: string;
  badge: string;
  perks: string[];
}


export interface PassLine {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CouponResult {
  valid: boolean;
  message: string;
  code?: string;
  couponId?: string;
  /** Which part of the bill the coupon applies to. */
  category?: "gaming" | "food" | "entire_bill";
  discount?: number;
  /** Redemptions recorded so far (completed bookings only). */
  timesUsed?: number;
  /** Null when the coupon has no usage cap. */
  remainingUses?: number | null;
  /** ISO expiry date, when the coupon has one. */
  expiresAt?: string | null;
}


export interface CartLine {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface AvailabilityEntry {
  station_id: string;
  start_time: string;
  end_time: string;
  source: "booked" | "locked";
}

/** One line on a booking — food, pass or a timed experience add-on. */
export interface BookingSummaryItem {
  label: string;
  quantity: number;
  line_total: number;
  unit_price?: number;
  kind?: string;
  /** Null for passes/offers; set for timed experience add-ons. */
  station_id?: string | null;
  extra_hours?: number;
  start_time?: string | null;
  end_time?: string | null;
}

export interface BookingSummary {
  reference: string;
  status: BookingStatus;
  branch_name: string;
  branch_address: string;
  station_name: string;
  booking_date: string;
  booking_type?: BookingType;
  group_members?: number;
  start_time: string;
  end_time: string;
  players: number;
  game_title: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  special_instructions: string | null;
  coupon_code: string | null;
  session_amount: number;
  addons_amount: number;
  food_amount: number;
  discount_amount: number;
  gaming_discount_amount?: number;
  food_discount_amount?: number;
  bill_discount_amount?: number;
  student_discount_amount?: number;
  tax_amount: number;
  total_amount: number;
  items: BookingSummaryItem[];
  /** Passes issued from this booking, shown to the guest with their Pass ID. */
  passes?: IssuedPassSummary[];
}

/** A membership / combo / unlimited pass issued from a booking. */
export interface IssuedPassSummary {
  code: string;
  pass_type: string;
  plan_name: string;
  expires_on: string;
  remaining_minutes: number | null;
  remaining_uses: number | null;
  status: string;
}

/** Admin-editable session price for a players × duration combination. */
export interface PricingRate {
  branch_id: string;
  players: number;
  duration_minutes: number;
  price: number;
}
