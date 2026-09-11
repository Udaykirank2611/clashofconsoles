import { useMemo, useState } from "react";
import { useAdminSession } from "@/lib/admin/useAdminSession";
import { useBranchData } from "@/lib/admin/useBranchData";
import { AdminButton, Panel, StatCard, money } from "./primitives";
import { BookingsPanel, StatusPill } from "./BookingsPanel";
import { CustomersPanel } from "./CustomersPanel";
import { MembershipPassesPanel } from "./MembershipPassesPanel";
import { StationsPanel } from "./StationsPanel";
import { GamesShowcasePanel } from "./GamesShowcasePanel";
import { PricingPanel } from "./PricingPanel";
import { CouponsPanel } from "./CouponsPanel";
import { MenuPanel } from "./MenuPanel";
import { SettingsPanel } from "./SettingsPanel";
import { MessagesPanel } from "./MessagesPanel";
import { PaymentSettingsPanel } from "./PaymentSettingsPanel";

import { OwnerPanel } from "./OwnerPanel";
import { HomepagePanel } from "./HomepagePanel";
import { OffersPanel } from "./OffersPanel";
import { formatTime } from "@/lib/booking/pricing";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { AnalyticsView } from "./analytics/AnalyticsView";
import { ReportsView } from "./analytics/ReportsView";
import { TodayPanel } from "./analytics/TodayPanel";
import { BookingCalendar } from "./calendar/BookingCalendar";
import { DailyClosingView } from "./closing/DailyClosingView";
import { TransactionsView } from "./transactions/TransactionsView";
import { ReconciliationView } from "./transactions/ReconciliationView";

/** Always-visible tabs — the day-to-day workflow. */
const PRIMARY_TABS = ["Dashboard", "Bookings", "Transactions", "Customers"] as const;
/** Everything else lives behind the "More" dropdown. */
const MORE_TABS = [
  "Booking Calendar",
  "Reconciliation",
  "Memberships",
  "Daily Closing",
  "Analytics",
  "Reports",
  "Stations",
  "Games",
  "Sessions & Pricing",
  "Menu",
  "Offers",
  "Coupons",
  "Payments",
  "Messages",
  "Settings",
] as const;
const OWNER_TABS = ["Home page"] as const;
type Tab =
  | (typeof PRIMARY_TABS)[number]
  | (typeof MORE_TABS)[number]
  | (typeof OWNER_TABS)[number];


