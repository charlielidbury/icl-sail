// Stand-in for the real scheduler worker (src/scheduler/worker.ts), speaking
// the same WorkerRequest / WorkerResponse protocol so the /scheduler page can
// be built and tested before the TypeScript port lands. It makes a full round
// robin with a randomised greedy search (restarts until a time budget runs
// out), fakes some progress, and scores the result with a direct port of
// analyse.py. It is not the real algorithm: expect weaker schedules.
import type {
  GenerateOptions,
  Race,
  Report,
  Schedule,
  WorkerRequest,
  WorkerResponse,
} from "@/scheduler/types";

const post = (msg: WorkerResponse) => postMessage(msg);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Small seeded PRNG (mulberry32).
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- analyse.py, ported closely ----------------------------------------------

const W_FULL_BREAKPOINT = 40;
const W_HALF_BREAKPOINT = 1;
const W_DOUBLE = 2;

function analyse(s: Schedule, maxStint = 2): Report {
  const n = s.nTeams;
  const f = s.nFlights;
  const boatOf = (raceNo: number, side: number) => 2 * ((raceNo - 1) % f) + side;

  const pairCount = new Map<string, number>();
  for (const [a, b] of s.races) {
    const k = a < b ? `${a},${b}` : `${b},${a}`;
    pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
  }
  const duplicatePairs = [...pairCount]
    .filter(([, c]) => c > 1)
    .map(([k]) => k.split(",").map(Number) as [number, number])
    .sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const missingPairs = (n * (n - 1)) / 2 - pairCount.size;

  const gapViolations: string[] = [];
  const stintViolations: string[] = [];
  const breakpoints: number[] = [];
  const doubleChangeovers: number[] = [];
  const played = new Array<number>(n).fill(0);
  const last = new Map<number, [number, number]>(); // team -> [raceNo, boat]
  const stintCur = new Map<number, [number, number]>(); // boat -> [team, length]
  const stints: Record<number, number> = {};
  let maxSpread = 0;

  s.races.forEach(([a, b], i) => {
    const raceNo = i + 1;
    if (a === b) gapViolations.push(`race ${raceNo}: team ${a} on both boats`);
    for (const [side, t] of [
      [0, a],
      [1, b],
    ]) {
      const boat = boatOf(raceNo, side);
      const prev = last.get(t);
      if (prev) {
        const [pr, pb] = prev;
        const gap = raceNo - pr;
        if (gap < f || (gap === f && pb !== boat)) {
          gapViolations.push(`race ${raceNo}: team ${t} gap ${gap} (boat ${pb}->${boat})`);
        }
      }
      last.set(t, [raceNo, boat]);
      played[t] += 1;
      const cur = stintCur.get(boat);
      if (cur && cur[0] === t) {
        stintCur.set(boat, [t, cur[1] + 1]);
        if (cur[1] + 1 > maxStint) {
          stintViolations.push(`race ${raceNo}: team ${t} stint ${cur[1] + 1}`);
        }
      } else {
        if (cur) stints[cur[1]] = (stints[cur[1]] ?? 0) + 1;
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
  });
  for (const [, length] of stintCur.values()) stints[length] = (stints[length] ?? 0) + 1;

  const nRaces = s.races.length;
  const fullBreakpoints = breakpoints.filter((b) => b % n === 0);
  const bps = new Set(breakpoints);
  let k = 0;
  while ((k + 1) * n <= nRaces && bps.has((k + 1) * n)) k += 1;
  const breakpointsEveryNUntil = k * n;
  const hardOk =
    duplicatePairs.length === 0 &&
    missingPairs === 0 &&
    gapViolations.length === 0 &&
    stintViolations.length === 0 &&
    maxSpread <= 2;
  const score =
    W_DOUBLE * doubleChangeovers.length -
    W_FULL_BREAKPOINT * fullBreakpoints.length -
    W_HALF_BREAKPOINT * (breakpoints.length - fullBreakpoints.length);

  const list = (xs: unknown[]) => `[${xs.join(", ")}]`;
  const lines = [
    `${n} teams x ${f} flights, ${nRaces} races`,
    `  hard rules ok:        ${hardOk ? "True" : "False"}`,
    `  max spread:           ${maxSpread}`,
    `  breakpoints:          ${list(breakpoints)}`,
    `  every N until race:   ${breakpointsEveryNUntil}`,
    `  double changeovers:   ${doubleChangeovers.length} ${list(doubleChangeovers)}`,
    `  stint lengths:        {${Object.keys(stints)
      .map(Number)
      .sort((x, y) => x - y)
      .map((l) => `${l}: ${stints[l]}`)
      .join(", ")}}`,
    `  score (lower better): ${score}`,
  ];
  if (duplicatePairs.length) lines.push(`  DUPLICATE PAIRS: ${list(duplicatePairs.map((p) => `(${p})`))}`);
  if (missingPairs) lines.push(`  MISSING PAIRS: ${missingPairs}`);
  for (const v of gapViolations.slice(0, 10)) lines.push(`  GAP VIOLATION: ${v}`);
  for (const v of stintViolations.slice(0, 10)) lines.push(`  STINT VIOLATION: ${v}`);

  return {
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
    stintLengths: stints,
    score,
    summary: lines.join("\n"),
  };
}

// --- A randomised greedy round robin -----------------------------------------

/** One greedy pass. With `strict`, stops at the first race no pair can fill. */
function greedy(n: number, f: number, maxStint: number, rand: () => number, strict: boolean): Race[] {
  const total = (n * (n - 1)) / 2;
  const met = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const played = new Array<number>(n).fill(0);
  const last = new Array<[number, number] | null>(n).fill(null); // [raceNo, boat]
  const occ = new Array<[number, number] | null>(2 * f).fill(null); // boat -> [team, stint]
  const races: Race[] = [];

  for (let r = 1; r <= total; r++) {
    const boats = [2 * ((r - 1) % f), 2 * ((r - 1) % f) + 1];
    // How badly putting team t in boat `boat` breaks the hard rules (0 = fine).
    const cost = (t: number, boat: number) => {
      const l = last[t];
      let c = 0;
      if (l) {
        const gap = r - l[0];
        if (gap < f || (gap === f && l[1] !== boat)) c += 1;
      }
      const o = occ[boat];
      if (o && o[0] === t && o[1] + 1 > maxStint) c += 1;
      return c;
    };
    let best: Race | null = null;
    let bestScore = Infinity;
    const lo = Math.min(...played);
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) {
        if (a === b || met[a][b]) continue;
        const broken = cost(a, boats[0]) + cost(b, boats[1]);
        if (strict && broken) continue;
        // Keep the spread within 2 after this race.
        const hi = Math.max(...played.map((p, t) => p + (t === a || t === b ? 1 : 0)));
        const newLo = Math.min(...played.map((p, t) => p + (t === a || t === b ? 1 : 0)));
        const spread = hi - newLo;
        if (strict && spread > 2) continue;
        // Prefer teams that have sailed least, and one team staying in.
        const stays = [a, b].filter((t, side) => occ[boats[side]]?.[0] === t).length;
        const score =
          1000 * broken +
          100 * Math.max(0, spread - 2) +
          4 * (played[a] + played[b] - 2 * lo) +
          (stays === 1 ? 0 : 3) +
          rand() * 2;
        if (score < bestScore) {
          bestScore = score;
          best = [a, b];
        }
      }
    }
    if (!best) return races;
    const [a, b] = best;
    races.push(best);
    met[a][b] = met[b][a] = true;
    [a, b].forEach((t, side) => {
      const boat = boats[side];
      played[t] += 1;
      last[t] = [r, boat];
      const o = occ[boat];
      occ[boat] = o && o[0] === t ? [t, o[1] + 1] : [t, 1];
    });
  }
  return races;
}

