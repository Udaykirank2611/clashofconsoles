import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Public, admin-managed homepage content.
 * Nothing here is hardcoded — every price and label comes from the database
 * so the admin dashboard stays the single source of truth.
 */

export interface Experience {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
  starting_price: number;
  price_unit: string;
  branch_ids: string[];
  station_type: string | null;
  is_exclusive: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface MembershipPlan {
  id: string;
  name: string;
  hours_included: number;
  price: number;
  validity: string;
  perks: string[];
  badge: string;
  is_popular: boolean;
  is_visible: boolean;
  sort_order: number;
}

export interface ExperienceRate {
  id: string;
  branch_id: string;
  experience_slug: string;
  group_label: string;
  label: string;
  price: number;
  note: string;
  sort_order: number;
  is_active: boolean;
}


export interface SiteOffer {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  validity: string;
  features: string[];
  discount_percent: number;
  min_bill: number;
  offer_text: string;
  is_visible: boolean;
}

export interface SiteBranch {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  image_url: string | null;
  opens_at: string;
  closes_at: string;
  map_url: string | null;
}

export interface SiteMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
}

/** Home page food category card — the only place menu imagery lives. */
export interface MenuCategory {
  id: string;
  slug: string;
  title: string;
  description: string;
  image_url: string | null;
  starting_price: number;
  sort_order: number;
}

export interface SiteContent {
  loading: boolean;
  experiences: Experience[];
  plans: MembershipPlan[];
  unlimitedPass: SiteOffer | null;
  studentOffer: SiteOffer | null;
  comboOffer: SiteOffer | null;
  rates: ExperienceRate[];
  branches: SiteBranch[];
  menu: SiteMenuItem[];
  menuCategories: MenuCategory[];
}

const EMPTY: SiteContent = {
  loading: true,
  experiences: [],
  plans: [],
  unlimitedPass: null,
  studentOffer: null,
  comboOffer: null,
  rates: [],
  branches: [],
  menu: [],
  menuCategories: [],
};

