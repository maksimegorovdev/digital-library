## REMOVED Requirements

### Requirement: Book List Page

**Reason**: Replaced by a client-fetched data-table dashboard page (see
"Book Dashboard Page" below) — the frontend no longer server-renders
the book list.

**Migration**: No server action required. Any consumer relying on
`/books` returning fully server-rendered HTML for the book grid should
instead expect a client-rendered data table hydrated via
`GET /books`.

### Requirement: Load More Pagination

**Reason**: Replaced by page-based pagination on the data table (see
"Book Dashboard Pagination" below) — "load more" no longer exists.

**Migration**: No server action required; the `GET /books`
`limit`/`offset` contract is unchanged, only how the frontend drives
it.

---

## ADDED Requirements

### Requirement: Book Dashboard Page
The frontend SHALL render `/books` as a client-rendered data table
dashboard that fetches books from `GET /books` via a browser `fetch`
call rather than server-side rendering.

#### Scenario: First page loads on navigation
- **WHEN** a user navigates to `/books`
- **THEN** the page SHALL show a loading state, then fetch the first
  page of books via `GET /books` from the browser and render each book
  as a row in the data table

#### Scenario: Book with missing optional fields
- **WHEN** a rendered book has no `cover_url`, `year`, or `genre`
- **THEN** its row SHALL render a placeholder in the corresponding
  cell instead of a broken image or blank value

#### Scenario: Library is empty
- **WHEN** `GET /books` returns zero books
- **THEN** the table SHALL show a message indicating the library has
  no books yet, without a call-to-action

#### Scenario: Backend request fails
- **WHEN** the `GET /books` request fails or times out
- **THEN** the page SHALL show an error message in place of the table
  and SHALL NOT throw an unhandled error

### Requirement: Book Dashboard Pagination
The data table SHALL provide page-based pagination — a page number
control and a page size selector — mapped onto the `GET /books`
`limit`/`offset` parameters.

#### Scenario: Navigating to the next page
- **WHEN** a user activates the next-page control
- **THEN** the table SHALL fetch `GET /books` with
  `offset = (page - 1) * pageSize` for the new page number and replace
  the displayed rows with the response

#### Scenario: Changing the page size
- **WHEN** a user selects a different page size
- **THEN** the table SHALL reset to the first page and refetch
  `GET /books` with the new `limit`

#### Scenario: Last page has fewer rows than the page size
- **WHEN** the total book count is not evenly divisible by the current
  page size
- **THEN** the final page SHALL show only the remaining rows and the
  next-page control SHALL be disabled

### Requirement: Book Filter Toolbar Scaffold
The dashboard toolbar SHALL provide a search input and a genre select
whose values are held in client-side state and reflected in the URL
query string, without altering the `GET /books` request made by the
page.

#### Scenario: Entering a search term
- **WHEN** a user types into the search field
- **THEN** the value SHALL update in local state and be reflected in
  the URL search params, and the currently displayed table rows SHALL
  remain unchanged

#### Scenario: Selecting a genre
- **WHEN** a user selects a genre from the genre control
- **THEN** the value SHALL update in local state and the URL search
  params, and the currently displayed table rows SHALL remain
  unchanged

#### Scenario: Loading the page with filter params already in the URL
- **WHEN** a user opens `/books` with `search` and/or `genre` query
  params already present
- **THEN** the toolbar controls SHALL initialize with those values,
  and the table SHALL still fetch and render the unfiltered result of
  `GET /books`

### Requirement: Book Management Actions Scaffold
The dashboard SHALL provide UI for adding, editing, and deleting a
book — a toolbar "Add" action and per-row "Edit"/"Delete" actions —
that open a drawer with a validated form, submitting to client-side
stub functions that report the operation is not yet implemented.

#### Scenario: Opening the add drawer
- **WHEN** a user activates the toolbar's "Add" action
- **THEN** a drawer SHALL open with an empty book form requiring
  title and author, with year, genre, and cover URL as optional fields

#### Scenario: Opening the edit drawer
- **WHEN** a user activates a row's "Edit" action
- **THEN** a drawer SHALL open with a book form pre-filled with that
  row's current values

#### Scenario: Submitting a valid add or edit form
- **WHEN** a user submits a valid add or edit form
- **THEN** the client SHALL call a stub API function that resolves to
  a "not implemented" result, the UI SHALL show a toast stating the
  feature is not yet available, and the table's displayed data SHALL
  remain unchanged

#### Scenario: Requesting a delete
- **WHEN** a user activates a row's "Delete" action
- **THEN** a drawer SHALL open asking for confirmation, and confirming
  SHALL call a stub API function that resolves to a "not implemented"
  result, shown via a toast, without removing the row from the table

#### Scenario: Client-side validation blocks submission
- **WHEN** a user submits the add or edit form with a required field
  (title or author) missing
- **THEN** the form SHALL show a validation error and SHALL NOT call
  the stub API function