let current = 0; // id of the request being worked on; a newer one supersedes it

async function generate(id: number, opts: GenerateOptions) {
  const { nTeams: n, nFlights: f, maxStint = 2, seed = 0, timeLimitMs = 30_000 } = opts;
  if (!Number.isInteger(n) || n < 3) throw new Error("Need at least 3 teams.");
  if (!Number.isInteger(f) || f < 1) throw new Error("Need at least 1 flight.");
  if (2 * f >= n) throw new Error(`${n} teams can't fill ${f} flights.`);

  const total = (n * (n - 1)) / 2;
  const t0 = performance.now();
  // A stand-in: spend a little of the budget so the progress UI has something to show.
  const budget = Math.min(timeLimitMs, 2500);
  const rand = rng(seed);
  let best: Race[] = [];
  let bestScore = Infinity;
  let attempts = 0;

  while (performance.now() - t0 < budget || best.length < total) {
    if (current !== id) return;
    attempts += 1;
    const strict = performance.now() - t0 < budget;
    const races = greedy(n, f, maxStint, rand, strict);
    if (races.length === total) {
      const rep = analyse({ nTeams: n, nFlights: f, races }, maxStint);
      const score = rep.score + (rep.hardOk ? 0 : 1e6);
      if (best.length < total || score < bestScore) {
        best = races;
        bestScore = score;
      }
    } else if (races.length > best.length && best.length < total) {
      best = races;
    }
    const elapsed = performance.now() - t0;
    post({
      type: "progress",
      id,
      message:
        best.length === total
          ? `Improving (attempt ${attempts}, score ${bestScore})`
          : `Searching (${best.length}/${total} races)`,
      fraction: Math.min(0.99, elapsed / budget),
    });
    await sleep(60);
  }

  const schedule: Schedule = { nTeams: n, nFlights: f, races: best };
  post({
    type: "done",
    id,
    schedule,
    report: analyse(schedule, maxStint),
    elapsedMs: performance.now() - t0,
  });
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  current = req.id;
  try {
    if (req.type === "generate") {
      post({ type: "progress", id: req.id, message: "Starting (stand-in scheduler)", fraction: 0 });
      await generate(req.id, req);
    } else if (req.type === "analyse") {
      const t0 = performance.now();
      const report = analyse(req.schedule, req.maxStint ?? 2);
      post({ type: "done", id: req.id, schedule: req.schedule, report, elapsedMs: performance.now() - t0 });
    }
  } catch (err) {
    post({ type: "error", id: req.id, message: err instanceof Error ? err.message : String(err) });
  }
};
