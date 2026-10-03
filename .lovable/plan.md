# Finish legal pages and admin filters

## What will change
- Add Privacy Policy, Terms & Conditions, and Refund & Cancellation Policy pages using the supplied wording and existing site styling.
- Add links to all three policies in the site footer.
- Move the general Transactions search field into the Transactions card while leaving date and report controls above.
- Make Bookings open on All by default.
- Add account filters to Security: username filters for Active Sessions, Login Activity, and Failed Login Attempts; branch filter for Login Accounts.
- Add a search field inside the Coupons card to filter by coupon code and visible coupon details.

## Technical details
- Create three public TanStack routes with unique page metadata and reuse the existing legal-page layout.
- Keep all filtering client-side over already-authorized admin data; no database changes are needed.
- Preserve existing card styling, actions, pagination, exports, and mobile behavior.
- Verify the new public pages, footer links, and admin defaults/filters after implementation.
