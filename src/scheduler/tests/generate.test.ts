// Tests for the port of team_race_scheduler's generate.py and heuristic.py
// (Henry Hollingworth, https://github.com/Ninjamouse-1000/team_race_scheduler,
// MIT licence). Mirrors the original's tests/test_generate.py.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { analyse } from "../analyse.ts";
import { generate, generateWithStats, type Progress } from "../generate.ts";
import { staggerSearch } from "../heuristic.ts";
import type { GenerateOptions, Schedule } from "../types.ts";

// The original's size matrix: 1 flight 4-9 teams, 2: 10-15, 3: 15-20, 4: 20-26.
const MATRIX: [number, number][] = [
  ...[4, 5, 6, 7, 8, 9].map((n): [number, number] => [n, 1]),
  ...[10, 11, 12, 13, 14, 15].map((n): [number, number] => [n, 2]),
  ...[15, 16, 17, 18, 19, 20].map((n): [number, number] => [n, 3]),
  ...[20, 21, 22, 23, 24, 25, 26].map((n): [number, number] => [n, 4]),
];
// Short enough to keep the suite quick; the node limits usually end each
// search first anyway.
const TIME_LIMIT_MS = Number(process.env.TRS_TEST_TIME_MS ?? 4000);

function assertValid(s: Schedule, n: number, f: number, maxStint = 2) {
  const rep = analyse(s, maxStint);
  assert.equal(s.nTeams, n);
  assert.equal(s.nFlights, f);
  assert.equal(s.races.length, (n * (n - 1)) / 2);
  assert.deepEqual(rep.duplicatePairs, []);
  assert.equal(rep.missingPairs, 0);
  assert.deepEqual(rep.gapViolations.slice(0, 3), []);
  assert.deepEqual(rep.stintViolations.slice(0, 3), []);
  assert.ok(rep.maxSpread <= 2);
  assert.equal(rep.hardOk, true);
  return rep;
}

describe("generate: full round robin obeying every hard rule", () => {
  for (const [n, f] of MATRIX) {
    test(`${n}x${f}`, () => {
      const rep = assertValid(generate({ nTeams: n, nFlights: f, timeLimitMs: TIME_LIMIT_MS }), n, f);
      // first breakpoint at N races should always be achievable
      assert.ok(rep.breakpoints.includes(n));
    });
  }
  for (const [n, f] of [[8, 1], [13, 2], [16, 3], [21, 4]]) {
    for (const seed of [1, 2]) {
      test(`${n}x${f} seed ${seed}`, () => {
        assertValid(generate({ nTeams: n, nFlights: f, seed, timeLimitMs: TIME_LIMIT_MS }), n, f);
      });
    }
  }
});

