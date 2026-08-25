# Full `dashboard-01` nav chrome adopted as non-functional placeholders; page content still dropped per ADR 0001

We re-installed the `dashboard-01` block from the `base-nova` shadcn registry and, this time, kept its full sidebar/header chrome — the extra nav items ("Lifecycle", "Analytics", "Projects", "Team"), the "Documents" section ("Data Library", "Reports", "Word Assistant"), the org switcher, and "Quick Create" — instead of the single real nav item used previously. These extra items are disabled/non-functional placeholders extending the pattern from ADR 0002, added purely for visual parity with the stock block; "Quick Create" is the one exception, wired to the existing add-book action since that functionality already exists. ADR 0001's conclusion — dropping the stat cards, chart, and generic drag-and-drop data table in favor of `BooksDataTable` — is unchanged; only the shell's chrome grew closer to the stock block, not the page content.

## Considered Options

- Keep the minimal single-item nav (previous state) and only fix shell spacing/styling to match the block pixel-for-pixel — rejected: doesn't address the visual mismatch the user pointed out, which was about the whole chrome, not just spacing.
- Adopt the extra nav items as real, functional sections (e.g. actual analytics/projects pages) — rejected: no such domain concepts exist in a single-page book catalog; would require inventing scope not asked for.
