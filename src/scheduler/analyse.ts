// Independent validator and scorer for schedules.
//
// Ported from team_race_scheduler (analyse.py) by Henry Hollingworth,
// https://github.com/Ninjamouse-1000/team_race_scheduler, MIT licence.
//
// Deliberately does not share logic with the generator so it can be used to
// check generated output (and hand-made schedules). The results, the score and
// the summary text match the Python analyse() exactly (see the parity tests).
import type { Report, Schedule } from "./types.ts";
import { boatOf } from "./schedule.ts";

// Objective weights shared by the generator and the scorer.
/** Level at a multiple of N races. */
export const W_FULL_BREAKPOINT = 40;
/** Level at a multiple of N/2 that is not a multiple of N. */
export const W_HALF_BREAKPOINT = 1;
/** Double changeover (both boats on a flight change). */
export const W_DOUBLE = 2;

function checkInput(s: Schedule, maxStint: number): void {
  if (!Number.isInteger(s.nTeams) || s.nTeams < 0) {
    throw new Error(`nTeams must be a non-negative integer, got ${s.nTeams}`);
  }
  if (!Number.isInteger(s.nFlights) || s.nFlights < 1) {
    throw new Error(`nFlights must be a positive integer, got ${s.nFlights}`);
  }
  if (!Number.isInteger(maxStint)) {
    throw new Error(`maxStint must be an integer, got ${maxStint}`);
  }
  if (!Array.isArray(s.races)) throw new Error("races must be an array");
  s.races.forEach((race, i) => {
    if (!Array.isArray(race) || race.length !== 2) {
      throw new Error(`race ${i + 1}: expected a pair of teams`);
    }
    for (const t of race) {
      if (!Number.isInteger(t) || t < 0 || t >= s.nTeams) {
        throw new Error(`race ${i + 1}: team ${t} is not in 0..${s.nTeams - 1}`);
      }
    }
  });
}

