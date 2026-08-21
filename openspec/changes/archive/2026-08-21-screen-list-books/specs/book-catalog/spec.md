## ADDED Requirements

### Requirement: Book Storage
The system SHALL persist books in a Postgres `books` table with mandatory `title` and `author` fields and optional `year`, `genre`, and `cover_url` fields.

#### Scenario: Book with all optional fields absent
- **WHEN** a book row is inserted with only `title` and `author` set
- **THEN** the row is persisted with `year`, `genre`, and `cover_url` stored as NULL, and no other field is required

### Requirement: List Books Endpoint
`GET /books` SHALL return a paginated list of books ordered by `author`, then `title`, then `id`, along with the total book count and the effective pagination parameters.

#### Scenario: Default request returns the first page
- **WHEN** a client requests `GET /books` without query parameters
- **THEN** the backend responds with HTTP 200 and a JSON body containing up to 50 books ordered by author, then title, then id, plus `total`, `limit`, and `offset`

#### Scenario: Custom limit and offset are honored
- **WHEN** a client requests `GET /books?limit=X&offset=Y` with valid positive integers
- **THEN** the response contains at most X books, starting after the Y-th book in the same stable order, and echoes back the effective `limit`/`offset`

#### Scenario: Database is unreachable
- **WHEN** the backend cannot reach the database while handling `GET /books`
- **THEN** the endpoint responds with HTTP 500, logs the underlying error via structured logging, and does not leak internal error details in the response body

### Requirement: Book List Page
The frontend SHALL render `/books` as a server-rendered card grid showing the first page of books returned by `GET /books`.

#### Scenario: First page renders on navigation
- **WHEN** a user navigates to `/books`
- **THEN** the page server-renders a card for each book in the first page returned by `GET /books`, with no client-side loading spinner for that first page

#### Scenario: Book with missing optional fields
- **WHEN** a rendered book has no `cover_url`, `year`, or `genre`
- **THEN** its card renders without those fields and shows a placeholder in place of the missing cover image, instead of a broken image

#### Scenario: Library is empty
- **WHEN** `GET /books` returns zero books
- **THEN** the page shows a message indicating the library has no books yet, without a call-to-action

#### Scenario: Backend request fails
- **WHEN** the `GET /books` request fails or times out
- **THEN** the page shows an error message in place of the grid and does not throw an unhandled error

### Requirement: Load More Pagination
The book list page SHALL let the user load additional pages of books beyond the first, without navigating to a new URL.

#### Scenario: Loading the next page appends results
- **WHEN** the user activates the "Load more" control
- **THEN** the next page of books (per the current `limit`/`offset`) is fetched and appended to the currently displayed list, preserving the books already shown

#### Scenario: All books already loaded
- **WHEN** the number of books already loaded is greater than or equal to `total`
- **THEN** the "Load more" control is not shown