describe("generate", () => {
  test("same options give the same schedule; seeds differ", () => {
    const a = generate({ nTeams: 12, nFlights: 2, seed: 3 });
    const b = generate({ nTeams: 12, nFlights: 2, seed: 3 });
    const c = generate({ nTeams: 12, nFlights: 2, seed: 4 });
    assert.deepEqual(a, b);
    assert.notDeepEqual(a.races, c.races);
  });

  test("odd team counts can be a perfect stagger", () => {
    const { schedule, stats } = generateWithStats({ nTeams: 9, nFlights: 1 });
    assert.equal(stats.source, "stagger");
    assert.deepEqual(analyse(schedule).doubleChangeovers, []);
  });

  test("maxStint 3 is accepted (stints stay at 2, as in the Python)", () => {
    const rep = assertValid(generate({ nTeams: 10, nFlights: 2, maxStint: 3 }), 10, 2, 3);
    assert.ok(Math.max(...Object.keys(rep.stintLengths).map(Number)) <= 2);
  });

  test("maxStint 1: nobody stays in", () => {
    for (const [n, f] of [[6, 1], [12, 2], [20, 4]]) {
      const rep = assertValid(generate({ nTeams: n, nFlights: f, maxStint: 1 }), n, f, 1);
      assert.deepEqual(Object.keys(rep.stintLengths), ["1"]);
    }
    // impossible: consecutive races need four different teams
    assert.throws(() => generate({ nTeams: 4, nFlights: 1, maxStint: 1 }), /at least 5 teams/);
  });

  test("the /scheduler page's input ranges", () => {
    assertValid(generate({ nTeams: 12, nFlights: 2, seed: 2 ** 31 - 1 }), 12, 2);
    assertValid(generate({ nTeams: 12, nFlights: 2, maxStint: 10 }), 12, 2, 10);
    assertValid(generate({ nTeams: 3, nFlights: 1 }), 3, 1);
  });

  test("impossible sizes fail at once with a reason", () => {
    const fails = (o: GenerateOptions, re: RegExp) => {
      const t0 = performance.now();
      assert.throws(() => generate(o), re);
      assert.ok(performance.now() - t0 < 50);
    };
    fails({ nTeams: 8, nFlights: 4 }, /4 flights need at least 9 teams/);
    fails({ nTeams: 5, nFlights: 2 }, /5 teams on 2 flights can't make a round robin/);
    fails({ nTeams: 21, nFlights: 10, maxStint: 3 }, /can't make a round robin/);
    fails({ nTeams: 22, nFlights: 10, maxStint: 1 }, /With a max stint of 1, 10 flights need at least 23 teams/);
  });

  test("never runs noticeably past timeLimitMs", () => {
    for (const timeLimitMs of [300, 1500]) {
      const t0 = performance.now();
      try {
        assertValid(generate({ nTeams: 60, nFlights: 10, timeLimitMs }), 60, 10);
      } catch (e) {
        assert.match((e as Error).message, /within the time limit/);
      }
      assert.ok(performance.now() - t0 < timeLimitMs + 200, `${timeLimitMs}ms limit`);
    }
  });

  test("progress: at most 10 a second, with a rising fraction in 0..1", () => {
    const seen: Progress[] = [];
    const t0 = performance.now();
    generate({ nTeams: 16, nFlights: 3 }, (p) => seen.push(p));
    assert.ok(seen.length >= 2);
    assert.ok(seen.length <= 1 + (performance.now() - t0) / 100);
    assert.equal(seen[0].message, "Searching (0/120 races)");
    assert.ok(seen.every((p) => /^(Searching|Completing) \(\d+\/120 races\)$/.test(p.message)));
    assert.ok(seen.some((p) => p.message.startsWith("Completing")));
    const fractions = seen.map((p) => p.fraction!);
    assert.ok(fractions.every((x, i) => x >= 0 && x <= 1 && (i === 0 || x >= fractions[i - 1])));
  });

  test("rejects bad options", () => {
    assert.throws(() => generate({ nTeams: 2, nFlights: 1 }), /at least 3 teams/);
    assert.throws(() => generate({ nTeams: 6, nFlights: 0 }), /at least 1 flight/);
    assert.throws(() => generate({ nTeams: 6.5, nFlights: 1 }), /at least 3 teams/);
    assert.throws(() => generate({ nTeams: 6, nFlights: 1, maxStint: 0 }), /maxStint/);
    assert.throws(() => generate({ nTeams: 6, nFlights: 1, timeLimitMs: 0 }), /timeLimitMs/);
  });
});

describe("staggerSearch", () => {
  test("finds a perfect stagger for 5 and 7 teams on 1 flight", () => {
    for (const n of [5, 7]) {
      const res = staggerSearch(n, 1);
      assert.equal(res.complete, true);
      assert.deepEqual(analyse({ nTeams: n, nFlights: 1, races: res.races }).doubleChangeovers, []);
    }
  });

  test("returns the deepest prefix when it runs out of nodes", () => {
    const res = staggerSearch(14, 2, { nodeLimit: 2000 });
    assert.equal(res.complete, false);
    assert.ok(res.races.length > 14 && res.races.length < 91);
    assert.deepEqual(analyse({ nTeams: 14, nFlights: 2, races: res.races }).doubleChangeovers, []);
  });

  test("keeps a given prefix", () => {
    const prefix = staggerSearch(8, 1, { nodeLimit: 5000 }).races.slice(0, 10);
    const res = staggerSearch(8, 1, { prefix, allowDoubles: true, nodeLimit: 40_000 });
    assert.equal(res.complete, true);
    assert.deepEqual(res.races.slice(0, 10), prefix);
  });
});