/** Check every hard rule and score a schedule. Lower score is better. */
export function analyse(s: Schedule, maxStint = 2): Report {
  checkInput(s, maxStint);
  const n = s.nTeams;
  const f = s.nFlights;
  const nRaces = s.races.length;

  // Distinct unordered pairs, in first-seen order, with counts.
  const pairCount = new Map<string, { pair: [number, number]; count: number }>();
  for (const [a, b] of s.races) {
    const pair: [number, number] = a <= b ? [a, b] : [b, a];
    const key = `${pair[0]},${pair[1]}`;
    const entry = pairCount.get(key);
    if (entry) entry.count++;
    else pairCount.set(key, { pair, count: 1 });
  }
  const duplicatePairs = [...pairCount.values()]
    .filter((e) => e.count > 1)
    .map((e) => e.pair)
    .sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const missingPairs = (n * (n - 1)) / 2 - pairCount.size;

  const gapViolations: string[] = [];
  const stintViolations: string[] = [];
  const breakpoints: number[] = [];
  const doubleChangeovers: number[] = [];
  let maxSpread = 0;

  const played = new Array<number>(n).fill(0);
  const last = new Map<number, [number, number]>(); // team -> [raceNo, boat]
  const stintCur = new Map<number, [number, number]>(); // boat -> [team, length]
  const stints = new Map<number, number>(); // length -> count

  for (let i = 0; i < nRaces; i++) {
    const [a, b] = s.races[i];
    const raceNo = i + 1;
    if (a === b) gapViolations.push(`race ${raceNo}: team ${a} on both boats`);
    for (const [side, t] of [
      [0, a],
      [1, b],
    ] as const) {
      const boat = boatOf(f, raceNo, side);
      const prev = last.get(t);
      if (prev) {
        const [pr, pb] = prev;
        const gap = raceNo - pr;
        if (gap < f || (gap === f && pb !== boat)) {
          gapViolations.push(`race ${raceNo}: team ${t} gap ${gap} (boat ${pb}->${boat})`);
        }
      }
      last.set(t, [raceNo, boat]);
      played[t]++;
      const cur = stintCur.get(boat);
      if (cur && cur[0] === t) {
        stintCur.set(boat, [t, cur[1] + 1]);
        if (cur[1] + 1 > maxStint) {
          stintViolations.push(`race ${raceNo}: team ${t} stint ${cur[1] + 1}`);
        }
      } else {
        if (cur) stints.set(cur[1], (stints.get(cur[1]) ?? 0) + 1);
        stintCur.set(boat, [t, 1]);
      }
    }

    const spread = Math.max(...played) - Math.min(...played);
    maxSpread = Math.max(maxSpread, spread);
    if (spread === 0) breakpoints.push(raceNo);

    if (raceNo > f) {
      const [pa, pb] = s.races[i - f];
      if (a !== pa && a !== pb && b !== pa && b !== pb) doubleChangeovers.push(raceNo);
    }
  }

  for (const [, length] of stintCur.values()) stints.set(length, (stints.get(length) ?? 0) + 1);
  const stintLengths: Record<number, number> = {};
  for (const [length, count] of [...stints.entries()].sort((x, y) => x[0] - y[0])) {
    stintLengths[length] = count;
  }

  const fullBreakpoints = breakpoints.filter((bp) => bp % n === 0);
  const bps = new Set(breakpoints);
  let k = 0;
  while ((k + 1) * n <= nRaces && bps.has((k + 1) * n)) k++;
  const breakpointsEveryNUntil = k * n;

  const hardOk =
    duplicatePairs.length === 0 &&
    missingPairs === 0 &&
    gapViolations.length === 0 &&
    stintViolations.length === 0 &&
    maxSpread <= 2;

  const full = fullBreakpoints.length;
  const half = breakpoints.length - full;
  const score =
    W_DOUBLE * doubleChangeovers.length - W_FULL_BREAKPOINT * full - W_HALF_BREAKPOINT * half;

  const report: Report = {
    nTeams: n,
    nFlights: f,
    nRaces,
    hardOk,
    duplicatePairs,
    missingPairs,
    gapViolations,
    stintViolations,
    maxSpread,
    maxStint,
    breakpoints,
    fullBreakpoints,
    breakpointsEveryNUntil,
    doubleChangeovers,
    stintLengths,
    score,
    summary: "",
  };
  report.summary = summarise(report);
  return report;
}

// Python's repr() of the values in the summary, so the text matches `trs analyse`.
const pyList = (xs: number[]) => `[${xs.join(", ")}]`;
const pyPairs = (ps: [number, number][]) => `[${ps.map(([a, b]) => `(${a}, ${b})`).join(", ")}]`;
const pyDict = (d: Record<number, number>) =>
  `{${Object.entries(d)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ")}}`;

function summarise(r: Report): string {
  const lines = [
    `${r.nTeams} teams x ${r.nFlights} flights, ${r.nRaces} races`,
    `  hard rules ok:        ${r.hardOk ? "True" : "False"}`,
    `  max spread:           ${r.maxSpread}`,
    `  breakpoints:          ${pyList(r.breakpoints)}`,
    `  every N until race:   ${r.breakpointsEveryNUntil}`,
    `  double changeovers:   ${r.doubleChangeovers.length} ${pyList(r.doubleChangeovers)}`,
    `  stint lengths:        ${pyDict(r.stintLengths)}`,
    `  score (lower better): ${r.score}`,
  ];
  if (r.duplicatePairs.length) lines.push(`  DUPLICATE PAIRS: ${pyPairs(r.duplicatePairs)}`);
  if (r.missingPairs) lines.push(`  MISSING PAIRS: ${r.missingPairs}`);
  for (const v of r.gapViolations.slice(0, 10)) lines.push(`  GAP VIOLATION: ${v}`);
  for (const v of r.stintViolations.slice(0, 10)) lines.push(`  STINT VIOLATION: ${v}`);
  return lines.join("\n");
}
