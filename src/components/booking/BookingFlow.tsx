import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FoodBanner } from "@/components/site/FoodBanner";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Gamepad2,
  LibraryBig,
  Loader2,
  MapPin,
  Minus,
  Navigation,
  Plus,
  ShieldCheck,
  Timer,
  Sparkles,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Field, ImagePlaceholder, StatusTag } from "./ui";
import { Chip, DurationCard, GameTile, SlotGrid } from "./parts";
import { PhoneGate, LoyaltyStrip } from "./PhoneGate";
import { PassRedeem, type AppliedPass } from "./PassRedeem";
import { PASS_TYPE_LABELS, isConsoleOnlyPass } from "@/lib/passes";


import {
  REWARD_MIN_BOOKING_MINUTES,
  registerCustomer,
  rewardLabel,
  type LoyaltyCustomer,
} from "@/lib/loyalty.functions";

import {
  createBooking,
  getActiveHold,
  getAvailability,
  getCatalogue,
  holdStation,
  releaseHold,
  validateCoupon,
} from "@/lib/booking.functions";

import {
  addMinutes,
  computeBill,
  formatTime,
  generateSlots,
  inr,
  isRangeBusy,
  slotPrice,
  timeToMinutes,
  toDateKey,
  upcomingDays,
} from "@/lib/booking/pricing";
import { PLAYER_OPTIONS, rateFor } from "@/lib/booking/config";
import { partyStations } from "@/lib/booking/party";
import { useSiteContent } from "@/lib/site-content";
import { ConsoleSelect, CardAction } from "./ConsoleSelect";
import { GamesModal } from "./GamesModal";
import type { CouponCategory } from "@/lib/booking/pricing";
import { BillSummary, durationLabel, type BillLine } from "./BillSummary";
import {
  GROUP_PASS_MAX_MEMBERS,
  type BookingType,
  type CartLine,
  type CouponResult,
  type Station,
  type StationGame,
} from "@/lib/booking/types";

const STEPS = ["Branch", "Gaming", "Food", "Checkout"] as const;

/** Compact date chip that opens a calendar popover. */
function DatePickerChip({
  value,
  onChange,
  min,
  max,
}: {
  value: string;
  onChange: (key: string) => void;
  min: Date;
  max: Date;
}) {
  const [open, setOpen] = useState(false);
  const selected = new Date(`${value}T00:00:00`);
  const minKey = toDateKey(min);
  const maxKey = toDateKey(max);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group inline-flex w-full max-w-sm items-center gap-4 rounded-3xl border border-pink/40 bg-surface/70 px-4 py-3.5 text-left backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-pink/70 hover:shadow-[0_24px_60px_-30px_var(--pink)]"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-pink/45 bg-linear-to-br from-pink/30 to-pink/10 text-pink shadow-[0_0_0_1px_color-mix(in_oklab,var(--pink)_45%,transparent)]">
            <CalendarDays className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.6rem] font-bold uppercase tracking-[0.22em] text-pink">
              Select date
            </span>
            <span className="mt-0.5 block truncate text-lg font-black">
              {selected.toLocaleDateString("en-IN", {
                weekday: "short",
                month: "long",
                day: "numeric",
              })}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-pink transition-transform duration-300 group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto border-pink/40 p-0 shadow-[0_30px_90px_-40px_var(--pink)]"
      >
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => {
            if (!d) return;
            onChange(toDateKey(d));
            setOpen(false);
          }}
          disabled={(d) => {
            const key = toDateKey(d);
            return key < minKey || key > maxKey;
          }}
          initialFocus
          className={cn("pointer-events-auto p-3")}
          classNames={{
            caption_label: "text-sm font-black text-pink",
            nav_button: "border-pink/40 text-pink hover:bg-pink/10",
            head_cell: "text-pink/70 rounded-md w-9 font-semibold text-[0.7rem]",
            day_selected:
              "bg-pink text-background hover:bg-pink focus:bg-pink shadow-[0_0_24px_-6px_var(--pink)]",
            day_today: "border border-pink/50 text-pink",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}


/** Shared Google Maps links for each arena, with an address search fallback. */
const BRANCH_MAPS: Record<string, string> = {
  sheriguda: "https://maps.app.goo.gl/ncHQsbxFE166EpBeA",
  shamirpet: "https://maps.app.goo.gl/ncHQsbxFE166EpBeA",
  vanasthalipuram: "https://maps.app.goo.gl/tThjEhrjVH3k9EgD8",
};

const directionsUrl = (b: { slug: string; name: string; address: string; map_url?: string | null }) =>
  b.map_url ||
  BRANCH_MAPS[b.slug?.toLowerCase()] ||
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.name} ${b.address}`)}`;

type ExtraMap = Record<
  string,
  {
    startTime: string | null;
    /** Base package length; extra hours are added on top. */
    durationMinutes: number | null;
    rateId?: string | null;
    extraHours?: number;
  }
>;


const TOKEN_KEY = "coc_booking_token";
const HOLD_KEY = "coc_booking_hold";
const TAB_KEY = "coc_booking_tab";

/** Stable per-browser token (localStorage so a refresh — and other tabs — see the same hold). */
const sessionToken = () => {
  if (typeof window === "undefined") return "server-token";
  let t = window.localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = crypto.randomUUID();
    window.localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
};

interface StoredHold {
  branchId: string;
  date: string;
  stationId: string | null;
  startTime: string | null;
  durationMinutes: number | null;
  players: number;
  extras: {
    stationId: string;
    startTime: string;
    durationMinutes: number;
    rateId?: string | null;
    extraHours?: number;
  }[];
  passes: Record<string, number>;
  bookingType?: BookingType;
  groupRateId?: string | null;
  groupStart?: string | null;
  groupMembers?: number;
  expiresAt: number;
}

const readStoredHold = (): StoredHold | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(HOLD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredHold;
    return parsed?.expiresAt ? parsed : null;
  } catch {
    return null;
  }
};

/** Indian mobile numbers: 10 digits starting 6-9, optional +91 / 0 prefix. */
const isValidPhone = (raw: string) => {
  const digits = raw.replace(/[^\d]/g, "");
  const local = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits.replace(/^0/, "");
  return /^[6-9]\d{9}$/.test(local);
};


interface CustomerForm {
  fullName: string;
  phone: string;
  email: string;
  instructions: string;
}

