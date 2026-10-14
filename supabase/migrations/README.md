# Database migrations

The only source of truth for the database schema.

- One SQL file per change, named `NNNN_short_description.sql` with a 4-digit, never-reused number.
- Never edit a migration that has been applied; add a new one.
- Every table has row-level security enabled, with policies in the same migration.
