"""Builds the analyse parity fixtures from the original Python package.

Usage: python3 -B src/scheduler/fixtures/make_fixtures.py [path/to/team_race_scheduler]

The NxF.csv files are copied unchanged from team_race_scheduler/schedules/
(https://github.com/Ninjamouse-1000/team_race_scheduler, MIT licence,
(c) 2026 Henry Hollingworth). This script

1. writes the deliberately broken broken-*.csv variants (and empty.csv), using
   the original's read_csv/write_csv, and
2. runs the original's read_csv + analyse on every CSV here and writes
   expected-analyse.json, which analyse.test.ts compares against.

Only analyse.py, io.py and schedule.py are imported, so OR-Tools is not needed.
"""

import json
import random
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ORIGINAL = Path(sys.argv[1] if len(sys.argv) > 1 else Path.home() / "repos/team_race_scheduler")
sys.path.insert(0, str(ORIGINAL / "src"))

from team_race_scheduler.analyse import analyse  # noqa: E402
from team_race_scheduler.io import read_csv, write_csv  # noqa: E402
from team_race_scheduler.schedule import Schedule  # noqa: E402


def variant(src, out, mutate):
    s, names, boats = read_csv(HERE / src)
    races = [tuple(r) for r in s.races]
    races = mutate(races)
    write_csv(Schedule(s.n_teams, s.n_flights, races), HERE / out, names, boats)


def replace(i, race):
    def f(races):
        races[i] = race
        return races
    return f


def swap_sides(i):
    def f(races):
        a, b = races[i]
        races[i] = (b, a)
        return races
    return f


def shuffle(seed):
    def f(races):
        random.Random(seed).shuffle(races)
        return races
    return f


def make_variants():
    # A pair from race 1 again at race 12: a duplicate and a missing pair.
    variant("8x1.csv", "broken-duplicate.csv", lambda r: replace(11, r[0])(r))
    # Swapping sides at gap == F changes boat: gap violations.
    variant("10x2.csv", "broken-sides.csv", swap_sides(20))
    # The same team on both boats.
    variant("6x1.csv", "broken-same-team.csv", lambda r: replace(4, (r[4][0], r[4][0]))(r))
    # Stops part-way: missing pairs, and breakpoints only up to the cut.
    variant("12x2.csv", "broken-truncated.csv", lambda r: r[:30])
    # Shuffled: many gap violations (more than the 10 the summary shows),
    # stint changes, spread > 2, few breakpoints.
    variant("16x3.csv", "broken-shuffled.csv", shuffle(1))
    # A team staying in for 3 races on 1 flight: a stint violation.
    write_csv(
        Schedule(5, 1, [(0, 1), (0, 2), (0, 3), (4, 3), (4, 1), (2, 1), (2, 4), (3, 2), (3, 1), (4, 0)]),
        HERE / "broken-stint.csv",
    )
    # Header only.
    write_csv(Schedule(0, 2, []), HERE / "empty.csv")
    # Names that need quoting, and custom boat names (csv.test.ts checks that
    # writeCsv produces these exact bytes).
    write_csv(
        Schedule(5, 1, [(0, 1), (2, 1), (2, 3), (4, 3), (4, 0), (2, 0), (2, 4), (1, 4), (1, 3), (0, 3)]),
        HERE / "names.csv",
        team_names=["Imperial, A", 'Bath "Robe"', "Caf\u00e9 \u00d8", "Line\nBreak", "Plain"],
        boat_names=["Red, Dark", "Blue"],
    )


def report_json(rep):
    return {
        "nTeams": rep.n_teams,
        "nFlights": rep.n_flights,
        "nRaces": rep.n_races,
        "hardOk": rep.hard_ok,
        "duplicatePairs": [list(p) for p in rep.duplicate_pairs],
        "missingPairs": rep.missing_pairs,
        "gapViolations": rep.gap_violations,
        "stintViolations": rep.stint_violations,
        "maxSpread": rep.max_spread,
        "maxStint": rep.max_stint,
        "breakpoints": rep.breakpoints,
        "fullBreakpoints": rep.full_breakpoints,
        "breakpointsEveryNUntil": rep.breakpoints_every_n_until,
        "doubleChangeovers": rep.double_changeovers,
        "stintLengths": {str(k): v for k, v in sorted(rep.stint_lengths.items())},
        "score": rep.score,
        "summary": rep.summary(),
    }


def main():
    make_variants()
    out = {}
    for path in sorted(HERE.glob("*.csv")):
        s, names, boats = read_csv(path)
        # max_stint 1 and 3 on the small and broken files only, to keep the
        # JSON small (max_stint 1 flags every stint of 2).
        stints = (1, 2, 3) if s.n_teams <= 9 or not path.stem[0].isdigit() else (2,)
        out[path.name] = {
            "schedule": {"nTeams": s.n_teams, "nFlights": s.n_flights, "races": [list(r) for r in s.races]},
            "teamNames": names,
            "boatNames": boats,
            "reports": {str(m): report_json(analyse(s, m)) for m in stints},
        }
    # One CSV per line keeps the file small and its diffs readable.
    lines = [f"{json.dumps(k)}: {json.dumps(v, separators=(',', ':'))}" for k, v in out.items()]
    (HERE / "expected-analyse.json").write_text("{\n" + ",\n".join(lines) + "\n}\n")
    print(f"wrote expected-analyse.json for {len(out)} CSVs")


if __name__ == "__main__":
    main()
