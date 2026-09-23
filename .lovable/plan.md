# Mobile booking card countdown

## Changes
- Keep the existing laptop booking-card layout unchanged.
- On phones, move the customer phone number and WhatsApp action to the right beneath the console/level badge and cost.
- Show a live countdown for timed bookings: display the full booked duration before the start, count down after the start, stop at `00:00` after the end, and hide it once the booking is marked completed.

## Technical details
- Calculate countdowns from each booking date, start time, and end time using one shared minute/second tick.
- Preserve all existing booking actions, statuses, pricing, filters, and completion behavior.
- Validate phone and laptop layouts and run the existing TypeScript check.
