-- Dry run of the race INSERT and DELETE policies in db/2026-11-21-stages.sql
-- (part 2), before they were applied to production. Everything happens in
-- one transaction that ends in ROLLBACK, so it changes nothing: the policies,
-- a fake user, a throwaway second competition and the test races all vanish.
-- It only touches sandbox races and the throwaway competition's.
--
--   supabase db query --linked -o table -f db/2026-11-21-stages-rls-test.sql
--
-- The final SELECT lists each attempt, what should happen and what did. Once
-- the policies exist, it still works: drop the two CREATE POLICY statements.
BEGIN;

-- The policies, exactly as in db/2026-11-21-stages.sql.
CREATE POLICY "Admins can add their competition's non-qualifying races"
  ON public.race AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    league <> 'quali'
    AND EXISTS (
      SELECT 1 FROM public.admin a
      WHERE a.competition = race.competition
        AND a."user" = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins can delete their competition's unraced Gold/Silver races"
  ON public.race AS PERMISSIVE FOR DELETE TO authenticated
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

-- Fixtures, as postgres:
-- * a fake user who is an admin of the sandbox only;
-- * a throwaway competition, rls_other, with an unraced Gold race;
-- * sandbox Gold races 901 (with a result), 902 and 903 (unraced).
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-4000-8000-00000000a11d', 'rls-test@example.invalid');
INSERT INTO public.competition (id, name, host)
VALUES ('rls_other', 'RLS test', 'rls-other.invalid');
INSERT INTO public.admin (competition, "user")
VALUES ('sandbox', '00000000-0000-4000-8000-00000000a11d');
INSERT INTO public.race (id, competition, league, number, flight, finishtime, lresult, rresult)
VALUES
  ('00000000-0000-4000-8000-0000000b0901', 'sandbox', 'semis/gold', 901,
   'f5d660fd-91c7-4f37-a6a3-a339d92437f9', now(), '{1,2,3}', '{4,5,6}'),
  ('00000000-0000-4000-8000-0000000b0902', 'sandbox', 'semis/gold', 902,
   'f5d660fd-91c7-4f37-a6a3-a339d92437f9', NULL, NULL, NULL),
  ('00000000-0000-4000-8000-0000000b0903', 'sandbox', 'semis/silver', 903,
   '597598a4-b7b1-4413-b389-98e2184a509b', NULL, NULL, NULL),
  ('00000000-0000-4000-8000-0000000b0001', 'rls_other', 'semis/gold', 1,
   'f5d660fd-91c7-4f37-a6a3-a339d92437f9', NULL, NULL, NULL);

-- Results, writable by the roles under test.
CREATE TEMP TABLE rls_results (
  n int, who text, attempt text, expected text, outcome text
);
GRANT ALL ON rls_results TO anon, authenticated;

-- Runs one statement as the current role and records what happened.
CREATE FUNCTION pg_temp.try(n int, who text, attempt text, expected text, stmt text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE c int;
BEGIN
  EXECUTE stmt;
  GET DIAGNOSTICS c = ROW_COUNT;
  INSERT INTO rls_results VALUES (n, who, attempt, expected, c || ' row(s)');
EXCEPTION WHEN OTHERS THEN
  INSERT INTO rls_results VALUES (n, who, attempt, expected, 'error: ' || SQLERRM);
END $$;

-- Logged out.
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT pg_temp.try(1, 'anon', 'insert a sandbox Gold race', 'refused',
  $q$INSERT INTO race (competition, league, number, flight) VALUES
     ('sandbox', 'semis/gold', 950, 'f5d660fd-91c7-4f37-a6a3-a339d92437f9')$q$);
SELECT pg_temp.try(2, 'anon', 'delete an unraced sandbox Gold race', '0 row(s)',
  $q$DELETE FROM race WHERE id = '00000000-0000-4000-8000-0000000b0902'$q$);
SELECT pg_temp.try(3, 'anon', 'delete a sandbox qualifying race', '0 row(s)',
  $q$DELETE FROM race WHERE competition = 'sandbox' AND league = 'quali' AND number = 1$q$);
RESET ROLE;

-- Logged in as an admin of the sandbox only.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000a11d","role":"authenticated"}', true);
SELECT pg_temp.try(4, 'sandbox admin', 'insert a sandbox qualifying race', 'refused',
  $q$INSERT INTO race (competition, league, number, flight) VALUES
     ('sandbox', 'quali', 951, 'f5d660fd-91c7-4f37-a6a3-a339d92437f9')$q$);
SELECT pg_temp.try(5, 'sandbox admin', 'insert sandbox Gold and Silver races', '2 row(s)',
  $q$INSERT INTO race (competition, league, number, flight) VALUES
     ('sandbox', 'semis/gold', 952, 'f5d660fd-91c7-4f37-a6a3-a339d92437f9'),
     ('sandbox', 'semis/silver', 953, '597598a4-b7b1-4413-b389-98e2184a509b')$q$);
SELECT pg_temp.try(6, 'sandbox admin', 'insert a sandbox finals race', '1 row(s)',
  $q$INSERT INTO race (competition, league, number, flight) VALUES
     ('sandbox', 'finals/final', 954, 'f5d660fd-91c7-4f37-a6a3-a339d92437f9')$q$);
SELECT pg_temp.try(7, 'sandbox admin', 'delete a sandbox qualifying race', '0 row(s)',
  $q$DELETE FROM race WHERE competition = 'sandbox' AND league = 'quali' AND number = 1$q$);
SELECT pg_temp.try(8, 'sandbox admin', 'delete a sandbox Gold race with a result', '0 row(s)',
  $q$DELETE FROM race WHERE id = '00000000-0000-4000-8000-0000000b0901'$q$);
SELECT pg_temp.try(9, 'sandbox admin', 'delete a sandbox finals race', '0 row(s)',
  $q$DELETE FROM race WHERE competition = 'sandbox' AND number = 954$q$);
SELECT pg_temp.try(10, 'sandbox admin', 'delete unraced sandbox Gold/Silver races', '2 row(s)',
  $q$DELETE FROM race WHERE id IN ('00000000-0000-4000-8000-0000000b0902',
                                   '00000000-0000-4000-8000-0000000b0903')$q$);
SELECT pg_temp.try(11, 'sandbox admin', 'insert a Gold race in another competition', 'refused',
  $q$INSERT INTO race (competition, league, number, flight) VALUES
     ('rls_other', 'semis/gold', 2, 'f5d660fd-91c7-4f37-a6a3-a339d92437f9')$q$);
SELECT pg_temp.try(12, 'sandbox admin', 'insert a qualifying race in another competition', 'refused',
  $q$INSERT INTO race (competition, league, number, flight) VALUES
     ('rls_other', 'quali', 3, 'f5d660fd-91c7-4f37-a6a3-a339d92437f9')$q$);
SELECT pg_temp.try(13, 'sandbox admin', 'delete an unraced Gold race in another competition', '0 row(s)',
  $q$DELETE FROM race WHERE id = '00000000-0000-4000-8000-0000000b0001'$q$);
RESET ROLE;

-- The race with a result and the other competition's race must still exist.
INSERT INTO rls_results
SELECT 14, 'postgres', 'races 901 and rls_other #1 still exist', '2 row(s)',
       count(*) || ' row(s)'
FROM race WHERE id IN ('00000000-0000-4000-8000-0000000b0901',
                       '00000000-0000-4000-8000-0000000b0001');

SELECT n, who, attempt, expected, outcome,
       CASE WHEN expected = 'refused'
              THEN outcome LIKE 'error: new row violates row-level security policy%'
            ELSE outcome = expected END AS pass
FROM rls_results ORDER BY n;

ROLLBACK;

-- Result on production, 2026-11-21, before the policies were applied (all
-- pass; race, policy, competition, auth.users and admin counts were the same
-- before and after):
--  n | who           | attempt                                            | expected | outcome
--  1 | anon          | insert a sandbox Gold race                         | refused  | error: new row violates row-level security policy for table "race"
--  2 | anon          | delete an unraced sandbox Gold race                | 0 row(s) | 0 row(s)
--  3 | anon          | delete a sandbox qualifying race                   | 0 row(s) | 0 row(s)
--  4 | sandbox admin | insert a sandbox qualifying race                   | refused  | error: new row violates row-level security policy for table "race"
--  5 | sandbox admin | insert sandbox Gold and Silver races               | 2 row(s) | 2 row(s)
--  6 | sandbox admin | insert a sandbox finals race                       | 1 row(s) | 1 row(s)
--  7 | sandbox admin | delete a sandbox qualifying race                   | 0 row(s) | 0 row(s)
--  8 | sandbox admin | delete a sandbox Gold race with a result           | 0 row(s) | 0 row(s)
--  9 | sandbox admin | delete a sandbox finals race                       | 0 row(s) | 0 row(s)
-- 10 | sandbox admin | delete unraced sandbox Gold/Silver races           | 2 row(s) | 2 row(s)
-- 11 | sandbox admin | insert a Gold race in another competition          | refused  | error: new row violates row-level security policy for table "race"
-- 12 | sandbox admin | insert a qualifying race in another competition    | refused  | error: new row violates row-level security policy for table "race"
-- 13 | sandbox admin | delete an unraced Gold race in another competition | 0 row(s) | 0 row(s)
-- 14 | postgres      | races 901 and rls_other #1 still exist             | 2 row(s) | 2 row(s)
