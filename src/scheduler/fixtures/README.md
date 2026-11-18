# Scheduler test fixtures

- `NxF.csv`: copied unchanged from `schedules/` in
  [team_race_scheduler](https://github.com/Ninjamouse-1000/team_race_scheduler)
  (MIT licence, © 2026 Henry Hollingworth; see `../LICENSE`). They are the
  original's CP-SAT benchmark outputs.
- `broken-*.csv`, `empty.csv`, `names.csv` and `expected-analyse.json` are written
  by `make_fixtures.py`, which runs the original Python `read_csv`, `write_csv`
  and `analyse` (no OR-Tools needed):

  ```sh
  python3 -B src/scheduler/fixtures/make_fixtures.py ~/repos/team_race_scheduler
  ```

`tests/analyse.test.ts` checks that the TypeScript `readCsv` and `analyse` give
exactly what the Python gave, and `tests/csv.test.ts` that `writeCsv` reproduces
every CSV byte for byte.
