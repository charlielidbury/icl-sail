// Runs the TypeScript scheduler (src/scheduler/, a port of team_race_scheduler
// by Henry Hollingworth, https://github.com/Ninjamouse-1000/team_race_scheduler,
// MIT licence) over the original's size matrix and prints a markdown table
// with the same columns as its benchmarks.md.
//
// Usage: node scripts/scheduler-benchmark.ts [--only 16x3,24x4] [--seeds 10]
//          [--time-limit-ms 120000] [--out dir]
//
// --seeds K also runs seeds 1..K-1 and adds the best score over all K seeds.
// --out writes each seed-0 schedule as <dir>/NxF.csv.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { analyse, DEFAULT_TIME_LIMIT_MS, generateWithStats, writeCsv } from "../src/scheduler/index.ts";

const MATRIX: [number, number][] = [
  ...[4, 5, 6, 7, 8, 9].map((n): [number, number] => [n, 1]),
  ...[10, 11, 12, 13, 14, 15].map((n): [number, number] => [n, 2]),
  ...[15, 16, 17, 18, 19, 20].map((n): [number, number] => [n, 3]),
  ...[20, 21, 22, 23, 24, 25, 26].map((n): [number, number] => [n, 4]),
];

const { values } = parseArgs({
  options: {
    only: { type: "string" },
    seeds: { type: "string", default: "1" },
    "time-limit-ms": { type: "string", default: String(DEFAULT_TIME_LIMIT_MS) },
    out: { type: "string" },
  },
});
const only = values.only?.split(",");
const matrix = only ? MATRIX.filter(([n, f]) => only.includes(`${n}x${f}`)) : MATRIX;
const seeds = Number(values.seeds);
const timeLimitMs = Number(values["time-limit-ms"]);
if (values.out) mkdirSync(values.out, { recursive: true });

const header = [
  "size",
  "races",
  "hard rules",
  "max spread",
  "level every N until race",
  "breakpoints",
  "double changeovers",
  "first double",
  "1-race stints",
  "clean prefix",
  "score",
  "time (s)",
  ...(seeds > 1 ? [`best of ${seeds} seeds`, `time for ${seeds} seeds (s)`] : []),
];
console.log(`| ${header.join(" | ")} |`);
console.log(`|${header.map(() => "---").join("|")}|`);

for (const [n, f] of matrix) {
  const run = (seed: number) => {
    const t0 = performance.now();
    const { schedule, stats } = generateWithStats({ nTeams: n, nFlights: f, seed, timeLimitMs });
    return { schedule, stats, secs: (performance.now() - t0) / 1000 };
  };
  const first = run(0);
  const rep = analyse(first.schedule);
  if (values.out) writeFileSync(join(values.out, `${n}x${f}.csv`), writeCsv(first.schedule));
  const cells: (string | number)[] = [
    `${n}x${f}`,
    rep.nRaces,
    rep.hardOk ? "yes" : "NO",
    rep.maxSpread,
    rep.breakpointsEveryNUntil,
    rep.breakpoints.length,
    rep.doubleChangeovers.length,
    rep.doubleChangeovers[0] ?? "-",
    rep.stintLengths[1] ?? 0,
    `${first.stats.prefixLength}/${rep.nRaces}`,
    rep.score,
    first.secs.toFixed(2),
  ];
  if (seeds > 1) {
    let best = rep.score;
    let total = first.secs;
    for (let seed = 1; seed < seeds; seed++) {
      const r = run(seed);
      const repSeed = analyse(r.schedule);
      if (!repSeed.hardOk) throw new Error(`${n}x${f} seed ${seed} broke a hard rule`);
      best = Math.min(best, repSeed.score);
      total += r.secs;
    }
    cells.push(best, total.toFixed(1));
  }
  console.log(`| ${cells.join(" | ")} |`);
}
