CREATE TABLE books (
    id         BIGSERIAL PRIMARY KEY,
    title      TEXT NOT NULL,
    author     TEXT NOT NULL,
    year       INTEGER,
    genre      TEXT,
    cover_url  TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
