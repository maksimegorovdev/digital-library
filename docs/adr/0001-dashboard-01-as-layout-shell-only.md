# shadcn `dashboard-01` used only as a layout shell, not for its dashboard content

For the book catalog page, we evaluated adopting shadcn/ui's `dashboard-01`
block (sidebar nav, stat cards, an interactive chart, and a generic
drag-and-drop data table) as the base for a "library dashboard". We kept
only its structural shell — sidebar navigation and site header — and
dropped the stat cards, chart, and generic data table entirely, wrapping
the existing `BooksDataTable` as the page's sole content instead.

The stat cards and chart need aggregate/time-series data (counts by genre,
books added over time) the backend doesn't expose yet; shipping them as
mock numbers on a real page risked reading as real data. The block's data
table also assumes drag-and-drop reordering, which has no meaning for a
book catalog — books are already ordered by author/title/search
relevance. With only one real domain area (books) and no separate
"overview" need, the originally-planned separate dashboard page was
collapsed into the existing book catalog page rather than maintaining two
near-duplicate routes.

## Considered Options

- A separate analytics page with stat cards and a chart, backed by
  explicit mock data and a "demo data" badge until a backend aggregation
  endpoint existed — rejected: no honest way to ship real-looking numbers
  before there's a real source, and it meant two near-identical entry
  points to the same book list.
- Keeping the block's generic data table with drag-and-drop reordering,
  restyled for books — rejected: reordering isn't a domain concept here.
