# Admin booking card updates

## Changes
- Load each booking customer's existing loyalty visit count and show it as a level badge.
- Place the level above the price on phones and beside the customer information on larger screens.
- Move only the Sign out button to the top of the admin header on phones while preserving the desktop layout.
- Show the booked console or gaming service directly below the booking status in a matching pill, using a white background, black text, and a visible border.

## Technical details
- Reuse the existing authenticated customer roster request and cache rather than adding database changes.
- Keep current booking actions, filters, sorting, and business logic unchanged.
- Validate the affected admin screen and run the existing TypeScript check.
