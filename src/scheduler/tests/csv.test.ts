// Tests for the port of team_race_scheduler's io.py (Henry Hollingworth,
// https://github.com/Ninjamouse-1000/team_race_scheduler, MIT licence).
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { readSchedule } from "../../../scripts/schedule-csv.ts";
import { defaultBoatNames, parseCsvRows, readCsv, readTeamNames, writeCsv } from "../csv.ts";
import type { Race, Schedule } from "../types.ts";

const fixturesDir = new URL("../fixtures/", import.meta.url);
const fixture = (name: string) => readFileSync(new URL(name, fixturesDir), "utf-8");
const csvFixtures = readdirSync(fixturesDir).filter((f) => f.endsWith(".csv"));

const PERFECT_5x1: Race[] = [[0, 1], [2, 1], [2, 3], [4, 3], [4, 0], [2, 0], [2, 4], [1, 4], [1, 3], [0, 3]];

describe("csv", () => {
  test("round trip with names and boats (ported Python test)", () => {
    const s: Schedule = { nTeams: 5, nFlights: 1, races: PERFECT_5x1 };
    const names = ["A", "B", "C", "D", "E"];
    const back = readCsv(writeCsv(s, names, ["Red", "Green"]));
    assert.deepEqual(
      back.schedule.races.map(([a, b]) => [back.teamNames[a], back.teamNames[b]]),
      s.races.map(([a, b]) => [names[a], names[b]]),
    );
    assert.deepEqual(back.boatNames, ["Red", "Green"]);
  });

  test("defaults: Team 1.. and Flight 1a..", () => {
    const text = writeCsv({ nTeams: 4, nFlights: 2, races: [[0, 1], [2, 3], [0, 2]] });
    assert.equal(
      text,
      "Race,Flight 1a,Flight 1b,Flight 2a,Flight 2b\r\n" +
        "1,Team 1,Team 2,,\r\n2,,,Team 3,Team 4\r\n3,Team 1,Team 3,,\r\n",
    );
    assert.deepEqual(defaultBoatNames(1), ["Flight 1a", "Flight 1b"]);
  });

  // Every fixture was written by the Python write_csv, so writing what we read
  // must give back the same bytes.
  for (const file of csvFixtures) {
    test(`reads and rewrites ${file} byte for byte`, () => {
      const text = fixture(file);
      const { schedule, teamNames, boatNames } = readCsv(text);
      assert.equal(writeCsv(schedule, teamNames.length ? teamNames : undefined, boatNames), text);
    });
  }

  test("reads the original's schedules", () => {
    for (const file of csvFixtures.filter((f) => /^\d+x\d+\.csv$/.test(f))) {
      const [n, f] = file.replace(".csv", "").split("x").map(Number);
      const { schedule, teamNames, boatNames } = readCsv(fixture(file));
      assert.equal(schedule.nTeams, n, file);
      assert.equal(schedule.nFlights, f, file);
      assert.equal(schedule.races.length, (n * (n - 1)) / 2, file);
      assert.deepEqual([...teamNames].sort(), Array.from({ length: n }, (_, i) => `Team ${i + 1}`).sort());
      assert.deepEqual(boatNames, defaultBoatNames(f));
    }
  });

  test("quoting matches Python's csv module", () => {
    const text = fixture("names.csv");
    const { schedule, teamNames, boatNames } = readCsv(text);
    assert.deepEqual(teamNames, ["Imperial, A", 'Bath "Robe"', "Café Ø", "Line\nBreak", "Plain"]);
    assert.deepEqual(boatNames, ["Red, Dark", "Blue"]);
    assert.equal(writeCsv(schedule, teamNames, boatNames), text);
  });

  test("parser handles line endings, blank lines and quotes", () => {
    assert.deepEqual(parseCsvRows('a,b\n\r\n"c,""d""",e\rf,'), [["a", "b"], [], ['c,"d"', "e"], ["f", ""]]);
    const unix = "Race,X,Y\n1,P,Q\n\n2,Q,R\n";
    assert.deepEqual(readCsv(unix).schedule.races, [[0, 1], [1, 2]]);
  });

  test("errors like the Python", () => {
    assert.throws(() => readCsv("Race,a,b,c\n1,A,B,\n"), /even number of boat columns/);
    assert.throws(() => readCsv("Race,a,b,c,d\n1,A,,B,\n"), /expected exactly two boats of one flight, got \[0, 2\]/);
    assert.throws(() => readCsv("Race,a,b,c,d\n1,,,A,B\n"), /Race 1 is on flight 2, expected rotating flights/);
    assert.throws(() => writeCsv({ nTeams: 3, nFlights: 1, races: [] }, ["A"]), /Need 3 team names, got 1/);
    assert.throws(() => writeCsv({ nTeams: 3, nFlights: 1, races: [] }, undefined, ["x"]), /Need 2 boat names/);
  });

  test("team names file", () => {
    assert.deepEqual(readTeamNames("# teams\nImperial\r\n\n  Bath  \n#skip\nExeter"), ["Imperial", "Bath", "Exeter"]);
  });

  test("scripts/schedule-csv.ts reads what writeCsv writes", () => {
    const dir = mkdtempSync(join(tmpdir(), "scheduler-csv-"));
    try {
      const s: Schedule = { nTeams: 6, nFlights: 2, races: [[0, 1], [2, 3], [0, 4], [5, 3]] };
      writeFileSync(join(dir, "schedule.csv"), writeCsv(s, undefined, ["Y", "B", "W", "LB"]));
      writeFileSync(
        join(dir, "config.json"),
        JSON.stringify({
          competition: "c",
          league: "quali",
          schedule: "schedule.csv",
          flights: [
            { id: "f1", columns: ["Y", "B"] },
            { id: "f2", columns: ["W", "LB"] },
          ],
        }),
      );
      const { races } = readSchedule(join(dir, "config.json"));
      assert.deepEqual(races, [
        { number: 1, flight: "f1", lteam: "Team 1", rteam: "Team 2" },
        { number: 2, flight: "f2", lteam: "Team 3", rteam: "Team 4" },
        { number: 3, flight: "f1", lteam: "Team 1", rteam: "Team 5" },
        { number: 4, flight: "f2", lteam: "Team 6", rteam: "Team 4" },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
