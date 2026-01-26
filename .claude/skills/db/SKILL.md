---
name: db
description: Query and manipulate the Supabase PostgreSQL database. Use for SELECT, INSERT, UPDATE, DELETE operations.
argument-hint: [SQL query or description]
allowed-tools: Bash, Read
---

# Database Skill

Execute SQL queries against the icl-sail Supabase database.

## Connection

The database connection URL is stored in `.env` as `DATABASE_URL`. Load it before running queries:

```bash
source .env && psql "$DATABASE_URL" -c "YOUR_QUERY"
```

## Available Tables

- `competition` - Competition configurations (id, name, host, announcements, flags)
- `team` - Team information (~51 rows)
- `race` - Race results (~309 rows)
- `admin` - Admin users (~21 rows)
- `flight` - Flight information (~9 rows)
- `halfflight` - Half flight data (~13 rows)
- `feedback` - User feedback (~1 row)

## Instructions

When the user provides $ARGUMENTS:

1. If it's a raw SQL query, execute it directly
2. If it's a description of what they want, construct the appropriate SQL
3. For destructive operations (UPDATE, DELETE, DROP), confirm with the user first
4. Always show the results in a readable format

## Examples

**List all tables:**
```bash
source .env && psql "$DATABASE_URL" -c "\dt public.*"
```

**Query with nice formatting:**
```bash
source .env && psql "$DATABASE_URL" -c "SELECT * FROM competition;"
```

**Describe a table:**
```bash
source .env && psql "$DATABASE_URL" -c "\d+ public.competition"
```

## Safety

- Never DROP tables without explicit user confirmation
- Always LIMIT large result sets (default to LIMIT 100)
- For UPDATE/DELETE, show a SELECT first to preview affected rows
