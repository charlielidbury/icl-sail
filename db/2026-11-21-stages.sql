-- Competition stages, letting admins add and remove Gold/Silver races, and
-- unique race numbers.
-- Applied to production on 2026-11-21, in the three parts below, with
-- `supabase db query --linked -f <file>` (each part on its own).
--
-- A competition runs in stages: 'quali' (the qualifying round robin, league
-- 'quali'), then 'groups' (Gold and Silver round robins, leagues
-- 'semis/gold' and 'semis/silver'), then 'finals' (every other league). The
-- site only shows visitors the leagues of stages up to competition.stage, so
-- Gold/Silver races can be generated before they're released; admins see
-- everything. That's about not showing races early, not security: anyone can
-- still read every race. See src/leagues.ts.
--
-- The policies let an admin generate and clear Gold/Silver races from the
-- leaderboard page (src/app/leaderboard/groups-admin.tsx) without being able to
-- add qualifying races, or delete any race that isn't an unraced Gold/Silver
-- race. Before this, nobody could insert or delete races from the browser.
-- They were first tested in a transaction that rolled back:
-- db/2026-11-21-stages-rls-test.sql.

-- Part 1: the stage column. -----------------------------------------------------
BEGIN;

ALTER TABLE public.competition
  ADD COLUMN stage text NOT NULL DEFAULT 'quali';

ALTER TABLE public.competition
  ADD CONSTRAINT competition_stage_check
  CHECK (stage IN ('quali', 'groups', 'finals'));

COMMENT ON COLUMN public.competition.stage IS
  'How far the competition has got: quali, groups (Gold/Silver) or finals. '
  'Visitors only see leagues of stages up to this one (see src/leagues.ts).';

-- Imperial Icicle 2025 already has finals races, which must stay public.
UPDATE public.competition SET stage = 'finals' WHERE id = 'icicle';

COMMIT;

-- Part 2: insert and delete policies on race. -----------------------------------
BEGIN;

CREATE POLICY "Admins can add their competition's non-qualifying races"
  ON public.race
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    league <> 'quali'
    AND EXISTS (
      SELECT 1 FROM public.admin a
      WHERE a.competition = race.competition
        AND a."user" = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins can delete their competition's unraced Gold/Silver races"
  ON public.race
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (
    league IN ('semis/gold', 'semis/silver')
    AND finishtime IS NULL
    AND lresult IS NULL
    AND rresult IS NULL
    AND EXISTS (
      SELECT 1 FROM public.admin a
      WHERE a.competition = race.competition
        AND a."user" = (SELECT auth.uid())
    )
  );

COMMIT;

-- Part 3: unique race numbers. ---------------------------------------------------
-- The site assumes a race number appears once per competition (e.g. there's
-- only one current race), and Generate numbers new races on from the last
-- qualifying race, so make the database refuse duplicates. There were none
-- when this was applied.
BEGIN;

ALTER TABLE public.race
  ADD CONSTRAINT race_competition_number_key UNIQUE (competition, number);

COMMIT;
