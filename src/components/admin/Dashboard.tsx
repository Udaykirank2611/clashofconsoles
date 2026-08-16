import { useMemo, useState } from "react";
import { useAdminSession } from "@/lib/admin/useAdminSession";
import { useBranchData } from "@/lib/admin/useBranchData";
import { AdminButton, Panel, StatCard, money } from "./primitives";
import { BookingsPanel, StatusPill } from "./BookingsPanel";
import { CustomersPanel } from "./CustomersPanel";
import { MembershipPassesPanel } from "./MembershipPassesPanel";
import { StationsPanel } from "./StationsPanel";
import { PricingPanel } from "./PricingPanel";
import { CouponsPanel } from "./CouponsPanel";
import { MenuPanel } from "./MenuPanel";
import { SettingsPanel } from "./SettingsPanel";
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

const BRANCH_TABS = [
  "Dashboard",
  "Booking Calendar",
  "Bookings",
  "Transactions",
  "Reconciliation",
  "Customers",
  "Memberships",
  "Daily Closing",

  "Analytics",
  "Reports",

  "Stations",
  "Sessions & Pricing",
  "Menu",
  "Offers",
  "Coupons",
  "Payments",
  "Settings",

] as const;
const OWNER_TABS = ["Home page"] as const;
type Tab = (typeof BRANCH_TABS)[number] | (typeof OWNER_TABS)[number];


export function AdminDashboard() {
  const { loading, branches, branchId, setBranchId, isOwner, signOut, session } = useAdminSession();
  const [tab, setTab] = useState<Tab>("Dashboard");
  const [focusReference, setFocusReference] = useState<string | null>(null);
  const data = useBranchData(branchId);
  const branch = branches.find((b) => b.id === branchId);


  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todays = data.bookings.filter((b) => b.booking_date === today && b.status !== "cancelled");
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
                <option key={b.id} value={b.id}>
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

      <nav className="flex flex-wrap gap-2">
        {[...BRANCH_TABS, ...(isOwner ? OWNER_TABS : [])].map((t) => (
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

        {tab === "Bookings" ? (
          <BookingsPanel
            bookings={data.bookings}
            stations={data.stations}
            menu={data.menu}
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

        {tab === "Settings" ? <SettingsPanel branchId={branch.id} /> : null}


        {tab === "Home page" && isOwner ? <HomepagePanel branches={branches} /> : null}
      </div>

    </div>
  );
}

function TodayList({ bookings }: { bookings: ReturnType<typeof useBranchData>["bookings"] }) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = bookings
    .filter((b) => b.booking_date === today && b.status !== "cancelled")
    .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">Nothing booked today yet.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((b) => (
        <li
          key={b.id}
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface/50 px-4 py-3"
        >
          <span className="w-20 text-sm font-bold">{formatTime(b.start_time)}</span>
          <span className="min-w-0 flex-1 truncate text-sm">
            {b.customer_name} · {b.gaming_stations?.name ?? ""} · {b.players}P
          </span>
          <StatusPill status={b.status} />
          <span className="text-sm font-bold">{money(b.total_amount)}</span>
        </li>
      ))}
    </ul>
  );
}
