---
name: db
description: Query and manipulate the Supabase PostgreSQL database. Use for SELECT, INSERT, UPDATE, DELETE operations.
argument-hint: [SQL query or description]
allowed-tools: Bash, Read
---

# Database Skill

Execute SQL queries against the icl-sail Supabase database.

## Connection

Queries go through the Supabase CLI (in the nix dev shell), which runs SQL via the
Management API, so no database password is needed:

```bash
supabase db query --linked -o table "YOUR_QUERY"
supabase db query --linked -o table -f path/to/file.sql
```

- Needs `supabase login` and a one-off `supabase link --project-ref uwticnzhykdnfbisrdrx`
  (the link lives in the gitignored `supabase/` directory).
- With several statements in one call, only the last statement's result is printed.
- psql meta-commands like `\dt` don't work; query `information_schema` instead.
- Wrap multi-statement changes in `BEGIN; ... COMMIT;`. To dry-run a change, end the
  file with a verifying `SELECT` and `ROLLBACK;` instead.

## Available Tables

- `competition` - Competition configurations (id, name, host, announcements, flags)
- `team` - Teams, shared across all competitions (`name` is unique)
- `race` - Races and results, per competition
- `admin` - (competition, auth user id) pairs that can edit results
- `flight` - Flights, shared across all competitions
- `halfflight` - Legacy, unused by the app
- `feedback` - User feedback, shared across all competitions

## Instructions

When the user provides $ARGUMENTS:

1. If it's a raw SQL query, execute it directly
2. If it's a description of what they want, construct the appropriate SQL
3. For destructive operations (UPDATE, DELETE, DROP), confirm with the user first
4. Always show the results in a readable format

## Examples

**List all tables:**
```bash
supabase db query --linked -o table "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
```

**Query with nice formatting:**
```bash
supabase db query --linked -o table "SELECT * FROM competition"
```

**Describe a table:**
```bash
supabase db query --linked -o table "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'competition'"
```

## Safety

- Never DROP tables without explicit user confirmation
- Always LIMIT large result sets (default to LIMIT 100)
- For UPDATE/DELETE, show a SELECT first to preview affected rows