/** Loads all admin-managed homepage content and keeps it live. */
export function useSiteContent(): SiteContent {
  const [state, setState] = useState<SiteContent>(EMPTY);

  const load = useCallback(async () => {
    const [exp, cards, branches, menu, cats, stations, stationRates, sessions] = await Promise.all([
      supabase.from("experiences").select("*").eq("is_active", true).order("sort_order"),
      // Shared marketing content — identical for every branch.
      supabase.from("homepage_cards").select("*").eq("is_visible", true).order("sort_order"),
      supabase.from("branches").select("*").eq("is_active", true).order("sort_order"),
      supabase
        .from("menu_items")
        .select("id, name, category, price, sort_order")
        .eq("is_available", true)
        .order("sort_order"),
      supabase.from("menu_categories").select("*").eq("is_visible", true).order("sort_order"),
      // Live operational truth — the same rows the booking flow uses.
      supabase.from("gaming_stations").select("id, branch_id, station_type, status").order("sort_order"),
      supabase.from("station_rates").select("*").eq("is_active", true).order("sort_order"),
      supabase
        .from("session_options")
        .select("id, branch_id, label, players, duration_minutes, price, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
    ]);

    const cardRows = cards.data ?? [];
    const toOffer = (kind: string): SiteOffer | null => {
      const c = cardRows.find((r) => r.kind === kind);
      if (!c) return null;
      return {
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        price: Number(c.starting_price),
        validity: c.body,
        features: (c.features ?? []) as string[],
        discount_percent: Number(c.discount_percent),
        min_bill: Number(c.min_bill),
        offer_text: c.body,
        is_visible: c.is_visible,
      };
    };

    const plans: MembershipPlan[] = cardRows
      .filter((c) => c.kind === "membership")
      .map((c) => ({
        id: c.id,
        name: c.title,
        hours_included: Number((c as { hours_included?: number }).hours_included ?? 0),
        price: Number(c.starting_price),
        validity: c.subtitle,
        perks: (c.features ?? []) as string[],
        badge: c.badge,
        is_popular: c.badge?.toLowerCase().includes("best") ?? false,
        is_visible: c.is_visible,
        sort_order: c.sort_order,
      }));

    // The home page never stores its own prices: branches, rate cards and
    // "starting from" figures are derived from the stations the admin manages,
    // so anything added or edited in the dashboard shows up here automatically.
    const { experiences, rates: derivedRates } = deriveExperiences(
      (exp.data ?? []) as unknown as Experience[],
      (stations.data ?? []) as SiteStationRow[],
      (stationRates.data ?? []) as unknown as StationRateRow[],
      (sessions.data ?? []) as unknown as SessionRow[],
    );

    setState({
      loading: false,
      experiences,
      plans,
      unlimitedPass: toOffer("unlimited_pass"),
      studentOffer: toOffer("student_offer"),
      comboOffer: toOffer("combo_offer"),
      rates: derivedRates,
      branches: (branches.data ?? []) as unknown as SiteBranch[],
      // The same item exists per branch — the public menu shows each dish once.
      menu: dedupeMenu((menu.data ?? []) as unknown as SiteMenuItem[]),
      menuCategories: (cats.data ?? []) as unknown as MenuCategory[],
    });
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("site-content")
      .on("postgres_changes", { event: "*", schema: "public", table: "experiences" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "homepage_cards" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_categories" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "gaming_stations" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "station_rates" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "session_options" }, () => void load())
      .subscribe();


    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  return state;
}

interface SiteStationRow {
  id: string;
  branch_id: string;
  station_type: string;
  status: string;
}

interface StationRateRow {
  id: string;
  station_id: string;
  branch_id: string;
  label: string;
  note: string;
  duration_minutes: number;
  price: number;
  sort_order: number;
  is_extra_hour: boolean;
}

interface SessionRow {
  id: string;
  branch_id: string;
  label: string;
  players: number | null;
  duration_minutes: number;
  price: number;
  sort_order: number;
}

const playersLabel = (players: number | null) =>
  players && players > 1 ? `${players} Players` : "Single Player";

/**
 * Rebuilds every experience card from the live station catalogue:
 * which branches offer it, what it starts at, and its full rate table.
 * A station added, renamed, priced or disabled in the dashboard changes
 * the home page and the booking flow at the same time.
 */
function deriveExperiences(
  rows: Experience[],
  stations: SiteStationRow[],
  stationRates: StationRateRow[],
  sessions: SessionRow[],
): { experiences: Experience[]; rates: ExperienceRate[] } {
  const rates: ExperienceRate[] = [];
  const experiences: Experience[] = [];

  for (const exp of rows) {
    if (!exp.station_type) {
      experiences.push(exp);
      continue;
    }
    const mine = stations.filter((s) => s.station_type === exp.station_type && s.status !== "blocked");
    const branchIds = [...new Set(mine.map((s) => s.branch_id))];

    // Cheapest tier wins when two branches price the same package differently.
    const cheapest = new Map<string, ExperienceRate>();
    const push = (row: ExperienceRate) => {
      const key = `${row.branch_id}|${row.group_label}|${row.label}`;
      const prev = cheapest.get(key);
      if (!prev || row.price < prev.price) cheapest.set(key, row);
    };

    const hourlyOnly: number[] = [];
    if (exp.station_type === "console") {
      for (const s of sessions) {
        if (branchIds.includes(s.branch_id) && s.duration_minutes === 60) hourlyOnly.push(Number(s.price));
        if (!branchIds.includes(s.branch_id)) continue;
        push({
          id: s.id,
          branch_id: s.branch_id,
          experience_slug: exp.slug,
          group_label: playersLabel(s.players),
          label: s.label,
          price: Number(s.price),
          note: "",
          sort_order: (s.players ?? 1) * 1000 + s.duration_minutes,
          is_active: true,
        });
      }
    } else {
      const ids = new Set(mine.map((s) => s.id));
      for (const r of stationRates) {
        if (!ids.has(r.station_id)) continue;
        push({
          id: r.id,
          branch_id: r.branch_id,
          experience_slug: exp.slug,
          group_label: r.is_extra_hour ? "Add-ons" : "",
          label: r.label,
          price: Number(r.price),
          note: r.note ?? "",
          sort_order: r.sort_order,
          is_active: true,
        });
      }
    }

    const rows2 = [...cheapest.values()].sort((a, b) => a.sort_order - b.sort_order);
    rates.push(...rows2);
    // "Starting from" should match the advertised unit (per hour for consoles).
    const base = hourlyOnly.length
      ? hourlyOnly
      : rows2.filter((r) => r.group_label !== "Add-ons").map((r) => r.price);
    experiences.push({
      ...exp,
      branch_ids: branchIds,
      starting_price: base.length ? Math.min(...base) : Number(exp.starting_price),
      is_exclusive: branchIds.length === 1 && new Set(stations.map((s) => s.branch_id)).size > 1,
    });
  }

  return { experiences, rates };
}

/** Collapses per-branch duplicates of the same dish, keeping the lowest price. */
function dedupeMenu(rows: SiteMenuItem[]): SiteMenuItem[] {
  const map = new Map<string, SiteMenuItem>();
  for (const r of rows) {
    const key = `${r.category}|${r.name}`.toLowerCase();
    const prev = map.get(key);
    if (!prev || Number(r.price) < Number(prev.price)) map.set(key, r);
  }
  return [...map.values()];
}

/** ₹ formatting used across every public price. */
export const inr = (n: number) => `₹${Math.round(Number(n)).toLocaleString("en-IN")}`;

/** "10:00" → "10:00 AM" */
export function prettyTime(t: string) {
  const [h = "0", m = "00"] = t.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${m} ${suffix}`;
}