export function BookingFlow() {
  const catalogueFn = useServerFn(getCatalogue);
  const availabilityFn = useServerFn(getAvailability);
  const holdFn = useServerFn(holdStation);
  const releaseFn = useServerFn(releaseHold);
  const couponFn = useServerFn(validateCoupon);
  const bookFn = useServerFn(createBooking);
  const registerFn = useServerFn(registerCustomer);

  const navigate = useNavigate();


  const days = useMemo(() => upcomingDays(14), []);
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<LoyaltyCustomer | null>(null);
  /** Visitor chose to skip the phone step — no loyalty rewards, phone collected at the end. */
  const [skippedPhone, setSkippedPhone] = useState(false);

  const [useReward, setUseReward] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [stationId, setStationId] = useState<string | null>(null);
  const [players, setPlayers] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);

  /** Optional timed experiences (racing cockpit, VR, snooker, lounge, theatre). */
  const [extras, setExtras] = useState<ExtraMap>({});
  /** Memberships / unlimited pass / combo offers added to this booking. */
  const [passes, setPasses] = useState<Record<string, number>>({});
  /** Whether the Memberships & Combos group is expanded. */
  const [passesOn, setPassesOn] = useState(false);

  /* Booking type: Single Pass is always the default. A Group Pass books the
     entire café, so it replaces the per-console selection. */
  const [bookingType, setBookingType] = useState<BookingType>("single");
  /** A verified membership / combo / unlimited pass covering the gaming session. */
  const [appliedPass, setAppliedPass] = useState<AppliedPass | null>(null);
  /** Pass ID handed over by a "?pass=" link (e.g. from the admin panel). */
  const [initialPassCode, setInitialPassCode] = useState("");
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("pass");
    if (c) setInitialPassCode(c.trim().toUpperCase());
  }, []);


  const [groupMembers, setGroupMembers] = useState(4);
  const [groupRateId, setGroupRateId] = useState<string | null>(null);
  const [groupStart, setGroupStart] = useState<string | null>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [isStudent, setIsStudent] = useState(false);

  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [form, setForm] = useState<CustomerForm>({
    fullName: "",
    phone: "",
    email: "",
    instructions: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  

  const { data: catalogue, isLoading } = useQuery({
    queryKey: ["booking-catalogue"],
    queryFn: () => catalogueFn(),
    staleTime: 5 * 60_000,
  });

  const branches = catalogue?.branches ?? [];
  const branch = branches.find((b) => b.id === branchId) ?? null;

  const { data: busy = [], refetch: refetchAvailability } = useQuery({
    queryKey: ["booking-availability", branchId, date],
    enabled: Boolean(branchId),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    queryFn: () =>
      availabilityFn({ data: { branchId: branchId!, date, sessionToken: sessionToken() } }),
  });


  const stations = useMemo(
    () => (catalogue?.stations ?? []).filter((s) => s.branch_id === branchId),
    [catalogue, branchId],
  );
  const consoles = useMemo(
    () => stations.filter((s) => s.station_type === "console"),
    [stations],
  );
  /** Is the console-gaming block switched on? Optional, like every experience. */
  const [consoleOn, setConsoleOn] = useState(false);
  /** Home page "Our Gaming Experiences" artwork, keyed by station type. */
  const { experiences: siteExperiences } = useSiteContent();
  const experienceImageByType = useMemo(() => {
    const map = new Map<string, string>();
    for (const exp of siteExperiences) {
      if (exp.station_type && exp.image_url) map.set(exp.station_type, exp.image_url);
    }
    return map;
  }, [siteExperiences]);
  const extraStations = useMemo(
    () => stations.filter((s) => s.station_type !== "console"),
    [stations],
  );
  /**
   * Every bookable experience presented the same way: one card per admin-defined
   * group, with a dropdown of the individual stations inside it.
   */
  const experienceGroups = useMemo(() => {
    const groups: { label: string; isConsole: boolean; stations: Station[] }[] = [];
    if (consoles.length) {
      groups.push({
        label: consoles[0]!.group_label?.trim() || "Console Gaming",
        isConsole: true,
        stations: [...consoles].sort((a, b) => a.sort_order - b.sort_order),
      });
    }
    const byLabel = new Map<string, Station[]>();
    for (const s of extraStations) {
      const key = s.group_label?.trim() || s.station_type.replace(/_/g, " ");
      const list = byLabel.get(key) ?? [];
      list.push(s);
      byLabel.set(key, list);
    }
    for (const [label, list] of byLabel) {
      groups.push({
        label,
        isConsole: false,
        stations: [...list].sort((a, b) => a.sort_order - b.sort_order),
      });
    }
    return groups;
  }, [consoles, extraStations]);
  const passOptions = useMemo(
    () => (catalogue?.passes ?? []).filter((p) => p.branch_id === branchId),
    [catalogue, branchId],
  );
  const station = consoles.find((s) => s.id === stationId) ?? null;
  const slots = useMemo(() => (branch ? generateSlots(branch) : []), [branch]);
  /** VR and racing cockpits run on shorter 15-minute start intervals. */
  const fineSlots = useMemo(
    () => (branch ? generateSlots({ ...branch, slot_minutes: 15 }) : []),
    [branch],
  );
  const menu = useMemo(
    () => (catalogue?.menu ?? []).filter((m) => m.branch_id === branchId),
    [catalogue, branchId],
  );
  const sessions = useMemo(
    () => (catalogue?.sessions ?? []).filter((s) => s.branch_id === branchId),
    [catalogue, branchId],
  );
  /** Group Pass durations + prices, owned by the selected branch. */
  const groupRates = useMemo(
    () =>
      (catalogue?.groupRates ?? [])
        .filter((r) => r.branch_id === branchId)
        .sort((a, b) => a.sort_order - b.sort_order || a.duration_minutes - b.duration_minutes),
    [catalogue, branchId],
  );
  /** Only the units a Party Booking takes over (2 consoles + VR + cockpit). */
  const groupStations = useMemo(
    () => partyStations(branch?.slug, stations),
    [branch, stations],
  );
  const groupStationNames = useMemo(() => groupStations.map((s) => s.name), [groupStations]);

  /** Admin-managed price tiers per experience station. */
  const stationRates = useMemo(
    () => (catalogue?.stationRates ?? []).filter((r) => r.branch_id === branchId),
    [catalogue, branchId],
  );
  /** Admin-managed game list per console. */
  const stationGames = useMemo(
    () => (catalogue?.stationGames ?? []).filter((g) => g.branch_id === branchId),
    [catalogue, branchId],
  );
  const gamesFor = useCallback(
    (id: string) => stationGames.filter((g) => g.station_id === id),
    [stationGames],
  );
  const ratesForStation = useCallback(
    (id: string | null | undefined) =>
      stationRates
        .filter((r) => r.station_id === id)
        .sort((a, b) => a.sort_order - b.sort_order),
    [stationRates],
  );

  /** Base packages exclude the "extra hour" add-on row. */
  const baseTiersFor = useCallback(
    (id: string | null | undefined) => ratesForStation(id).filter((r) => !r.is_extra_hour),
    [ratesForStation],
  );
  const extraHourRateFor = useCallback(
    (id: string | null | undefined) => ratesForStation(id).find((r) => r.is_extra_hour) ?? null,
    [ratesForStation],
  );
  /** Total minutes an experience blocks = base package + every extra hour added. */
  const totalMinutes = (sel: { durationMinutes: number | null; extraHours?: number }) =>
    sel.durationMinutes ? sel.durationMinutes + (sel.extraHours ?? 0) * 60 : null;

  const rates = useMemo(
    () =>
      sessions.map((s) => ({
        players: s.players ?? 1,
        duration_minutes: s.duration_minutes,
        price: Number(s.price),
      })),
    [sessions],
  );
  /** Durations come only from this branch's configured session options.
      A redeemed pass can cap how long a single booking may run. */
  const durations = useMemo(() => {
    const seen = new Map<number, string>();
    for (const s of [...sessions].sort((a, b) => a.sort_order - b.sort_order)) {
      if (!seen.has(s.duration_minutes)) seen.set(s.duration_minutes, s.label);
    }
    const cap = appliedPass?.rules.maxMinutes ?? null;
    return [...seen.entries()]
      .sort((a, b) => a[0] - b[0])
      .filter(([minutes]) => cap === null || minutes <= cap)
      .map(([minutes, label]) => ({ minutes, label }));
  }, [sessions, appliedPass]);



  const isToday = date === toDateKey(new Date());
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const closeMinutes = branch ? timeToMinutes(branch.closes_at) : 24 * 60;
  /** Grace window: a slot stays bookable for 15 minutes after its start time. */
  const SLOT_GRACE_MINUTES = 15;

  const slotBlocked = useCallback(
    (targetId: string, slot: string, minutes: number) => {
      if (isToday && timeToMinutes(slot) + SLOT_GRACE_MINUTES <= nowMinutes) return true;
      if (timeToMinutes(slot) + minutes > closeMinutes) return true;
      return isRangeBusy(busy, targetId, slot, minutes);
    },
    [busy, closeMinutes, isToday, nowMinutes],
  );


  const isGroup = bookingType === "group";
  const groupRate = groupRates.find((r) => r.id === groupRateId) ?? null;
  /** A Group Pass slot is only offered when every experience is free for it. */
  const groupSlotBlocked = useCallback(
    (slot: string, minutes: number) => {
      if (!groupStations.length) return true;
      return groupStations.some((st) => slotBlocked(st.id, slot, minutes));
    },
    [groupStations, slotBlocked],
  );
  const groupSlots = useMemo(
    () => (groupRate ? slots.filter((s) => !groupSlotBlocked(s, groupRate.duration_minutes)) : []),
    [slots, groupRate, groupSlotBlocked],
  );

  useEffect(() => {
    setStationId(null);
    setStartTime(null);
    setDurationMinutes(null);
    setExtras({});
    setGroupStart(null);
  }, [branchId, date]);

  /** Default to the branch's first Group Pass duration. */
  useEffect(() => {
    if (!isGroup) return;
    if (!groupRates.some((r) => r.id === groupRateId)) {
      setGroupRateId(groupRates[0]?.id ?? null);
      setGroupStart(null);
    }
  }, [isGroup, groupRates, groupRateId]);

  /* ---------------- Multi-tab guard ---------------- */
  const [tabBlocked, setTabBlocked] = useState(false);
  const tabIdRef = useRef<string>("");
  useEffect(() => {
    if (!tabIdRef.current) tabIdRef.current = crypto.randomUUID();
    const me = tabIdRef.current;
    const read = () => {
      try {
        return JSON.parse(window.localStorage.getItem(TAB_KEY) ?? "null") as
          | { id: string; at: number }
          | null;
      } catch {
        return null;
      }
    };
    const claim = () => {
      const cur = read();
      const stale = !cur || Date.now() - cur.at > 6000;
      if (cur && !stale && cur.id !== me) {
        setTabBlocked(true);
        return;
      }
      setTabBlocked(false);
      window.localStorage.setItem(TAB_KEY, JSON.stringify({ id: me, at: Date.now() }));
    };
    claim();
    const id = window.setInterval(claim, 2500);
    return () => {
      window.clearInterval(id);
      const cur = read();
      if (cur?.id === me) window.localStorage.removeItem(TAB_KEY);
    };
  }, []);

  /* ---------------- Restore reservation after refresh ---------------- */
  const pendingRestore = useRef<StoredHold | null>(null);
  const skipHoldOnce = useRef(false);
  const restoreFn = useServerFn(getActiveHold);

  useEffect(() => {
    const stored = readStoredHold();
    if (!stored) return;
    window.localStorage.removeItem(HOLD_KEY);
    if (stored.expiresAt <= Date.now()) {
      toast.error("Your reservation expired", { description: "Please choose your slot again." });
      return;
    }
    void restoreFn({ data: { sessionToken: sessionToken() } }).then((res) => {
      if (!res.active || !res.expiresAt) {
        toast.error("Your reservation expired", { description: "Please choose your slot again." });
        return;
      }
      pendingRestore.current = { ...stored, expiresAt: new Date(res.expiresAt).getTime() };
      skipHoldOnce.current = true;
      setBranchId(stored.branchId);
      setDate(stored.date);
      setStep(1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const p = pendingRestore.current;
    if (!p || branchId !== p.branchId || date !== p.date) return;
    pendingRestore.current = null;
    setStationId(p.stationId);
    setPlayers(p.players);
    setStartTime(p.startTime);
    setDurationMinutes(p.durationMinutes);
    const restored: ExtraMap = {};
    for (const e of p.extras ?? [])
      restored[e.stationId] = {
        startTime: e.startTime,
        durationMinutes: e.durationMinutes,
        rateId: e.rateId ?? null,
        extraHours: e.extraHours ?? 0,
      };
    setExtras(restored);
    setBookingType(p.bookingType ?? "single");
    setGroupRateId(p.groupRateId ?? null);
    setGroupStart(p.groupStart ?? null);
    if (p.groupMembers) setGroupMembers(p.groupMembers);
    setPasses(p.passes ?? {});
    setPassesOn(Object.keys(p.passes ?? {}).length > 0);
    setExpiresAt(p.expiresAt);
    toast.success("Reservation restored", { description: "Your slot is still held." });
  }, [branchId, date]);


  const groupAmount = isGroup && groupStart && groupRate ? Math.round(Number(groupRate.price)) : 0;
  /** A redeemed pass funds the console session, so it is never charged. */
  const passCoversSession = Boolean(appliedPass) && !isGroup;
  /** Bronze / Silver / Gold memberships cover PS5 console play for one player only. */
  const passConsoleOnly = appliedPass ? isConsoleOnlyPass(appliedPass.pass.passType) : false;
  const fullSessionAmount = isGroup
    ? groupAmount
    : startTime && durationMinutes && players
      ? rateFor(rates, players, durationMinutes)
      : 0;
  const sessionAmount = passCoversSession ? 0 : fullSessionAmount;

  /* Loyalty reward: free play time added on top of the booked session.
     It never reduces the bill — the guest pays for the duration they booked. */
  const rewardMinutes = customer?.reward?.minutes ?? 0;
  const rewardDurationOk = Boolean(durationMinutes && durationMinutes >= REWARD_MIN_BOOKING_MINUTES);
  const rewardSlotFree = Boolean(
    rewardMinutes &&
      stationId &&
      startTime &&
      durationMinutes &&
      !slotBlocked(stationId, startTime, durationMinutes + rewardMinutes),
  );
  const rewardApplied = Boolean(useReward && rewardMinutes && rewardDurationOk && rewardSlotFree);
  const selectedExtras = useMemo(
    () =>
      Object.entries(extras)
        .map(([stationId, sel]) => ({
          station: extraStations.find((s) => s.id === stationId) ?? null,
          ...sel,
        }))
        .filter((e) => e.station),
    [extras, extraStations],
  );
  const extraAmountFor = (e: (typeof selectedExtras)[number]) => {
    if (!e.startTime || !e.durationMinutes) return 0;
    const tier = stationRates.find((r) => r.id === e.rateId);
    const extraHourRate = extraHourRateFor(e.station!.id);
    const hours = tier && extraHourRate ? (e.extraHours ?? 0) : 0;
    const base = tier ? Math.round(Number(tier.price)) : Math.round(slotPrice(e.station!, e.durationMinutes));
    return base + hours * Math.round(Number(extraHourRate?.price ?? 0));
  };
  const extrasAmount = selectedExtras.reduce((sum, e) => sum + extraAmountFor(e), 0);
  const passLines = passOptions
    .filter((p) => (passes[p.id] ?? 0) > 0)
    .map((p) => ({ ...p, quantity: passes[p.id]! }));
  const passesAmount = passLines.reduce((s, l) => s + l.price * l.quantity, 0);
  const cockpitAmount = (isGroup ? 0 : extrasAmount) + passesAmount;

  const foodAmount = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const gamingSubtotal = sessionAmount + cockpitAmount;
  const subtotal = gamingSubtotal + foodAmount;

  /* Category-aware bill: gaming coupon → food coupon → entire-bill coupon →
     student discount (20% of gaming only, min ₹1000 of gaming). */
  const bill = computeBill({
    gamingSubtotal,
    foodSubtotal: foodAmount,
    coupon:
      coupon?.valid && coupon.discount
        ? { category: (coupon.category ?? "entire_bill") as CouponCategory, discount: coupon.discount }
        : null,
    isStudent,
    taxPercent: branch ? Number(branch.tax_percent) : 0,
  });
  const studentEligible = bill.studentEligible;

  const passSessionLine: BillLine[] =
    passCoversSession && station && startTime && durationMinutes
      ? [
          {
            key: "pass-session",
            label: `${station.name} · ${durationLabel(durationMinutes)}`,
            amount: 0,
            hint: `Covered by ${PASS_TYPE_LABELS[appliedPass!.pass.passType]} · ${appliedPass!.pass.code}`,
          },
        ]
      : [];
  const gamingLines: BillLine[] = [
    ...passSessionLine,
    ...[
      ...(sessionAmount
        ? [
            {
              key: "session",
              label: isGroup
                ? `Party Booking · ${groupRate?.label ?? ""}`
                : (station?.name ?? "Gaming session"),
              amount: sessionAmount,
            },
          ]
        : []),

      ...(isGroup ? [] : selectedExtras)
        .filter((e) => e.station)
        .map((e) => ({
          key: e.station!.id,
          label: e.station!.name,
          amount: extraAmountFor(e),
        })),
      ...passLines.map((l) => ({
        key: l.id,
        label: l.quantity > 1 ? `${l.quantity} × ${l.name}` : l.name,
        amount: l.price * l.quantity,
      })),
    ].filter((l) => l.amount > 0),
  ];




  const foodLines: BillLine[] = cart.map((l) => ({
    key: l.menuItemId,
    label: `${l.quantity} × ${l.name}`,
    amount: l.price * l.quantity,
  }));

  const extrasReady = selectedExtras.every((e) => e.startTime && e.durationMinutes);
  /* A console is optional: the visitor may book only VR / snooker / theatre /
     lounge, or skip gaming entirely when they are buying a pass. Whatever is
     picked simply has to be complete. */
  const consoleTouched = Boolean(stationId || startTime || durationMinutes || players);
  const consoleReady = Boolean(station && startTime && durationMinutes && players);
  const hasPasses = passLines.length > 0;
  /* Gaming is optional; whatever is picked simply has to be complete. */
  const groupReady = Boolean(isGroup && groupRate && groupStart && groupMembers >= 1);
  const gamingComplete = isGroup
    ? groupReady
    : (!consoleTouched || consoleReady) && extrasReady && (!appliedPass || consoleReady);

  const hasGaming = isGroup ? groupReady : consoleReady || selectedExtras.length > 0 || hasPasses;


  /* ---------------- Reservation lock ---------------- */
  const releasedRef = useRef(false);
  const holdKey =
    isGroup
      ? groupReady && branch
        ? ["group", branch!.id, date, groupRate!.id, groupStart!].join("~")
        : null
      : gamingComplete && branch && (consoleReady || selectedExtras.length)
      ? [
          branch.id,
          date,
          station?.id ?? "-",
          startTime ?? "-",
          durationMinutes ?? "-",
          selectedExtras
            .filter((e) => e.startTime && e.durationMinutes)
            .map((e) => `${e.station!.id}|${e.startTime}|${e.durationMinutes}|${e.extraHours ?? 0}`)
            .sort()
            .join(","),
        ].join("~")
      : null;

  useEffect(() => {
    if (!holdKey || !branch || step < 1) return;
    if (skipHoldOnce.current) {
      skipHoldOnce.current = false;
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const extraHolds = selectedExtras
        .filter((e) => e.startTime && e.durationMinutes)
        .map((e) => ({
          stationId: e.station!.id,
          startTime: e.startTime!,
          durationMinutes: totalMinutes(e)!,
          rateId: e.rateId ?? null,
          extraHours: e.extraHours ?? 0,
        }));
      const holds = isGroup
        ? groupStations.map((st) => ({
            stationId: st.id,
            startTime: groupStart!,
            durationMinutes: groupRate!.duration_minutes,
          }))
        : [
            ...(consoleReady
              ? [{ stationId: station!.id, startTime: startTime!, durationMinutes: durationMinutes! }]
              : []),
            ...extraHolds,
          ];
      const res = await holdFn({
        data: { branchId: branch.id, date, sessionToken: sessionToken(), holds },
      });
      if (cancelled) return;
      if (!res.ok) {
        toast.error(res.message ?? "This slot has just become unavailable. Please choose another available time.");
        setStartTime(null);
        setDurationMinutes(null);
        setGroupStart(null);
        setExpiresAt(null);
        setRemaining(0);
        window.localStorage.removeItem(HOLD_KEY);
        void refetchAvailability();
        return;
      }
      releasedRef.current = false;
      const until = new Date(res.expiresAt!).getTime();
      setExpiresAt(until);
      const stored: StoredHold = {
        branchId: branch.id,
        date,
        stationId: consoleReady ? station!.id : null,
        startTime: consoleReady ? startTime : null,
        durationMinutes: consoleReady ? durationMinutes : null,
        players: players ?? 1,
        extras: isGroup ? [] : extraHolds,
        passes,
        bookingType,
        groupRateId,
        groupStart,
        groupMembers,
        expiresAt: until,
      };
      window.localStorage.setItem(HOLD_KEY, JSON.stringify(stored));
      // The previous hold was released server-side — refresh so the old slot
      // frees up in the UI instantly instead of waiting for the poll.
      void refetchAvailability();
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdKey, step >= 1]);

  /* Selection cleared (station / time / duration / branch removed) — drop the
     temporary reservation immediately so nobody is blocked by an orphan lock. */
  const hasHoldRef = useRef(false);
  hasHoldRef.current = expiresAt != null;
  useEffect(() => {
    if (holdKey || !hasHoldRef.current || skipHoldOnce.current) return;
    setExpiresAt(null);
    setRemaining(0);
    window.localStorage.removeItem(HOLD_KEY);
    releasedRef.current = true;
    void releaseFn({ data: { sessionToken: sessionToken() } }).then(() => refetchAvailability());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdKey]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setExpiresAt(null);
        setStartTime(null);
        setDurationMinutes(null);
        setExtras({});
        setStep(1);
        window.localStorage.removeItem(HOLD_KEY);
        void refetchAvailability();
        toast.error("Your reservation expired", { description: "Pick your slot again to continue." });
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, refetchAvailability]);


  const mmss = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  const applyCoupon = async () => {
    if (!couponInput.trim() || subtotal <= 0) return;
    setCouponBusy(true);
    try {
      const slotStart = startTime ?? selectedExtras.find((e) => e.startTime)?.startTime ?? null;
      const res = await couponFn({
        data: {
          branchId: branchId!,
          code: couponInput.trim(),
          gamingAmount: gamingSubtotal,
          foodAmount,
          date,
          startTime: slotStart,
          phone: (customer?.phone ?? form.phone ?? "").trim(),
        },

      });

      setCoupon(res);
      if (res.valid) toast.success("Coupon applied", { description: res.message });
      else toast.error(res.message);
    } finally {
      setCouponBusy(false);
    }
  };

  const submittingRef = useRef(false);
  const submit = async () => {
    if (submittingRef.current) return;
    const next: Partial<Record<keyof CustomerForm, string>> = {};
    if (form.fullName.trim().length < 2) next.fullName = "Please enter your name";
    if (!isValidPhone(form.phone)) next.phone = "Enter a valid 10-digit mobile number";
    setErrors(next);
    const firstBad = (["fullName", "phone"] as const).find((k) => next[k]);
    if (firstBad) {
      // Let the error text render before scrolling to it.
      window.setTimeout(() => highlight(`#field-${firstBad}`, next[firstBad]!), 30);
      return;
    }
    if (!branch) return;

    // Only slot-based bookings depend on a live reservation; a pass on its own
    // blocks nothing, so it needs no hold.
    const needsHold = isGroup ? groupReady : consoleReady || selectedExtras.length > 0;
    if (needsHold && (!expiresAt || expiresAt <= Date.now())) {
      toast.error("Your reservation expired", { description: "Please choose your slot again." });
      setStep(1);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      // Phone step was skipped — make sure the number exists in our customer
      // roster now (visits are still credited when the session completes).
      if (!customer) {
        try {
          await registerFn({ data: { phone: form.phone.trim(), name: form.fullName.trim() } });
        } catch {
          /* non-blocking: the booking itself still records the phone number */
        }
      }

      const res = await bookFn({
        data: {
          branchId: branch.id,
          bookingType,
          ...(isGroup
            ? { startTime: groupStart!, groupRateId: groupRate!.id, groupMembers }
            : consoleReady
              ? { stationId: station!.id, startTime: startTime!, durationMinutes: durationMinutes! }
              : {}),
          date,
          players: players ?? 1,
          gameTitle: "",
          extras: isGroup
            ? []
            : selectedExtras
            .filter((e) => e.startTime && e.durationMinutes)
            .map((e) => ({
              stationId: e.station!.id,
              startTime: e.startTime!,
              durationMinutes: e.durationMinutes!,
              ...(e.rateId ? { rateId: e.rateId, extraHours: e.extraHours ?? 0 } : {}),
            })),
          passes: passLines.map((l) => ({ id: l.id, quantity: l.quantity })),
          ...(appliedPass ? { passCode: appliedPass.pass.code } : {}),

          cart: cart.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
          couponCode: coupon?.valid ? coupon.code : undefined,
          studentDiscount: studentEligible,
          useReward: rewardApplied,
          sessionToken: sessionToken(),
          customer: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            instructions: form.instructions.trim(),
          },
        },
      });
      if (!res.ok || !res.reference) {
        toast.error(res.message ?? "Could not create your booking. Please try again.");
        void refetchAvailability();
        submittingRef.current = false;
        return;
      }
      releasedRef.current = true;
      setExpiresAt(null);
      window.localStorage.removeItem(HOLD_KEY);
      void navigate({ to: "/pay/$reference", params: { reference: res.reference } });

    } catch {
      toast.error("Network problem — your booking was not created. Please try again.");
      submittingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  // Release the hold when the visitor abandons the flow.
  useEffect(() => {
    return () => {
      if (!releasedRef.current) {
        releasedRef.current = true;
        window.localStorage.removeItem(HOLD_KEY);
        void releaseFn({ data: { sessionToken: sessionToken() } });

      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const setQty = (id: string, name: string, price: number, qty: number) =>
    setCart((prev) => {
      const rest = prev.filter((l) => l.menuItemId !== id);
      return qty > 0 ? [...rest, { menuItemId: id, name, price, quantity: qty }] : rest;
    });
  const qtyOf = (id: string) => cart.find((l) => l.menuItemId === id)?.quantity ?? 0;

  /* Food becomes mandatory only when nothing gaming was picked. */

  const canAdvance =
    step === 0
      ? Boolean(branchId)
      : step === 1
        ? gamingComplete
        : step === 2
          ? hasGaming || cart.length > 0
          : true;
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  /** Scroll a required-but-empty area into view and pulse it in neon pink. */
  const highlight = (selector: string, message: string) => {
    if (typeof document === "undefined") return;
    toast.error("Something is missing", { description: message });
    const el = document.querySelector(selector);
    if (!el) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    document
      .querySelectorAll(".coc-flash, .coc-missing")
      .forEach((n) => n.classList.remove("coc-flash", "coc-missing"));
    // Restart the animation on repeated taps.
    void (el as HTMLElement).offsetWidth;
    el.classList.add("coc-flash", "coc-missing");
    (el as HTMLElement).dataset["missing"] = message;
    const input = el.querySelector("input, textarea, select") as HTMLElement | null;
    input?.focus({ preventScroll: true });
    window.setTimeout(() => el.classList.remove("coc-flash"), 3200);
  };

  /** What is still blocking the visitor on the current step. */
  const missingOnStep = (): { selector: string; message: string } | null => {
    if (step === 0)
      return branchId ? null : { selector: "#branch-step", message: "Please choose a branch to continue." };
    if (step === 1) {
      if (isGroup) {
        if (!groupRate)
          return { selector: "#gaming-party", message: "Choose a party booking duration." };
        if (!groupStart) return { selector: "#gaming-party", message: "Choose a start time for your party booking." };
        return null;
      }
      if (consoleTouched && !consoleReady) {
        if (!station)
          return { selector: "#gaming-console", message: "Choose a console or experience first." };
        if (!players)
          return { selector: "#field-players", message: "Choose how many players." };
        if (!durationMinutes)
          return { selector: "#field-duration", message: "Choose how long you want to play." };
        return {
          selector: "#field-start-time",
          message: "Choose a start time for your console session.",
        };
      }
      if (!extrasReady)
        return {
          selector: "#gaming-extras",
          message: "Complete the experience you selected — pick a start time and duration.",
        };
      if (appliedPass && !consoleReady)
        return { selector: "#gaming-console", message: "Pick a console, start time and duration to redeem your pass." };
      return null;
    }
    if (step === 2)
      return hasGaming || cart.length > 0
        ? null
        : { selector: "#food-step", message: "You haven't picked any gaming — add at least one food item." };
    return null;
  };

  const tryNext = () => {
    const miss = missingOnStep();
    if (miss) {
      highlight(miss.selector, miss.message);
      return;
    }
    goNext();
  };



  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-cyan" />
      </div>
    );
  }

  if (tabBlocked) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-amber-400/30 bg-amber-400/5 p-8 text-center backdrop-blur-2xl">
        <h2 className="text-xl font-black">Booking already open in another tab</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          To keep your reservation safe, only one booking session can run at a time. Finish or close the
          other tab, then reload this page.
        </p>
      </div>
    );
  }

  


  if (!customer && !skippedPhone) {
    return (
      <PhoneGate
        onReady={(c) => {
          setCustomer(c);
          setForm((f) => ({ ...f, fullName: c.name, phone: c.phone }));
        }}
        onSkip={() => setSkippedPhone(true)}
      />
    );
  }

  return (
    <div className="pb-40">
      <StepProgress step={step} />
      {customer && step !== 2 ? <LoyaltyStrip customer={customer} /> : null}


      {expiresAt ? (
        <div className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full border border-cyan/30 bg-cyan/5 px-4 py-2 text-xs font-bold text-cyan animate-[scale-in_0.25s_ease-out]">
          <Timer className="size-3.5" /> Slot reserved · {mmss}
        </div>
      ) : null}

      <div key={step} className="mt-8 animate-[step-in_0.55s_cubic-bezier(0.22,1,0.36,1)_both]">
        {/* ---------------- STEP 1 · BRANCH ---------------- */}
        {step === 0 ? (
          <section id="branch-step" className="space-y-8">

            <StepHead
              title="Choose your arena"
              hint="Pick the branch closest to you."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              {branches.map((b) => {
                const selected = b.id === branchId;
                const count = (catalogue?.stations ?? []).filter((s) => s.branch_id === b.id).length;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBranchId(b.id);
                      setStep(1);
                    }}

                    aria-pressed={selected}
                    className={cn(
                      "group relative overflow-hidden rounded-3xl border border-border bg-surface/60 p-5 text-left backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      "hover:-translate-y-1.5 hover:border-cyan/40 hover:shadow-[0_28px_70px_-32px_var(--primary)]",
                      selected &&
                        "border-transparent shadow-[0_0_0_1px_var(--cyan),0_28px_80px_-30px_var(--primary)]",
                    )}
                  >
                    {b.image_url ? (
                      <img
                        src={b.image_url}
                        alt={b.name}
                        loading="lazy"
                        className="aspect-[16/9] w-full rounded-2xl border border-border object-cover"
                      />
                    ) : (
                      <ImagePlaceholder label={`${b.name} photo`} className="aspect-[16/9]" />
                    )}
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-extrabold">{b.name}</p>
                        <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                          <MapPin className="mt-0.5 size-3 shrink-0" />
                          <span className="break-words">{b.address || "Address placeholder"}</span>
                        </p>
                      </div>
                      {selected ? (
                        <CheckCircle2 className="size-5 shrink-0 text-cyan animate-[scale-in_0.25s_ease-out]" />
                      ) : null}
                    </div>
                    <p className="mt-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-cyan">
                      {count} stations · {formatTime(b.opens_at)}–{formatTime(b.closes_at)}
                    </p>
                    <span
                      role="link"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(directionsUrl(b), "_blank", "noopener,noreferrer");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(directionsUrl(b), "_blank", "noopener,noreferrer");
                        }
                      }}
                      className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-cyan/40 px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-cyan transition-colors hover:bg-cyan/10"
                    >
                      <Navigation className="size-3.5" /> Get directions
                    </span>
                  </button>
                );
              })}
            </div>

          </section>
        ) : null}

        {/* ---------------- STEP 2 · GAMING (passes first) ---------------- */}
        {step === 1 ? (
          <section className="space-y-8">
            <PassRedeem
              applied={appliedPass}
              plannedMinutes={durationMinutes}
              {...(initialPassCode ? { initialCode: initialPassCode } : {})}
              onApply={(a) => {
                setAppliedPass(a);
                setPlayers(1);
                setExtras({});
                setBookingType("single");
                setPasses({});
                setPassesOn(false);
                setBranchId(a.pass.branchId);
                setConsoleOn(true);
                setDurationMinutes(null);
                setStartTime(null);
              }}
              onClear={() => {
                setAppliedPass(null);
                setDurationMinutes(null);
              }}
            />

            {appliedPass && !consoleReady ? (
              <p className="rounded-2xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-xs font-semibold text-amber-300">
                Pick your console, day and time below to redeem this pass.
              </p>
            ) : null}

            {passOptions.length && !appliedPass ? (

              <div
                className={cn(
                  "relative overflow-hidden rounded-[2rem] border border-violet/40 bg-linear-to-br from-violet/15 via-surface/70 to-cyan/10 p-5 shadow-[0_30px_90px_-45px_var(--violet)] backdrop-blur-xl transition-all duration-500 sm:p-6",
                  passesOn && "border-transparent shadow-[0_0_0_2px_var(--violet),0_30px_90px_-45px_var(--violet)]",
                )}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_15%_0%,color-mix(in_oklab,var(--violet)_28%,transparent),transparent_60%)]"
                />
                <div
                  onClick={() =>
                    setPassesOn((v) => {
                      if (v) setPasses({});
                      return !v;
                    })
                  }
                  className="relative grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4"
                >
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet/50 bg-violet/15 px-3 py-1 text-[0.55rem] font-black uppercase tracking-[0.22em] text-violet">
                      <Sparkles className="size-3" aria-hidden="true" /> Best value
                    </span>
                    <h3 className="mt-3 text-xl font-black sm:text-2xl">
                      Memberships &amp; Combos
                    </h3>
                    <p className="mt-1 max-w-xl text-xs text-muted-foreground sm:text-sm">
                      Turn on to see every membership and combo — your play time is covered.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={passesOn}
                    aria-label="Show memberships and combos"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPassesOn((v) => {
                        if (v) setPasses({});
                        return !v;
                      });
                    }}
                    className={cn(
                      "relative h-7 w-13 shrink-0 rounded-full border transition-all duration-300",
                      passesOn
                        ? "border-transparent bg-linear-to-r from-primary via-cyan to-violet"
                        : "border-border bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-6 rounded-full bg-foreground transition-all duration-300",
                        passesOn ? "left-6" : "left-0.5",
                      )}
                    />
                  </button>
                </div>

                {passesOn ? (
                  <div className="relative mt-6 grid animate-[step-in_0.5s_cubic-bezier(0.22,1,0.36,1)_both] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {passOptions.map((p) => {
                      const qty = passes[p.id] ?? 0;
                      const setQty = (n: number) =>
                        setPasses((prev) => {
                          const next = { ...prev };
                          if (n <= 0) delete next[p.id];
                          else next[p.id] = n;
                          return next;
                        });
                      return (
                        <div
                          key={p.id}
                          className={cn(
                            "flex flex-col rounded-3xl border border-border bg-background/60 p-5 text-left backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                            qty > 0 && "border-transparent shadow-[0_0_0_2px_var(--violet)]",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold">{p.name}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                {p.subtitle}
                              </p>
                            </div>
                            {p.badge ? (
                              <span className="shrink-0 rounded-full border border-violet/40 bg-violet/10 px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.16em] text-violet">
                                {p.badge}
                              </span>
                            ) : null}
                          </div>
                          {p.perks.length ? (
                            <ul className="mt-3 space-y-1.5">
                              {p.perks.slice(0, 4).map((perk) => (
                                <li key={perk} className="flex gap-2 text-[0.7rem] text-muted-foreground">
                                  <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-cyan" /> {perk}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <div className="mt-4 flex items-end justify-between gap-3 pt-1">
                            <span>
                              <span className="block text-lg font-black text-cyan">{inr(p.price)}</span>
                              {p.validity ? (
                                <span className="block text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                                  {p.validity}
                                </span>
                              ) : null}
                            </span>
                            <div className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface/70 p-1">
                              <button
                                type="button"
                                aria-label={`Remove one ${p.name}`}
                                disabled={qty === 0}
                                onClick={() => setQty(qty - 1)}
                                className="grid size-8 place-items-center rounded-full border border-border transition-colors hover:border-violet/50 disabled:opacity-40"
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <span className="w-5 text-center text-sm font-black">{qty}</span>
                              <button
                                type="button"
                                aria-label={`Add one ${p.name}`}
                                onClick={() => setQty(qty + 1)}
                                className="grid size-8 place-items-center rounded-full border border-border transition-colors hover:border-violet/50"
                              >
                                <Plus className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}



            {rewardMinutes > 0 ? (
              <div className="rounded-2xl border border-emerald-300/40 bg-emerald-300/5 px-4 py-3.5">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={useReward}
                    onChange={(e) => setUseReward(e.target.checked)}
                    className="size-4 accent-emerald-400"
                  />
                  <span className="text-sm font-bold text-emerald-200">
                    Use My Reward · {rewardLabel(rewardMinutes)} FREE
                    <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                      Book at least 1 hour of gaming and we add {rewardLabel(rewardMinutes)} of free play
                      right after your slot.
                    </span>
                  </span>
                </label>
                {useReward && durationMinutes && !rewardDurationOk ? (
                  <p className="mt-2 text-xs font-semibold text-amber-300">
                    A minimum 1 hour gaming booking is required to use your reward.
                  </p>
                ) : null}
                {useReward && rewardDurationOk && stationId && startTime && !rewardSlotFree ? (
                  <p className="mt-2 text-xs font-semibold text-amber-300">
                    The next time slot is unavailable. Please select another booking time or continue
                    without using your reward.
                  </p>
                ) : null}
                {rewardApplied && durationMinutes ? (
                  <p className="mt-2 text-xs font-semibold text-emerald-300">
                    Total play time · {durationLabel(durationMinutes + rewardMinutes)} — you pay for{" "}
                    {durationLabel(durationMinutes)} only.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div>
              <FieldLabel>Choose your day</FieldLabel>
              <div className="mt-3">
                <DatePickerChip
                  value={date}
                  onChange={setDate}
                  min={days[0]!}
                  max={days[days.length - 1]!}
                />
              </div>
            </div>



            <div className={cn(appliedPass && "hidden")}>
              <FieldLabel>Booking Type</FieldLabel>

              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
                {([
                  {
                    id: "single" as const,
                    title: "Regular Booking",
                    emoji: "🎮",
                    desc: "For individual gaming bookings.",
                  },
                  {
                    id: "group" as const,
                    title: "Party Booking",
                    emoji: "👥",
                    desc: `Reserve 2 consoles, VR Arena and Cockpit Racing for your group — up to ${GROUP_PASS_MAX_MEMBERS} members.`,
                  },
                ]).map((opt) => {
                  const active = bookingType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (bookingType === opt.id) return;
                        setBookingType(opt.id);
                        setStationId(null);
                        setStartTime(null);
                        setDurationMinutes(null);
                        setConsoleOn(false);
                        setExtras({});
                        setGroupStart(null);
                      }}
                      className={cn(
                        "relative rounded-2xl border p-3.5 text-left backdrop-blur-xl transition-all duration-300 sm:rounded-3xl sm:p-5",
                        active
                          ? "border-transparent bg-surface/80 shadow-[0_0_0_1px_var(--cyan)]"
                          : "border-border bg-surface/50 hover:border-cyan/40",
                      )}
                    >
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-extrabold sm:text-base">
                        <span>
                          <span className="mr-2">{opt.emoji}</span>
                          {opt.title}
                        </span>
                        {opt.id === "group" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-400/15 px-2 py-0.5 text-[0.52rem] font-black uppercase tracking-[0.18em] text-amber-300 shadow-[0_0_18px_-4px_rgba(251,191,36,0.7)] sm:px-2.5 sm:py-1 sm:text-[0.55rem]">
                            <Star className="size-2.5 fill-amber-300 text-amber-300" aria-hidden="true" />
                            Best value
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[0.68rem] leading-snug text-muted-foreground sm:mt-1.5 sm:line-clamp-none sm:text-xs">
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

            </div>

            {isGroup ? (
              <div
                id="gaming-party"
                className="space-y-5 rounded-3xl border border-border bg-surface/60 p-5 backdrop-blur-xl"
              >

                <div>
                  <FieldLabel>Number of members</FieldLabel>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Array.from({ length: GROUP_PASS_MAX_MEMBERS }, (_, i) => i + 1).map((n) => (
                      <Chip key={n} selected={groupMembers === n} onClick={() => setGroupMembers(n)}>
                        {n}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel>Duration</FieldLabel>
                  {groupRates.length ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {groupRates.map((r) => (
                        <DurationCard
                          key={r.id}
                          label={r.label}
                          price={Math.round(Number(r.price))}
                          selected={groupRateId === r.id}
                          onClick={() => {
                            setGroupRateId(r.id);
                            setGroupStart(null);
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Party Booking pricing has not been set up for this branch yet.
                    </p>
                  )}
                </div>

                {groupRate ? (
                  <div>
                    <FieldLabel>Start time</FieldLabel>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Only times where every gaming experience is free for the full duration are shown.
                    </p>
                    {groupSlots.length ? (
                      <div className="mt-3">
                        <SlotGrid
                          slots={slots}
                          value={groupStart}
                          onSelect={setGroupStart}
                          isDisabled={(slot) => groupSlotBlocked(slot, groupRate.duration_minutes)}
                        />
                      </div>
                    ) : (
                      <p className="mt-3 text-xs font-semibold text-amber-300">
                        No start time on this day has the whole café free for {groupRate.label}. Try
                        another day or a shorter duration.
                      </p>
                    )}
                  </div>
                ) : null}

                <p className="rounded-2xl border border-border bg-surface/50 px-4 py-3 text-xs text-muted-foreground">
                  This booking reserves 2 consoles, the VR Arena and Cockpit Racing exclusively for
                  your group during the selected time
                  {groupStationNames.length ? ` (${groupStationNames.join(", ")})` : ""}.
                </p>
              </div>
            ) : null}

            {!isGroup && consoles.length ? (
              <div id="gaming-console">
              <ConsoleSelect

                label={consoles[0]!.group_label?.trim() || "Console Gaming"}
                image={
                  experienceImageByType.get("console") ??
                  experienceImageByType.get("ps5") ??
                  consoles.find((s) => s.image_url)?.image_url ??
                  undefined
                }
                description={consoles[0]?.description ?? undefined}
                consoles={consoles}
                gamesFor={gamesFor}
                slots={slots}
                durations={durations}
                priceFor={(m) => rateFor(rates, players ?? 2, m)}
                players={players}
                playerOptions={appliedPass ? [1] : PLAYER_OPTIONS}
                playerPrice={(p) => rateFor(rates, p, 60)}
                onPlayers={setPlayers}
                startTime={startTime}
                onStartTime={setStartTime}
                durationMinutes={durationMinutes}
                onDuration={setDurationMinutes}
                stationId={stationId}
                onStation={(id) => {
                  setStationId(id);
                  setStartTime(null);
                  setDurationMinutes(null);
                }}
                enabled={consoleOn || Boolean(stationId)}
                onToggle={() => {
                  setConsoleOn((v) => {
                    if (v) {
                      setStationId(null);
                      setStartTime(null);
                      setDurationMinutes(null);
                    }
                    return !v;
                  });
                }}
                slotBlocked={slotBlocked}
                timeBlocked={(slot, minutes) => {
                  if (isToday && timeToMinutes(slot) + SLOT_GRACE_MINUTES <= nowMinutes) return true;
                  return timeToMinutes(slot) + minutes > closeMinutes;
                }}
                extraMinutes={useReward && rewardDurationOk ? rewardMinutes : 0}
              />
              </div>
            ) : null}

            <div id="gaming-extras" className="space-y-4">

              {(isGroup || passConsoleOnly
                ? []
                : experienceGroups.filter((g) => !g.isConsole)
              ).map((g) => {
                const isConsole = g.isConsole;
                const selectedId = isConsole
                  ? stationId
                  : (g.stations.find((s) => extras[s.id])?.id ?? null);
                const on = Boolean(selectedId);
                const active = g.stations.find((s) => s.id === selectedId) ?? null;
                const sel = active && !isConsole ? (extras[active.id] ?? null) : null;
                const curStart = isConsole ? startTime : (sel?.startTime ?? null);
                const curDuration = isConsole ? durationMinutes : (sel?.durationMinutes ?? null);
                const bookable = g.stations.filter((s) => s.status === "available");

                const toggle = () => {
                  if (on) {
                    if (isConsole) {
                      setStationId(null);
                      setStartTime(null);
                      setDurationMinutes(null);
                    } else {
                      setExtras((prev) => {
                        const next = { ...prev };
                        delete next[selectedId!];
                        return next;
                      });
                    }
                    return;
                  }
                  const first = bookable[0];
                  if (!first) return;
                  if (isConsole) {
                    setStationId(first.id);
                    setStartTime(null);
                    setDurationMinutes(null);
                  } else {
                    setExtras((prev) => ({
                      ...prev,
                      [first.id]: { startTime: null, durationMinutes: null, rateId: null, extraHours: 0 },
                    }));
                  }
                };

                const pick = (id: string) => {
                  if (isConsole) {
                    setStationId(id);
                    setStartTime(null);
                    setDurationMinutes(null);
                  } else {
                    setExtras((prev) => {
                      const next = { ...prev };
                      if (selectedId) delete next[selectedId];
                      next[id] = { startTime: null, durationMinutes: null, rateId: null, extraHours: 0 };
                      return next;
                    });
                  }
                };

                const setStart = (slot: string) => {
                  if (isConsole) setStartTime(slot);
                  else
                    setExtras((prev) => ({
                      ...prev,
                      [active!.id]: { ...prev[active!.id]!, startTime: slot },
                    }));
                };
                const setDur = (minutes: number) => {
                  if (isConsole) setDurationMinutes(minutes);
                  else
                    setExtras((prev) => ({
                      ...prev,
                      [active!.id]: {
                        ...prev[active!.id]!,
                        durationMinutes: minutes,
                        rateId: null,
                        extraHours: 0,
                      },
                    }));
                };
                /** Admin-managed price tiers for this experience (empty for consoles). */
                const tiers = isConsole ? [] : baseTiersFor(active?.id);
                const extraHourRate = isConsole ? null : extraHourRateFor(active?.id);
                const currentRateId = sel?.rateId ?? null;
                const currentTier = tiers.find((t) => t.id === currentRateId) ?? null;
                const extraHours = sel?.extraHours ?? 0;
                const setTier = (rateId: string, minutes: number) =>
                  setExtras((prev) => ({
                    ...prev,
                    [active!.id]: { ...prev[active!.id]!, rateId, durationMinutes: minutes, extraHours: 0 },
                  }));
                const setExtraHours = (hours: number) =>
                  setExtras((prev) => ({
                    ...prev,
                    [active!.id]: { ...prev[active!.id]!, extraHours: Math.max(0, hours) },
                  }));
                /** Minutes this experience will actually block. */
                const blockedMinutes = currentTier
                  ? Number(currentTier.duration_minutes) + extraHours * 60
                  : (curDuration ?? 30);
                const priceFor = (minutes: number) =>
                  isConsole
                    ? rateFor(rates, players ?? 2, minutes)
                    : currentTier
                      ? Math.round(Number(currentTier.price)) +
                        extraHours * Math.round(Number(extraHourRate?.price ?? 0))
                      : Math.round(slotPrice(active!, minutes));

                return (
                  <div
                    key={g.label}
                    className={cn(
                      "overflow-hidden rounded-3xl border border-border bg-surface/60 p-5 backdrop-blur-xl transition-all duration-500",
                      on && "border-transparent shadow-[0_0_0_1px_var(--cyan)]",
                      !bookable.length && "opacity-50",
                    )}
                  >
                    <div
                      onClick={() => {
                        if (bookable.length) toggle();
                      }}
                      className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {(() => {
                          // Station image first; otherwise fall back to the first
                          // game artwork the admin set on any station in this group.
                          const img =
                            g.stations
                              .map((s) => experienceImageByType.get(s.station_type))
                              .find(Boolean) ??
                            g.stations.find((s) => s.image_url)?.image_url ??
                            g.stations
                              .flatMap((s) => gamesFor(s.id))
                              .find((game) => game.image_url)?.image_url;
                          return img ? (
                            <img
                              src={img}
                              alt=""
                              loading="lazy"
                              className="size-11 shrink-0 rounded-2xl border border-border object-cover"
                            />
                          ) : null;
                        })()}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold">
                            {g.label}
                            <span className="ml-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-cyan">
                              {g.stations.length} available
                            </span>
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {bookable.length
                              ? `${active?.description ?? g.stations[0]?.description ?? ""} ${
                                  isConsole
                                    ? `From ${inr(rateFor(rates, players ?? 2, 60))}/hr`
                                    : (() => {
                                        const list = baseTiersFor((active ?? g.stations[0])!.id);
                                        return list.length
                                          ? `From ${inr(Math.min(...list.map((r) => Number(r.price))))}`
                                          : `${inr(Number((active ?? g.stations[0])!.hourly_price))}/hr`;
                                      })()
                                }`.trim()
                              : "Currently unavailable"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-expanded={on}
                        disabled={!bookable.length}
                        aria-label={`${on ? "Hide" : "Show"} ${g.label} options`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle();
                        }}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-[0.68rem] font-bold uppercase tracking-[0.16em] transition-all duration-300 disabled:cursor-not-allowed",
                          on
                            ? "border-transparent bg-linear-to-r from-primary via-cyan to-violet text-primary-foreground"
                            : "border-border bg-surface/60 hover:border-cyan/50",
                        )}
                      >
                        {on ? "Selected" : "Select"}
                        <ChevronDown
                          aria-hidden="true"
                          className={cn("size-4 transition-transform duration-300", on && "rotate-180")}
                        />
                      </button>
                    </div>

                    {on && active ? (
                      <div className="mt-6 space-y-7 animate-[step-in_0.5s_cubic-bezier(0.22,1,0.36,1)_both]">
                        <div>
                          <FieldLabel>Choose your {g.label.toLowerCase()}</FieldLabel>
                          <select
                            value={active.id}
                            onChange={(e) => pick(e.target.value)}
                            className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-3 text-sm font-semibold outline-none focus:border-cyan/50"
                          >
                            {g.stations.map((s) => (
                              <option key={s.id} value={s.id} disabled={s.status !== "available"}>
                                {s.name}
                                {s.status !== "available" ? " — unavailable" : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        {active.image_url ? (
                          <img
                            src={active.image_url}
                            alt={active.name}
                            loading="lazy"
                            className="aspect-[16/9] w-full rounded-2xl border border-border object-cover"
                          />
                        ) : null}

                        {(() => {
                          const libraryGames = gamesFor(active.id);
                          const games = libraryGames.length
                            ? libraryGames
                            : active.games.map((title) => ({
                                id: title,
                                station_id: active.id,
                                branch_id: active.branch_id,
                                name: title,
                                image_url: null,
                                sort_order: 0,
                              }));
                          return games.length ? (
                            <ViewGamesButton title={active.name} games={games} />
                          ) : null;
                        })()}

                        <div>
                          <FieldLabel>Available start times</FieldLabel>
                          <SlotGrid
                            slots={
                              active.station_type === "vr" ||
                              active.station_type === "driving_simulator"
                                ? fineSlots
                                : slots
                            }
                            value={curStart}
                            isDisabled={(slot) => slotBlocked(active.id, slot, blockedMinutes)}
                            onSelect={setStart}
                          />
                        </div>

                        {curStart ? (
                          <div className="animate-[step-in_0.5s_cubic-bezier(0.22,1,0.36,1)_both] space-y-7">
                            <div>
                              <FieldLabel>{tiers.length ? "Package" : "Duration"}</FieldLabel>
                              {tiers.length ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {tiers.map((t) => {
                                    const blocked = slotBlocked(active.id, curStart, t.duration_minutes);
                                    return (
                                      <button
                                        key={t.id}
                                        type="button"
                                        disabled={blocked}
                                        onClick={() => setTier(t.id, t.duration_minutes)}
                                        className={cn(
                                          "rounded-2xl border border-border bg-surface/60 px-4 py-3 text-left transition-all duration-300",
                                          "hover:-translate-y-0.5 hover:border-cyan/40 disabled:cursor-not-allowed disabled:opacity-40",
                                          currentRateId === t.id &&
                                            "border-transparent shadow-[0_0_0_1px_var(--cyan)]",
                                        )}
                                      >
                                        <span className="flex items-baseline justify-between gap-3">
                                          <span className="text-sm font-bold">{t.label}</span>
                                          <span className="text-base font-black text-cyan">
                                            {inr(Number(t.price))}
                                          </span>
                                        </span>
                                        <span className="mt-1 block text-[0.65rem] text-muted-foreground">
                                          {t.note ? `${t.note} · ` : ""}
                                          {t.duration_minutes} mins
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                  {durations.map((d) => (
                                    <DurationCard
                                      key={d.minutes}
                                      label={d.label}
                                      price={priceFor(d.minutes)}
                                      selected={curDuration === d.minutes}
                                      disabled={slotBlocked(active.id, curStart, d.minutes)}
                                      onClick={() => setDur(d.minutes)}
                                    />
                                  ))}
                                </div>
                              )}

                              {currentTier && extraHourRate ? (
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/50 px-4 py-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold">{extraHourRate.label}</p>
                                    <p className="text-[0.65rem] text-muted-foreground">
                                      {inr(Number(extraHourRate.price))} per extra hour · your slot is held
                                      for {Math.round(blockedMinutes / 60)}h
                                      {blockedMinutes % 60 ? ` ${blockedMinutes % 60}m` : ""}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      aria-label="Remove one extra hour"
                                      disabled={extraHours === 0}
                                      onClick={() => setExtraHours(extraHours - 1)}
                                      className="grid size-9 place-items-center rounded-full border border-border text-lg font-bold transition-colors hover:border-cyan/50 disabled:opacity-30"
                                    >
                                      −
                                    </button>
                                    <span className="w-6 text-center text-sm font-black">{extraHours}</span>
                                    <button
                                      type="button"
                                      aria-label="Add one extra hour"
                                      disabled={slotBlocked(active.id, curStart, blockedMinutes + 60)}
                                      onClick={() => setExtraHours(extraHours + 1)}
                                      className="grid size-9 place-items-center rounded-full border border-border text-lg font-bold transition-colors hover:border-cyan/50 disabled:opacity-30"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            {isConsole ? (
                              <div>
                                <FieldLabel>Players</FieldLabel>
                                <div className="flex flex-wrap gap-2">
                                  {PLAYER_OPTIONS.map((p) => (
                                    <Chip key={p} selected={players === p} onClick={() => setPlayers(p)}>
                                      {p} {p === 1 ? "Player" : "Players"}
                                      <span className="ml-2 text-[0.65rem] font-bold text-muted-foreground">
                                        {inr(rateFor(rates, p, 60))}/hr
                                      </span>
                                    </Chip>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {curDuration ? (
                              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan/25 bg-cyan/5 px-4 py-3 animate-[scale-in_0.3s_ease-out]">
                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">
                                  {active.name} · {formatTime(curStart)} –{" "}
                                  {formatTime(addMinutes(curStart, isConsole ? curDuration : blockedMinutes))}
                                  {isConsole
                                    ? ` · ${players ?? "—"} ${players === 1 ? "player" : "players"}`
                                    : ""}
                                </span>
                                <span className="text-xl font-black">{inr(priceFor(curDuration))}</span>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}


        {/* ---------------- STEP 3 · FOOD ---------------- */}
        {step === 2 ? (
          <section id="food-step" className="space-y-8">

            <FoodBanner caption="Food & drinks" />
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-2xl font-black sm:text-3xl">Food &amp; drinks</h2>
              {hasGaming ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-2 coc-cta px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-transform hover:scale-[1.03]"
                >
                  Skip food <ArrowRight className="size-3.5" />
                </button>
              ) : null}
            </div>

            <div className="space-y-8">
              {Object.entries(
                menu.reduce<Record<string, typeof menu>>((acc, m) => {
                  (acc[m.category] ??= []).push(m);
                  return acc;
                }, {}),
              ).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-cyan">{cat}</h3>
                  <ul className="mt-3 divide-y divide-border/60 rounded-3xl border border-border bg-surface/50 backdrop-blur-xl">
                    {items.map((m) => {
                      const qty = qtyOf(m.id);
                      return (
                        <li
                          key={m.id}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 transition-colors duration-300",
                            qty > 0 && "bg-cyan/5",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{m.name}</span>
                          <span className="shrink-0 text-sm font-black text-cyan">
                            {inr(Number(m.price))}
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              aria-label={`Remove one ${m.name}`}
                              disabled={qty === 0}
                              onClick={() => setQty(m.id, m.name, Number(m.price), qty - 1)}
                              className="grid size-8 place-items-center rounded-lg border border-border transition-colors hover:border-cyan/40 disabled:opacity-30"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="w-5 text-center text-sm font-bold">{qty}</span>
                            <button
                              type="button"
                              aria-label={`Add one ${m.name}`}
                              onClick={() => setQty(m.id, m.name, Number(m.price), qty + 1)}
                              className="grid size-8 place-items-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan transition-transform hover:scale-110"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            {!menu.length ? (
              <p className="text-sm text-muted-foreground">Menu coming soon.</p>
            ) : null}
          </section>
        ) : null}

        {/* ---------------- STEP 5 · CHECKOUT ---------------- */}
        {step === 3 ? (
          <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-6">
              <StepHead title="Your details" hint="No payment now — we confirm everything by phone." />
              <div className="space-y-3">
                <div id="field-fullName">
                  <Field
                    label="Full name"
                    value={form.fullName}
                    onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
                    {...(errors.fullName ? { error: errors.fullName } : {})}
                    required
                    autoComplete="name"
                  />
                </div>
                <div id="field-phone">
                  <Field
                    label="Phone number"
                    value={form.phone}
                    onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                    type="tel"
                    {...(errors.phone ? { error: errors.phone } : {})}
                    required
                    autoComplete="tel"
                  />
                </div>

                <Field
                  label="Special instructions (optional)"
                  value={form.instructions}
                  onChange={(v) => setForm((f) => ({ ...f, instructions: v }))}
                  textarea
                />
              </div>

              <div>
                <FieldLabel>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-400/15 px-3 py-1 text-amber-300 shadow-[0_0_20px_-6px_rgba(251,191,36,0.8)]">
                    🎟️ Coupon code
                  </span>
                </FieldLabel>
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon"
                    className="min-w-0 flex-1 rounded-xl border-2 border-amber-300/70 bg-amber-400/10 px-3 py-2.5 text-sm font-bold tracking-[0.12em] text-amber-200 shadow-[0_0_28px_-8px_rgba(251,191,36,0.75)] outline-none transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-amber-200/40 focus:border-amber-300 focus:shadow-[0_0_36px_-6px_rgba(251,191,36,0.9)]"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponBusy || !couponInput.trim()}
                    className="shrink-0 coc-cta px-5 text-sm font-bold transition-transform hover:scale-[1.03] disabled:opacity-40"
                  >
                    {couponBusy ? <Loader2 className="size-4 animate-spin" /> : "Apply coupon"}
                  </button>
                </div>
                {coupon ? (
                  <div className="mt-2 space-y-1">
                    <p className={cn("text-xs", coupon.valid ? "text-emerald-300" : "text-rose-300")}>
                      {coupon.valid && coupon.discount
                        ? `Coupon Applied · − ${inr(coupon.discount)}`
                        : coupon.message}
                    </p>
                    {coupon.valid ? (
                      <p className="text-[0.65rem] text-muted-foreground">
                        {coupon.code} · Active · Used {coupon.timesUsed ?? 0} times ·{" "}
                        {coupon.remainingUses == null
                          ? "Unlimited uses left"
                          : `${coupon.remainingUses} uses left`}
                        {coupon.expiresAt
                          ? ` · Expires ${new Date(coupon.expiresAt).toLocaleDateString("en-IN")}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                ) : null}

              </div>

              <div className="rounded-2xl border border-border bg-surface/50 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isStudent}
                    onChange={(e) => setIsStudent(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="text-sm font-bold">I am a Student (20% OFF)</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Applicable on bills of ₹1,000 and above.
                    </span>
                  </span>
                </label>

                {isStudent && !studentEligible ? (
                  <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
                    Student Discount applies to gaming charges only, on gaming totals above ₹1000.
                  </p>
                ) : null}

                <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/8 p-3.5">
                  <p className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-amber-200">
                    <AlertTriangle className="size-3.5" /> Student Discount Terms
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-amber-100/85">
                    <li>• Valid Student ID is mandatory.</li>
                    <li>• Student ID will be verified at the café before your gaming session.</li>
                    <li>
                      • If a valid Student ID is not produced during check-in, the discount will be
                      removed and the remaining amount must be paid before the booking starts.
                    </li>
                  </ul>
                </div>
              </div>
            </div>


            <aside className="lg:sticky lg:top-6 lg:h-fit">
              <div className="relative overflow-hidden rounded-3xl border border-border bg-surface/70 p-5 backdrop-blur-2xl shadow-[0_40px_100px_-50px_var(--primary)]">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan to-transparent"
                />
                <h2 className="text-sm font-extrabold uppercase tracking-[0.2em]">Booking summary</h2>
                <dl className="mt-5 space-y-2.5 text-sm">
                  <Row label="Branch" value={branch?.name ?? "—"} />
                  <Row
                    label="Date"
                    value={new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  />
                  <Row label="Booking type" value={isGroup ? "Party Booking" : "Regular Booking"} />
                  {isGroup ? (
                    <>
                      <Row label="Members" value={String(groupMembers)} />
                      <Row label="Duration" value={groupRate?.label ?? "—"} />
                      <Row
                        label="Time"
                        value={
                          groupStart && groupRate
                            ? `${formatTime(groupStart)} – ${formatTime(addMinutes(groupStart, groupRate.duration_minutes))}`
                            : "—"
                        }
                      />
                      <Row label="Price" value={groupAmount ? inr(groupAmount) : "—"} />
                    </>
                  ) : (
                    <>
                      <Row label="PlayStation" value={station?.name ?? "—"} />
                      <Row
                        label="Duration"
                        value={
                          startTime && durationMinutes
                            ? `${formatTime(startTime)} – ${formatTime(
                                addMinutes(
                                  startTime,
                                  durationMinutes + (rewardApplied ? rewardMinutes : 0),
                                ),
                              )}${
                                rewardApplied
                                  ? ` (${durationLabel(durationMinutes + rewardMinutes)} incl. ${rewardLabel(rewardMinutes)} free)`
                                  : ` (${durationLabel(durationMinutes)})`
                              }`
                            : "—"
                        }
                      />

                      <Row label="Players" value={players ? String(players) : "—"} />
                    </>
                  )}
                  {(isGroup ? [] : selectedExtras).map((e) => (
                    <Row
                      key={e.station!.id}
                      label={e.station!.name}
                      value={
                        e.startTime && e.durationMinutes
                          ? `${formatTime(e.startTime)} – ${formatTime(addMinutes(e.startTime, totalMinutes(e)!))}`
                          : "—"
                      }
                    />
                  ))}
                  {passLines.map((l) => (
                    <Row key={l.id} label={l.name} value={`× ${l.quantity}`} />
                  ))}
                  {cart.length ? (
                    cart.map((l) => (
                      <Row
                        key={l.menuItemId}
                        label={`${l.quantity} × ${l.name}`}
                        value={inr(l.price * l.quantity)}
                      />
                    ))
                  ) : (
                    <Row label="Food" value="—" />
                  )}
                </dl>
                {isGroup ? (
                  <p className="mt-4 rounded-2xl border border-cyan/25 bg-cyan/5 px-4 py-3 text-[0.68rem] text-cyan">
                    This booking reserves 2 consoles, the VR Arena and Cockpit Racing exclusively for
                    your group during the selected time
                    {groupStationNames.length ? ` (${groupStationNames.join(", ")})` : ""}.
                  </p>
                ) : null}
                <div className="mt-5 border-t border-border pt-4">
                  <BillSummary
                    gamingLines={gamingLines}
                    foodLines={foodLines}
                    bill={bill}
                    couponCode={coupon?.valid ? (coupon.code ?? null) : null}
                    couponCategory={coupon?.valid ? ((coupon.category ?? "entire_bill") as CouponCategory) : null}
                    taxPercent={Number(branch?.tax_percent ?? 0)}
                    reward={
                      rewardApplied && durationMinutes
                        ? { bookedMinutes: durationMinutes, rewardMinutes }
                        : null
                    }
                    footer={
                      <p className="flex items-center justify-center gap-1.5 text-[0.65rem] text-muted-foreground">
                        <ShieldCheck className="size-3.5 text-cyan" /> No payment now — we confirm by phone
                      </p>
                    }
                  />
                </div>
              </div>
            </aside>
          </section>
        ) : null}
      </div>

      {/* ---------------- STICKY SUMMARY BAR ---------------- */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-stretch gap-2 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {[
                branch?.name,
                isGroup ? `Party Booking · ${groupMembers} members` : null,
                isGroup && groupStart && groupRate
                  ? `${formatTime(groupStart)} · ${groupRate.label}`
                  : null,
                isGroup ? null : station?.name,
                !isGroup && startTime && durationMinutes
                  ? `${formatTime(startTime)} · ${durationLabel(durationMinutes + (rewardApplied ? rewardMinutes : 0))}`
                  : null,

                !isGroup && selectedExtras.length ? `+ ${selectedExtras.length} experience(s)` : null,
                passLines.length ? `${passLines.reduce((s, l) => s + l.quantity, 0)} pass(es)` : null,
                cart.length ? `${cart.reduce((s, l) => s + l.quantity, 0)} food items` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Start by choosing a branch"}
            </p>
            <p className="mt-0.5 flex items-baseline gap-2">
              <span className="text-[0.62rem] uppercase tracking-[0.18em] text-cyan">Estimated total</span>
              <span key={bill.grandTotal} className="text-xl font-black animate-[scale-in_0.25s_ease-out]">
                {inr(bill.grandTotal)}
              </span>
            </p>
          </div>
          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-colors hover:border-cyan/40 sm:flex-none"
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>
            ) : null}

            {step === 0 ? null : step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={tryNext}
                aria-disabled={!canAdvance}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-2 coc-cta px-6 py-3 text-xs font-extrabold uppercase tracking-[0.18em] transition-all duration-300 hover:scale-[1.03] active:scale-[0.99] sm:flex-none",
                  !canAdvance && "opacity-60",
                )}
              >
                Next <ArrowRight className="size-3.5" />
              </button>

            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 coc-cta px-6 py-3 text-xs font-extrabold uppercase tracking-[0.18em] transition-transform hover:scale-[1.03] active:scale-[0.99] disabled:opacity-60 sm:flex-none"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm Booking
              </button>

            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepProgress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div
            key={label}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border text-[0.6rem] font-black transition-all duration-500",
                    done && "border-transparent bg-cyan text-background",
                    active && "border-cyan bg-cyan/15 text-cyan",
                    !done && !active && "border-border text-muted-foreground",
                  )}
                >
                  {done ? <CheckCircle2 className="size-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "truncate text-[0.62rem] font-bold uppercase tracking-[0.2em] transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>
              <span
                className={cn(
                  "mt-2 block h-0.5 w-full rounded-full transition-all duration-700",
                  done || active
                    ? "bg-linear-to-r from-primary via-cyan to-violet"
                    : "bg-border",
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepHead({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h2 className="text-2xl font-black sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Opens the games library popup for a non-console station (VR, lounge, theatre…). */
function ViewGamesButton({ title, games }: { title: string; games: StationGame[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.24em] text-cyan">
        {games.length} {games.length === 1 ? "game installed" : "games installed"}
      </p>
      <CardAction onClick={() => setOpen(true)} className="max-w-44 flex-none">
        <LibraryBig className="size-3.5" /> View games
      </CardAction>
      <GamesModal open={open} title={title} games={games} onClose={() => setOpen(false)} />
    </div>
  );
}

function FieldLabel({ children, tone = "cyan" }: { children: React.ReactNode; tone?: "cyan" | "violet" }) {
  return (
    <p
      className={cn(
        "mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.24em]",
        tone === "cyan" ? "text-cyan" : "text-violet",
      )}
    >
      {children}
    </p>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("truncate text-right", strong ? "font-bold" : "font-semibold")}>{value}</dd>
    </div>
  );
}

function ConsoleCard({
  station,
  expanded,
  fullyBooked,
  onToggle,
  children,
}: {
  station: Station;
  expanded: boolean;
  fullyBooked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const status =
    station.status !== "available" ? "maintenance" : fullyBooked ? "booked" : "available";
  const disabled = station.status !== "available";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-border bg-surface/60 backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        !disabled && "hover:border-cyan/40 hover:shadow-[0_28px_70px_-34px_var(--primary)]",
        expanded && "border-transparent shadow-[0_0_0_1px_var(--cyan),0_36px_90px_-40px_var(--primary)]",
        disabled && "opacity-50",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        aria-expanded={expanded}
        className="grid w-full grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-4 p-4 text-left disabled:cursor-not-allowed"
      >
        <ImagePlaceholder label="Station" className="aspect-square w-22" />
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-base font-extrabold">
            <Gamepad2 className="size-4 shrink-0 text-cyan" />
            {station.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {station.description ?? "Premium station placeholder description"}
          </p>
          <span className="mt-2 inline-block">
            <StatusTag
              tone={status}
              label={
                status === "available" ? "Available" : status === "booked" ? "Fully booked" : "Maintenance"
              }
            />
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform duration-500",
            expanded && "rotate-180 text-cyan",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-600 ease-[cubic-bezier(0.22,1,0.36,1)]",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-4 pb-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

