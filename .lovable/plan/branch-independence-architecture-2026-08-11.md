# Branch Independence Architecture

Every operational thing an admin manages becomes owned by exactly one branch. The public home page stays the only shared surface, edited by the owner in a clearly marked "Homepage Content" area.

## What changes for admins

- A branch manager logs in and sees only their own branch: no branch switcher, branch name printed under "Dashboard" in the header.
- The owner keeps a single small switcher plus access to Homepage Content; everything else the owner edits is still scoped to the branch currently open.
- Every branch has its own pricing, session durations, stations, menu, memberships, combo/unlimited/student offers, coupons, business hours, bookings and maintenance status. Editing one branch can never touch another.
- Homepage Content pages open with a warning banner: changes there affect the public home page for all branches, and prices there are "starting from" marketing figures only.

## Session Pricing Manager (replaces the fixed grid)

New per-branch list of session options, fully dynamic:

- Duration (minutes, any value — 30 / 45 / 60 / 90 / 120 / 180 / 240 …)
- Optional player count (blank = applies to any group size)
- Price
- Active / inactive
- Display order
- Add, edit, delete rows; nothing hardcoded

The booking page reads this list for the selected branch only, so each branch shows its own durations.

## Database changes

New branch-scoped tables:

- `session_options` — branch_id, label, duration_minutes, players (nullable), price, is_active, sort_order
- `branch_hours` folded into existing `branches` columns (opens_at, closes_at, slot_minutes, tax_percent) — already per branch, exposed in Settings

Existing tables gain a required `branch_id` and rows are cloned once per existing branch so nothing is lost:

- `menu_items` (replaces the shared `branch_ids` array model)
- `coupons`
- `membership_plans`
- `site_offers` (combo / unlimited pass / student offer)
- `experience_rates` (PS5, VR, cockpit, snooker, theatre, lounge tiers)

Already branch-scoped and untouched: `gaming_stations`, `bookings`, `booking_items`, `reservation_locks`, `pricing_rates` (retired in favour of `session_options`).

Shared tables (homepage / global only):

- `homepage_cards` — new: card type (hero, experience, membership, combo, unlimited, student, feature), title, subtitle, body, image, `starting_price`, sort order, visibility
- `experiences`, game library, media/images, general site settings

RLS: every branch-scoped table gets policies using the existing `has_branch_access(auth.uid(), branch_id)` helper for writes and public read for the site. Homepage tables stay owner-write only.

## Scalability

A new branch row automatically gets an empty, independent workspace; a seed function copies a starter set of session options, stations, menu and offers so a new branch is usable immediately. No code changes needed for future branches.

## Frontend work

- `useBranchData` fetches every panel's data with `.eq("branch_id", branchId)`, including menu, coupons, memberships, offers and rates.
- Admin panels: new `SessionsPanel` (session pricing manager), branch-scoped `MenuPanel`, `CouponsPanel`, new `BranchOffersPanel` (memberships, combo, unlimited, student), branch `RatesPanel`, `SettingsPanel` for business hours/tax.
- Homepage Content moves under an owner-only "Homepage" tab with the shared-content warning banner and starting-from price fields.
- Booking flow (`BookingFlow`, `booking.functions.ts`) prices sessions from `session_options`, food from the branch's menu, passes from that branch's memberships/offers, coupons from that branch's coupon list.
- Public home page reads `homepage_cards` + `experiences` for marketing copy and "Starting from ₹X".

## Order of work

1. Migration: new tables, branch_id columns, data clone, grants, RLS, seed function.
2. Data layer: `useBranchData`, `site-content`, booking server functions.
3. Admin: header/branch identity, Sessions panel, branch-scoped panels, Homepage tab with banner.
4. Booking page: durations, menu, passes and coupons all driven by the selected branch.
