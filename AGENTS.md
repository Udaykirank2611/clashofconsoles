<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep temporary promotional pricing in a shared client-safe booking utility and recompute it server-side, so displayed and charged totals cannot diverge.
- Extension previews and mutations use the same server quote helper, repricing the full timed session when it leaves the promotional window while preserving pass-funded extensions.
- Aggregate deposit and expense analytics in the client-safe cashflow utility from paginated, authenticated branch/date-scoped ledger reads; keep funding deposits separate from sales revenue to avoid inflated revenue.
- Transactions and reconciliation read each booking with its embedded ledger relation and paginate until an empty page; fail on read errors so incomplete requests never become false missing-ledger findings.
