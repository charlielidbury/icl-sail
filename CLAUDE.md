# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ICL-Sail is a live race results and leaderboard system for university team racing sailing competitions. The app serves multiple competitions (Icicle, Top Gun, Bath Robe, Badger, Sixpack) from the same codebase, determining which competition to display from the address. It also has a public schedule generator at `/scheduler`.

## Commands

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm gen` - Regenerate Supabase TypeScript types from the remote database

## Architecture

### Multi-tenancy by Hostname
Competitions are listed in `src/competitions.ts` (a plain module, usable on the server). Each one is served at `<id>.isail.site` (a wildcard domain on Vercel), at `<id>.localhost:<port>` in development, and optionally at custom domains listed in `customDomains`. There is no default competition: where the address doesn't name one (`isail.site`, `www`, plain `localhost`), pages show the landing page (`src/app/landing.tsx`) so the visitor can pick. Vercel preview URLs can't name a competition, so there the choice is kept in the `competition` cookie. Each competition has its own accent color, logo, and database records.

Adding a competition: add it to `allCompetitions` in `src/competitions.ts`, add its `competition` row (and `admin` rows) in the database, and run `vercel domains add <id>.isail.site icl-sail`. The DNS wildcard already points every subdomain at Vercel, but HTTPS certificates are only issued per added domain while `isail.site` uses Namecheap's nameservers.

### State Management
- **Jotai** for global state with atoms defined in `src/shared.tsx`
- **jotai-tanstack-query** (`atomWithQuery`) bridges Jotai atoms with React Query for data fetching
- `competitionIdAtom` is hydrated on page load via `useHydrateAtoms` to set the current competition
- Key atoms: `competitionBasicAtom`, `competitionAtom`, `racesAtom`, `leaderboardAtom`

### Real-time Updates
`SharedLogic` component in `src/shared.tsx` subscribes to Supabase real-time channels for `race`, `competition`, and `feedback` tables. Changes automatically invalidate React Query caches.

### Data Flow
1. `page.tsx` calls `requestCompetition()` (`src/request-competition.ts`), which reads the Host header and cookie. With no competition it renders the landing page; otherwise it passes `competitionId` to the main component
2. `useHydrateAtoms` sets `competitionIdAtom` which derives `competitionBasicAtom`
3. `competitionAtom` and `racesAtom` fetch from Supabase using the competition ID
4. `leaderboardAtom` derives standings from races using BUSA tie-break rules

### Database
- Supabase PostgreSQL with typed client from `src/database.types.ts` (auto-generated)
- Main tables: `competition`, `race`, `team`, `flight`, `halfflight`, `admin`, `feedback`
- Client initialized in `src/supabase.tsx` with anon key

### UI Components
- **Chakra UI v3** for component library
- Page structure: `src/app/{route}/page.tsx` is a thin wrapper that resolves the competition and passes its id to the main component
- Main page components are in `src/app/{route}/{route}.tsx` (e.g., `races.tsx`, `leaderboard.tsx`)
- Reusable UI primitives in `src/components/ui/`

### Path Aliases
`@/*` maps to `./src/*` (configured in tsconfig.json)

## Key Domain Concepts

- **Flight**: A boat configuration with left/right halves, each having assigned sail numbers
- **Race**: A matchup between two teams on a specific flight, with optional results (lresult/rresult arrays)
- **League**: Competition stage (e.g., "quali", "semis/gold", "semis/silver")
- **Go to stand**: Number of races in advance teams should prepare for racing
