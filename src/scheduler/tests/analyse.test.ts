// Tests for the port of team_race_scheduler's analyse.py (Henry Hollingworth,
// https://github.com/Ninjamouse-1000/team_race_scheduler, MIT licence).
//
// The parity test compares against fixtures/expected-analyse.json, which
// fixtures/make_fixtures.py writes by running the original Python analyse().
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { analyse } from "../analyse.ts";
import { readCsv } from "../csv.ts";
import type { Race, Report, Schedule } from "../types.ts";

const fixture = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf-8");

interface Expected {
  schedule: Schedule;
  teamNames: string[];
  boatNames: string[];
  reports: Record<string, Report>;
}
const expected: Record<string, Expected> = JSON.parse(fixture("expected-analyse.json"));

// JSON round trip, so number keys in stintLengths compare like the fixture's.
const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe("analyse matches the Python analyse() on every fixture", () => {
  for (const [file, exp] of Object.entries(expected)) {
    test(file, () => {
      const { schedule, teamNames, boatNames } = readCsv(fixture(file));
      assert.deepEqual(plain(schedule), exp.schedule, "readCsv schedule");
      assert.deepEqual(teamNames, exp.teamNames, "readCsv team names");
      assert.deepEqual(boatNames, exp.boatNames, "readCsv boat names");
      for (const [maxStint, report] of Object.entries(exp.reports)) {
        assert.deepEqual(plain(analyse(schedule, Number(maxStint))), report, `maxStint ${maxStint}`);
      }
    });
  }

  test("covers originals and broken variants", () => {
    const files = Object.keys(expected);
    assert.equal(files.filter((f) => /^\d+x\d+\.csv$/.test(f)).length, 25);
    assert.ok(files.filter((f) => f.startsWith("broken-")).length >= 5);
    const reports = Object.values(expected).flatMap((e) => Object.values(e.reports));
    assert.ok(reports.some((r) => r.duplicatePairs.length));
    assert.ok(reports.some((r) => r.gapViolations.length > 10));
    assert.ok(reports.some((r) => r.stintViolations.length));
    assert.ok(reports.some((r) => r.maxSpread > 2));
    assert.ok(reports.some((r) => r.missingPairs > 0));
  });
});

// Ported from the original's tests/test_analyse.py.
// 5 teams, 1 flight: a perfect stagger (Euler circuit 0-1-2-3-4-0-2-4-1-3-0),
// each race keeps one team in the same boat and brings in one new team.
const PERFECT_5x1: Race[] = [[0, 1], [2, 1], [2, 3], [4, 3], [4, 0], [2, 0], [2, 4], [1, 4], [1, 3], [0, 3]];

describe("analyse (ported Python tests)", () => {
  test("perfect stagger metrics", () => {
    const rep = analyse({ nTeams: 5, nFlights: 1, races: PERFECT_5x1 });
    assert.equal(rep.hardOk, true);
    assert.ok(rep.maxSpread <= 2);
    assert.deepEqual(rep.breakpoints, [5, 10]);
    assert.equal(rep.breakpointsEveryNUntil, 10);
    assert.deepEqual(rep.doubleChangeovers, []);
  });

  test("double changeover detected", () => {
    // race 3 on flight 1 shares no team with race 1 on flight 1
    const rep = analyse({ nTeams: 6, nFlights: 2, races: [[0, 1], [2, 3], [4, 5]] });
    assert.deepEqual(rep.doubleChangeovers, [3]);
  });

  test("gap rule violations detected", () => {
    // 2 flights: team 0 in race 1 (flight 1) and race 2 (flight 2) -> too soon
    assert.ok(analyse({ nTeams: 4, nFlights: 2, races: [[0, 1], [0, 2]] }).gapViolations.length);
    // gap == F but switching boat side is also a violation
    assert.ok(analyse({ nTeams: 6, nFlights: 2, races: [[0, 1], [2, 3], [4, 0]] }).gapViolations.length);
    // gap == F staying on the same boat is fine, and gap F+1 may switch boats
    const ok = analyse({ nTeams: 6, nFlights: 2, races: [[0, 1], [2, 3], [0, 4], [5, 1]] });
    assert.deepEqual(ok.gapViolations, []);
  });
});

describe("analyse input checks", () => {
  test("rejects teams out of range", () => {
    assert.throws(() => analyse({ nTeams: 3, nFlights: 1, races: [[0, 3]] }), /team 3/);
    assert.throws(() => analyse({ nTeams: 3, nFlights: 1, races: [[0, -1]] }), /team -1/);
  });
  test("rejects a bad flight count", () => {
    assert.throws(() => analyse({ nTeams: 3, nFlights: 0, races: [] }), /nFlights/);
  });
});
