# Booking, payment, and booking-page refinements

## Changes
- Rework each Admin → Bookings → All card so one purple box sits above the price at the top right, with the booked game/service on line one and `Level N` on line two.
- Display the next visit level (`current visits + 1`) in that box, remove the repeated service/game text from the card’s lower summary line, label driving simulator bookings as “Cockpit Racing,” and label group bookings simply as “Party Booking.”
- Keep the payment countdown only while a customer has not submitted a UTR. Once the UTR is submitted, clear the payment expiry so the booking remains available for staff approval or rejection without a time limit.
- Simplify booking service headers: line one shows only the game/service name; line two shows only the available count, with descriptions removed from those collapsed headers.
- Move “Redeem pass” and “Memberships & Combos” to the end of the gaming selection step, after the regular game/service choices.
- Restyle the coupon area in the final booking summary as a normal form field without the amber glow/highlight treatment.

## Technical details
- Preserve all existing booking actions, filters, pricing, pass rules, availability logic, and payment approval behavior.
- Make the UTR submission update and expiry removal atomic in the existing payment submission function; no database structure change is needed.
- Use existing semantic purple/violet design tokens for the admin badge and existing neutral form tokens for the coupon field.
- Validate the affected admin booking cards, booking flow, and submitted-payment state in the live preview on desktop and mobile sizes.
