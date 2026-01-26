# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ICL-Sail is a live race results and leaderboard system for university team racing sailing competitions. The app serves multiple competitions (Icicle, Top Gun, Bath Robe, Badger) from the same codebase, determining which competition to display based on the hostname.

## Commands

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm gen` - Regenerate Supabase TypeScript types from the remote database

## Architecture

### Multi-tenancy by Hostname
The app serves multiple sailing competitions from one codebase. Competition is determined at runtime by `document.location.hostname` matching against `competitionHosts` in `src/shared.tsx`. Each competition has its own accent color, logo, and database records.

### State Management
- **Jotai** for global state with atoms defined in `src/shared.tsx`
- **jotai-tanstack-query** (`atomWithQuery`) bridges Jotai atoms with React Query for data fetching
- `hostnameAtom` is hydrated on page load via `useHydrateAtoms` to set the current competition
- Key atoms: `competitionBasicAtom`, `competitionAtom`, `racesAtom`, `leaderboardAtom`

### Real-time Updates
`SharedLogic` component in `src/shared.tsx` subscribes to Supabase real-time channels for `race`, `competition`, and `feedback` tables. Changes automatically invalidate React Query caches.

### Data Flow
1. Pages receive `hostname` as a prop from `page.tsx` (via `headers().get("host")`)
2. `useHydrateAtoms` sets `hostnameAtom` which derives `competitionBasicAtom`
3. `competitionAtom` and `racesAtom` fetch from Supabase using the competition ID
4. `leaderboardAtom` derives standings from races using BUSA tie-break rules

### Database
- Supabase PostgreSQL with typed client from `src/database.types.ts` (auto-generated)
- Main tables: `competition`, `race`, `team`, `flight`, `halfflight`, `admin`, `feedback`
- Client initialized in `src/supabase.tsx` with anon key

### UI Components
- **Chakra UI v3** for component library
- Page structure: `src/app/{route}/page.tsx` is a thin wrapper that passes hostname to the main component
- Main page components are in `src/app/{route}/{route}.tsx` (e.g., `races.tsx`, `leaderboard.tsx`)
- Reusable UI primitives in `src/components/ui/`

### Path Aliases
`@/*` maps to `./src/*` (configured in tsconfig.json)

## Key Domain Concepts

- **Flight**: A boat configuration with left/right halves, each having assigned sail numbers
- **Race**: A matchup between two teams on a specific flight, with optional results (lresult/rresult arrays)
- **League**: Competition stage (e.g., "quali", "semis/gold", "semis/silver")
- **Go to stand**: Number of races in advance teams should prepare for racing