export function AdminDashboard() {
  const { loading, branches, branchId, setBranchId, isOwner, signOut, session } = useAdminSession();
  const [tab, setTab] = useState<Tab>("Dashboard");
  const [focusReference, setFocusReference] = useState<string | null>(null);
  const data = useBranchData(branchId);
  const branch = branches.find((b) => b.id === branchId);


  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todays = data.bookings.filter(
      (b) => b.booking_date === today && (b.status === "confirmed" || b.status === "completed"),
    );
    const cockpit = data.stations.find((s) => s.is_addon || s.station_type === "driving_simulator");
    return {
      today: todays.length,
      pending: data.bookings.filter(
        (b) => b.status === "payment_pending" || b.status === "pending",
      ).length,

      confirmed: data.bookings.filter((b) => b.status === "confirmed").length,
      active: data.stations.filter((s) => !s.is_addon && s.status === "available").length,
      maintenance: data.stations.filter((s) => s.status !== "available").length,
      cockpit: cockpit
        ? cockpit.status === "available"
          ? "Available"
          : cockpit.status === "maintenance"
            ? "Maintenance"
            : "Unavailable"
        : "Not set up",
      revenue: todays.reduce((s, b) => s + Number(b.total_amount), 0),
    };
  }, [data.bookings, data.stations]);

  if (loading) {
    return <p className="py-24 text-center text-sm text-muted-foreground">Loading dashboard…</p>;
  }

  if (!branch) {
    return (
      <Panel className="mx-auto max-w-lg text-center">
        <p className="text-sm text-muted-foreground">
          This account isn’t linked to a branch yet. Ask the owner to grant access.
        </p>
        <div className="mt-5 flex justify-center">
          <AdminButton onClick={() => void signOut()}>Sign out</AdminButton>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.42em] text-cyan">Dashboard</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{branch.name} Branch</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {isOwner ? "Owner access" : "Branch manager"} · {session?.user.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {branchId ? (
            <NotificationBell
              branchId={branchId}
              onOpenBooking={(reference) => {
                setFocusReference(reference);
                setTab("Bookings");
              }}
            />
          ) : null}
          {branches.length > 1 ? (
            <select
              value={branchId ?? ""}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-full border border-border bg-surface/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] outline-none focus:border-cyan/50"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-white text-slate-900">
                  {b.name}
                </option>
              ))}
            </select>
          ) : null}
          <AdminButton onClick={() => void signOut()}>
            <LogOut className="size-3.5" /> Sign out
          </AdminButton>
        </div>
      </header>

      <nav className="flex flex-wrap items-center gap-2">
        {PRIMARY_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-300",
              tab === t
                ? "border-transparent bg-linear-to-r from-primary via-cyan to-violet text-primary-foreground shadow-[0_16px_40px_-20px_var(--primary)]"
                : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}

        {(() => {
          const more = [...MORE_TABS, ...(isOwner ? OWNER_TABS : [])];
          const onMore = more.includes(tab as (typeof more)[number]);
          return (
            <select
              value={onMore ? tab : ""}
              onChange={(e) => e.target.value && setTab(e.target.value as Tab)}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] outline-none transition-all duration-300",
                onMore
                  ? "border-transparent bg-linear-to-r from-primary via-cyan to-violet text-primary-foreground shadow-[0_16px_40px_-20px_var(--primary)]"
                  : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
              )}
              aria-label="More sections"
            >
              <option value="" className="bg-white text-slate-900">More ▾</option>
              {more.map((t) => (
                <option key={t} value={t} className="bg-white text-slate-900">
                  {t}
                </option>
              ))}
            </select>
          );
        })()}
      </nav>

      <div key={tab} className="animate-[step-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both] space-y-6">
        {tab === "Dashboard" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Today's bookings" value={stats.today} hint={`${money(stats.revenue)} booked today`} />
              <StatCard label="Pending" value={stats.pending} tone="warn" hint="Awaiting your confirmation" />
              <StatCard label="Confirmed" value={stats.confirmed} tone="good" hint="Payment received" />
              <StatCard label="Stations active" value={stats.active} tone="good" />
              <StatCard label="Out of service" value={stats.maintenance} tone={stats.maintenance ? "bad" : "default"} />
              <StatCard
                label="Cockpit simulator"
                value={stats.cockpit}
                tone={stats.cockpit === "Available" ? "good" : "warn"}
              />
            </div>

            <TodayPanel branchId={branch.id} bookings={data.bookings} stations={data.stations} />

            <Panel title="Today's schedule">
              <TodayList bookings={data.bookings} />
            </Panel>

            {isOwner ? <OwnerPanel branches={branches} /> : null}
          </>
        ) : null}

        {tab === "Stations" ? (
          <StationsPanel
            stations={data.stations}
            bookings={data.bookings}
            branchId={branch.id}
            onChanged={data.refresh}
          />
        ) : null}

        {tab === "Games" ? <GamesShowcasePanel /> : null}

        {tab === "Bookings" ? (
          <BookingsPanel
            bookings={data.bookings}
            stations={data.stations}
            menu={data.menu}
            branchId={branch.id}
            branchName={branch.name}
            onChanged={data.refresh}
            focusReference={focusReference}
          />
        ) : null}

        {tab === "Booking Calendar" ? (
          <BookingCalendar branches={branches} defaultBranchId={branch.id} />
        ) : null}

        {tab === "Daily Closing" ? (
          <DailyClosingView branches={branches} defaultBranchId={branch.id} />
        ) : null}

        {tab === "Transactions" ? (
          <TransactionsView branches={branches} defaultBranchId={branch.id} />
        ) : null}


        {tab === "Reconciliation" ? (
          <ReconciliationView branches={branches} defaultBranchId={branch.id} />
        ) : null}

        {tab === "Customers" ? <CustomersPanel /> : null}

        {tab === "Memberships" ? <MembershipPassesPanel branchId={branch.id} /> : null}

        {tab === "Analytics" ? (
          <AnalyticsView branches={branches} isOwner={isOwner} defaultBranchId={branch.id} />
        ) : null}

        {tab === "Reports" ? (
          <ReportsView branches={branches} isOwner={isOwner} defaultBranchId={branch.id} />
        ) : null}

        {tab === "Menu" ? (
          <MenuPanel
            menu={data.menu}
            branchId={branch.id}
            branchName={branch.name}
            onBack={() => setTab("Dashboard")}
            onChanged={data.refresh}
          />
        ) : null}

        {tab === "Sessions & Pricing" ? (
          <PricingPanel
            sessions={data.sessions}
            groupRates={data.groupRates}

            stations={data.stations}
            menu={data.menu}
            branchId={branch.id}
            branchName={branch.name}
            onChanged={data.refresh}
          />
        ) : null}

        {tab === "Offers" ? <OffersPanel branchId={branch.id} branchName={branch.name} /> : null}

        {tab === "Coupons" ? (
          <CouponsPanel
            coupons={data.coupons}
            branchId={branch.id}
            branchName={branch.name}
            onChanged={data.refresh}
          />
        ) : null}

        {tab === "Payments" ? <PaymentSettingsPanel branchId={branch.id} /> : null}

        {tab === "Messages" ? <MessagesPanel branchId={branch.id} /> : null}

        {tab === "Settings" ? <SettingsPanel branchId={branch.id} /> : null}


        {tab === "Home page" && isOwner ? <HomepagePanel branches={branches} /> : null}
      </div>

    </div>
  );
}

function TodayList({ bookings }: { bookings: ReturnType<typeof useBranchData>["bookings"] }) {
  const today = new Date().toISOString().slice(0, 10);
  const itemOf = (b: (typeof bookings)[number]) =>
    b.booking_items.find((i) => i.kind === "addon" && i.station_id && i.start_time);
  const startOf = (b: (typeof bookings)[number]) => b.start_time ?? itemOf(b)?.start_time ?? null;
  const stationOf = (b: (typeof bookings)[number]) =>
    b.gaming_stations?.name ??
    b.booking_items
      .filter((i) => i.kind === "addon" && i.station_id)
      .map((i) => i.label)
      .join(", ");
  const rows = bookings
    .filter(
      (b) => b.booking_date === today && (b.status === "confirmed" || b.status === "completed"),
    )
    .sort((a, b) => (startOf(a) ?? "").localeCompare(startOf(b) ?? ""));
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">Nothing booked today yet.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((b) => (
        <li
          key={b.id}
          className="rounded-2xl border border-border bg-surface/50 px-4 py-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3"
        >
          <span className="text-sm font-bold sm:w-20">
            {startOf(b) ? formatTime(startOf(b)!) : "—"}
          </span>
          <span className="mt-1 block break-words text-sm sm:mt-0 sm:min-w-0 sm:flex-1">
            {b.customer_name} · <span className="font-bold">{stationOf(b) || "—"}</span> · {b.players}P
          </span>
          <div className="mt-2 flex items-center justify-between gap-3 sm:mt-0 sm:contents">
            <StatusPill status={b.status} />
            <span className="text-sm font-bold">{money(b.total_amount)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
