// Tests for planGroups (src/groups.ts): node --test src/groups.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DEFAULT_GROUPS } from "./competitions.ts";
import {
  ordinal,
  planGroups,
  racedGroupRaces,
  type Group,
  type PlanRace,
  type Standing,
} from "./groups.ts";
import { analyse } from "./scheduler/analyse.ts";

const A = "flight-a";
const B = "flight-b";

/** n teams, best first, with distinct records. */
function standingsOf(n: number): Standing[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    name: `Team ${i}`,
    wins: n - 1 - i,
    losses: i,
    totalPoints: 30 + i,
  }));
}

/** A full qualifying round robin of n teams alternating between flights A and B. */
function qualiOf(n: number, finished = true): PlanRace[] {
  const races: PlanRace[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const number = races.length + 1;
      races.push({
        number,
        league: "quali",
        flight: number % 2 === 1 ? A : B,
        lteam: `t${i}`,
        rteam: `t${j}`,
        finished,
      });
    }
  }
  return races;
}

/** Whether a group's races are a valid round robin on one flight. */
function assertRoundRobin(group: Group) {
  const index = new Map(group.teams.map((t, i) => [t.id, i]));
  const report = analyse({
    nTeams: group.teams.length,
    nFlights: 1,
    races: group.races.map((r) => [index.get(r.lteam)!, index.get(r.rteam)!]),
  });
  assert.equal(report.hardOk, true, report.summary);
  assert.equal(report.nRaces, (group.teams.length * (group.teams.length - 1)) / 2);
}

