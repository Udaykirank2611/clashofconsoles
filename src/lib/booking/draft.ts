/**
 * Auto-saved booking draft.
 *
 * The visitor's progress through the booking flow is mirrored into
 * localStorage after every meaningful change so a refresh, a closed tab or an
 * accidental navigation never loses their work. A draft NEVER reserves a slot —
 * availability is revalidated when the draft is resumed.
 */

export const DRAFT_KEY = "coc_booking_draft";
/** Drafts older than this are ignored (and cleared) on load. */
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export interface BookingDraft {
  version: 1;
  savedAt: number;
  step: number;
  stepLabel: string;
  branchId: string | null;
  branchName: string;
  bookingType: string;
  date: string;
  stationId: string | null;
  players: number | null;
  startTime: string | null;
  durationMinutes: number | null;
  extras: Record<
    string,
    {
      startTime: string | null;
      durationMinutes: number | null;
      rateId?: string | null;
      extraHours?: number;
    }
  >;
  consoleOn: boolean;
  passes: Record<string, number>;
  passesOn: boolean;
  groupMembers: number;
  groupRateId: string | null;
  groupStart: string | null;
  cart: { menuItemId: string; name: string; price: number; quantity: number }[];
  couponInput: string;
  coupon: unknown;
  isStudent: boolean;
  useReward: boolean;
  skippedPhone: boolean;
  customer: unknown;
  form: { fullName: string; phone: string; email: string; instructions: string };
}

/** A draft is only worth restoring once the visitor actually chose something. */
export function draftIsMeaningful(d: BookingDraft): boolean {
  return Boolean(
    d.branchId &&
      (d.step > 0 ||
        d.stationId ||
        d.cart.length > 0 ||
        Object.keys(d.extras).length > 0 ||
        Object.keys(d.passes).length > 0 ||
        d.form.fullName ||
        d.form.phone),
  );
}

export function saveDraft(draft: BookingDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage full or blocked — drafts are a convenience only */
  }
}

export function readDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BookingDraft;
    if (!parsed || parsed.version !== 1 || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      clearDraft();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** "just now" / "12 minutes ago" / "3 hours ago". */
export function timeAgo(ts: number): string {
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
