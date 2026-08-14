/** Minimal booking shape the Booking Calendar works with. */
export interface CalBooking {
  id: string;
  reference: string;
  branch_id: string;
  station_id: string | null;
  booking_date: string;
  start_time: string | null;
  end_time: string | null;
  customer_name: string;
  customer_phone: string;
  booking_type: string;
  players: number;
  game_title: string | null;
  status: string;
  payment_utr: string | null;
  payment_mode: string | null;
  special_instructions: string | null;
  total_amount: number;
  gaming_stations: { name: string } | null;
}

export interface CalStation {
  id: string;
  name: string;
  station_type: string;
  status: string;
  sort_order: number;
  is_addon: boolean;
}

export const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : "");
export const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const clock = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m) % 60).padStart(2, "0")}`;
export const prettyTime = (t?: string | null) => {
  if (!t) return "—";
  const m = toMinutes(t);
  const h = Math.floor(m / 60);
  return `${String(h % 12 === 0 ? 12 : h % 12).padStart(2, "0")}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};
export const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