describe("planGroups", () => {
  test("13 teams: 7 in Gold on the first flight, 6 in Silver, races 79-114", () => {
    const plan = planGroups({ standings: standingsOf(13), races: qualiOf(13), config: DEFAULT_GROUPS });
    assert.deepEqual(plan.gold.teams.map((t) => t.rank), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(plan.silver.teams.map((t) => t.rank), [8, 9, 10, 11, 12, 13]);
    assert.equal(plan.gold.flight, A);
    assert.equal(plan.silver.flight, B);
    assert.deepEqual(plan.warnings, []);

    assert.equal(plan.races.length, 21 + 15);
    assert.deepEqual(plan.races.map((r) => r.number), Array.from({ length: 36 }, (_, i) => 79 + i));
    // Race 78 was on B, so Gold (on A) goes first, then they alternate until
    // Silver runs out and Gold carries on alone.
    const leagues = plan.races.map((r) => (r.league === "semis/gold" ? "G" : "S")).join("");
    assert.equal(leagues, "GS".repeat(15) + "G".repeat(6));
    for (const r of plan.races) {
      assert.equal(r.flight, r.league === "semis/gold" ? A : B);
    }
    assertRoundRobin(plan.gold);
    assertRoundRobin(plan.silver);
    // Every race is between two teams of its own group.
    for (const group of [plan.gold, plan.silver]) {
      const ids = new Set(group.teams.map((t) => t.id));
      for (const r of group.races) assert.ok(ids.has(r.lteam) && ids.has(r.rteam));
    }
  });

  test("the same inputs give the same plan", () => {
    const input = { standings: standingsOf(13), races: qualiOf(13), config: DEFAULT_GROUPS };
    assert.deepEqual(planGroups(input), planGroups(input));
  });

  test("config: Silver gets the larger half, Gold the second flight", () => {
    const plan = planGroups({
      standings: standingsOf(13),
      races: qualiOf(13),
      config: { largerGroup: "silver", goldFlight: 1 },
    });
    assert.equal(plan.gold.teams.length, 6);
    assert.equal(plan.silver.teams.length, 7);
    assert.equal(plan.gold.flight, B);
    assert.equal(plan.silver.flight, A);
    // Race 78 was on B (Gold's flight), so Silver starts, on A.
    assert.equal(plan.races[0].league, "semis/silver");
    assert.equal(plan.races[0].flight, A);
    assertRoundRobin(plan.gold);
    assertRoundRobin(plan.silver);
  });

  test("an even number of teams splits evenly", () => {
    const plan = planGroups({ standings: standingsOf(12), races: qualiOf(12), config: DEFAULT_GROUPS });
    assert.equal(plan.gold.teams.length, 6);
    assert.equal(plan.silver.teams.length, 6);
    assert.equal(plan.races.length, 30);
    // 66 qualifying races, the last on B: Gold first.
    assert.equal(plan.races[0].number, 67);
    assert.equal(plan.races[0].league, "semis/gold");
  });

  test("warns about unfinished qualifying races", () => {
    const races = qualiOf(13);
    races[77].finished = false;
    races[76].finished = false;
    const plan = planGroups({ standings: standingsOf(13), races, config: DEFAULT_GROUPS });
    assert.equal(plan.warnings.length, 1);
    assert.match(plan.warnings[0], /^2 qualifying races haven't finished/);
  });

  test("warns about identical records across the Gold/Silver line", () => {
    const standings = standingsOf(13);
    // 6th, 7th and 8th identical: 7th is the last in Gold, 8th the first in Silver.
    for (const i of [5, 6, 7]) Object.assign(standings[i], { wins: 6, losses: 6, totalPoints: 130 });
    const plan = planGroups({ standings, races: qualiOf(13), config: DEFAULT_GROUPS });
    assert.equal(plan.warnings.length, 1);
    assert.match(plan.warnings[0], /^Team 5 \(6th\), Team 6 \(7th\) and Team 7 \(8th\) have identical records/);

    // Identical records that don't straddle the line are fine.
    const ok = standingsOf(13);
    for (const i of [7, 8]) Object.assign(ok[i], { wins: 5, losses: 7, totalPoints: 140 });
    assert.deepEqual(planGroups({ standings: ok, races: qualiOf(13), config: DEFAULT_GROUPS }).warnings, []);
  });

  test("warns that existing Gold/Silver races will be replaced, and about clashing numbers", () => {
    const races = qualiOf(13);
    races.push(
      { number: 79, league: "semis/gold", flight: A, lteam: "t0", rteam: "t1", finished: false },
      { number: 80, league: "semis/silver", flight: B, lteam: "t7", rteam: "t8", finished: false },
      { number: 120, league: "finals/final", flight: A, lteam: null, rteam: null, finished: false },
      { number: 100, league: "finals/semi", flight: A, lteam: null, rteam: null, finished: false },
    );
    const plan = planGroups({ standings: standingsOf(13), races, config: DEFAULT_GROUPS });
    // Still numbered on from qualifying, not from the old Gold/Silver races.
    assert.equal(plan.races[0].number, 79);
    assert.deepEqual(plan.warnings, [
      "The 2 existing Gold/Silver races will be deleted and replaced.",
      "Races 79-114 would share numbers with 1 other race (e.g. race 100, finals/semi).",
    ]);
  });

  test("refuses without enough teams, two flights, or a ranking for every team", () => {
    assert.throws(
      () => planGroups({ standings: standingsOf(5), races: qualiOf(5), config: DEFAULT_GROUPS }),
      /at least 6 teams/,
    );
    const oneFlight = qualiOf(13).map((r) => ({ ...r, flight: A }));
    assert.throws(
      () => planGroups({ standings: standingsOf(13), races: oneFlight, config: DEFAULT_GROUPS }),
      /only one/,
    );
    assert.throws(
      () => planGroups({ standings: standingsOf(12), races: qualiOf(13), config: DEFAULT_GROUPS }),
      /1 qualifying team has no results yet/,
    );
  });
});

describe("racedGroupRaces", () => {
  test("only Gold/Silver races with results", () => {
    const races: PlanRace[] = [
      { number: 1, league: "quali", flight: A, lteam: "a", rteam: "b", finished: true },
      { number: 2, league: "semis/gold", flight: A, lteam: "a", rteam: "b", finished: true },
      { number: 3, league: "semis/silver", flight: B, lteam: "c", rteam: "d", finished: false },
      { number: 4, league: "finals/final", flight: A, lteam: "a", rteam: "b", finished: true },
    ];
    assert.deepEqual(racedGroupRaces(races).map((r) => r.number), [2]);
  });
});

test("ordinal", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal),
    ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th"],
  );
});
