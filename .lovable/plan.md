# Automatic daily closing and booking card restyle

## Changes
- Keep the existing **Close business day** button so staff can close early or refresh a saved report manually.
- Add an authenticated daily automation that closes the previous business day for every active branch shortly after midnight India time, without duplicating reports already closed.
- Keep closing history ordered by report date, newest day first, including when several branches have reports for the same date.
- Restyle booking cards to match the supplied reference: compact white card, status and amount across the top, customer and reference beneath, a full-width purple service/level/player panel, contact row, date/time rows, cyan countdown strip, and a two-column action grid.
- Preserve every current booking status action, details section, countdown behavior, receipt/copy/remove controls, and data calculation.
- Keep cards at the established fixed 408px desktop width, wrapping only where they fit, while remaining full-width on phones.

## Technical details
- Implement the automatic close through a secured scheduled server endpoint and a once-daily database schedule at 12:05 AM Asia/Kolkata (6:35 PM UTC). The endpoint will generate the same saved snapshot used by manual closing and use the existing unique branch/date upsert behavior.
- Use a server-only secret for the scheduled call; no customer or admin credentials are exposed.
- Record automated reports with a clear automated marker while leaving manual notes and re-closing intact.
- Use existing semantic colors and shared admin controls; the uploaded screenshot is a visual reference only and will not be embedded.
- Verify the closing endpoint, history order, and booking cards at phone and desktop widths.
