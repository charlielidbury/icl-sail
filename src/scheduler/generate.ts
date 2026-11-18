// Generator: stagger search -> greedy completion.
//
// Ported from team_race_scheduler (generate.py) by Henry Hollingworth,
// https://github.com/Ninjamouse-1000/team_race_scheduler, MIT licence.
//
// This is generate.py up to and including its step 2a. The Python then
// re-solves the tail with CP-SAT (step 2b) and polishes windows with CP-SAT
// (step 3); OR-Tools has no browser build, so those steps are not ported and
// the best greedy completion is returned instead.
//
// Time budget: the Python gives step 1 max(1 s, 15%) of time_limit, split over
// 4 restarts, and each step 2a attempt max(1 s, 3%), leaving the rest for
// CP-SAT. timeLimitMs maps onto the phases the same way, except that no
// search may run past timeLimitMs overall (the 1 s minimums could, below
// about 7 s), so generate() never takes noticeably longer than timeLimitMs.
// Both phases also have node limits (60,000 and 40,000 per search), and in
// JavaScript those are normally reached long before the time limits, so the
// result depends only on the options, not on the speed of the machine.
// Python's default of 120 s is kept: it costs nothing when the node limits
// bind first, and on a slow device it keeps the search (and so the schedule)
// the same for longer. Without a deadline cut, the worst case wall time is
// about 15% + 6 x 3% = 33% of timeLimitMs.
import type { GenerateOptions, Race, Schedule } from "./types.ts";
import { analyse } from "./analyse.ts";
import { staggerSearch } from "./heuristic.ts";
import { totalRaces } from "./schedule.ts";

export const DEFAULT_TIME_LIMIT_MS = 120_000;

/** Races; up to this size the Python solved the whole schedule with CP-SAT. */
const SMALL_FULL_SOLVE = 45;
const RESTARTS = 4;
const STAGGER_NODE_LIMIT = 60_000;
const GREEDY_NODE_LIMIT = 40_000;
/** Share of the progress bar given to step 1. */
const STAGGER_SHARE = 0.7;
const PROGRESS_INTERVAL_MS = 100;

export interface Progress {
  /** Short status line, e.g. "Searching (84/91 races)". */
  message: string;
  /** 0..1, estimated from the node and time budgets of each phase. */
  fraction?: number;
}

export interface GenerateStats {
  /** Races in the longest stagger prefix (no double changeovers). */
  prefixLength: number;
  /** Which step produced the schedule. */
  source: "stagger" | "greedy";
  /** Greedy only: races kept from the stagger prefix. */
  cut?: number;
  /** Greedy only: whether breakpoints at multiples of N were a hard rule. */
  breakpointsHard?: boolean;
  /** Search nodes over all phases. */
  nodes: number;
}

function checkOptions(o: GenerateOptions): Required<GenerateOptions> {
  const { nTeams, nFlights } = o;
  const maxStint = o.maxStint ?? 2;
  const seed = o.seed ?? 0;
  const timeLimitMs = o.timeLimitMs ?? DEFAULT_TIME_LIMIT_MS;
  if (!Number.isInteger(nTeams) || nTeams < 3) throw new Error("need at least 3 teams");
  if (!Number.isInteger(nFlights) || nFlights < 1) throw new Error("need at least 1 flight");
  if (!Number.isInteger(maxStint) || maxStint < 1) throw new Error("maxStint must be at least 1");
  if (!Number.isInteger(seed)) throw new Error("seed must be an integer");
  if (!(timeLimitMs > 0)) throw new Error("timeLimitMs must be positive");
  // No team can race twice within w races in a row (w = nFlights, or
  // nFlights + 1 if nobody may stay in), so those races need 2w different
  // teams; with exactly 2w teams the race after them could only be a rematch.
  const need = nFlights === 1 ? "1 flight needs" : `${nFlights} flights need`;
  const w = maxStint >= 2 ? nFlights : nFlights + 1;
  if (nTeams < 2 * w + 1) {
    throw new Error(
      maxStint >= 2
        ? `${need} at least ${2 * w + 1} teams: ${w} races in a row (one on each flight) ` +
            `need ${2 * w} different teams, and one more is needed to avoid rematches`
        : `With a max stint of 1, ${need} at least ${2 * w + 1} teams: nobody can stay in, ` +
            `so ${w} races in a row need ${2 * w} different teams, and one more is needed ` +
            `to avoid rematches`,
    );
  }
  // With exactly 2F + 1 teams and stints of at most 2 (all the search builds),
  // every race must keep one team in and bring in the one team that sat out
  // the previous F races. That fixes a rotation in which each team only ever
  // meets the same two opponents, so no round robin exists for F >= 2.
  if (maxStint >= 2 && nFlights >= 2 && nTeams === 2 * nFlights + 1) {
    throw new Error(
      `${nTeams} teams on ${nFlights} flights can't make a round robin: with exactly ` +
        `${nTeams} teams, every race must keep one team in and bring in the team that sat ` +
        `out, so teams keep meeting the same opponents. Use at least ${nTeams + 1} teams ` +
        `or fewer flights.`,
    );
  }
  return { nTeams, nFlights, maxStint, seed, timeLimitMs };
}

/** generate() plus some statistics about how the schedule was found. */
export function generateWithStats(
  options: GenerateOptions,
  onProgress?: (progress: Progress) => void,
): { schedule: Schedule; stats: GenerateStats } {
  const { nTeams: N, nFlights: F, maxStint, seed, timeLimitMs } = checkOptions(options);
  const R = totalRaces(N);
  const score = (races: Race[]) => analyse({ nTeams: N, nFlights: F, races }, maxStint).score;
  const done = (races: Race[], stats: GenerateStats) => ({
    schedule: { nTeams: N, nFlights: F, races },
    stats,
  });

  const deadline = performance.now() + timeLimitMs;
  let outOfTime = false;
  // A search's budget, cut so that it ends by the overall deadline.
  const budget = (ms: number) => {
    const left = deadline - performance.now();
    if (left <= 0) outOfTime = true;
    return Math.min(ms, left);
  };

  // At most one message per PROGRESS_INTERVAL_MS (the first is always sent).
  let lastEmit = -Infinity;
  const emit = (message: string, fraction: number) => {
    if (!onProgress) return;
    const now = performance.now();
    if (now - lastEmit < PROGRESS_INTERVAL_MS) return;
    lastEmit = now;
    onProgress({ message, fraction: Math.min(1, Math.max(0, fraction)) });
  };
  // Fraction of one search's budget used, from its node and time limits.
  const used = (nodes: number, nodeLimit: number, elapsedMs: number, budgetMs: number) =>
    Math.min(1, Math.max(nodes / nodeLimit, elapsedMs / budgetMs));

  let nodes = 0;

  // 1. Stagger search: a few restarts, keep the deepest prefix. With
  //    maxStint 1 nobody can stay in, so there is no stagger to search for.
  let bestPrefix: Race[] = [];
  if (maxStint >= 2) {
    const perRestartMs = Math.max(1000, 0.15 * timeLimitMs) / RESTARTS;
    for (let k = 0; k < RESTARTS; k++) {
      const ms = budget(perRestartMs);
      if (outOfTime) break;
      const base = (STAGGER_SHARE * k) / RESTARTS;
      const message = (best: number) => `Searching (${best}/${R} races)`;
      emit(message(bestPrefix.length), base);
      const res = staggerSearch(N, F, {
        nodeLimit: STAGGER_NODE_LIMIT,
        timeLimitMs: ms,
        seed: seed + k,
        onTick: (t) =>
          emit(
            message(Math.max(bestPrefix.length, t.best)),
            base + (STAGGER_SHARE / RESTARTS) * used(t.nodes, STAGGER_NODE_LIMIT, t.elapsedMs, ms),
          ),
      });
      nodes += res.nodes;
      if (res.races.length > bestPrefix.length) bestPrefix = res.races;
      if (res.complete) break;
    }
    if (bestPrefix.length === R) {
      return done(bestPrefix, { prefixLength: R, source: "stagger", nodes });
    }
  }

  // 2a. Greedy completion (allows double changeovers). Try keeping the
  //     breakpoint rule hard first, then without it, each time cutting the
  //     prefix back further until a search completes. Keep the best by score.
  const back = 2 * F + 4;
  const cut = R <= SMALL_FULL_SOLVE ? 0 : Math.max(0, bestPrefix.length - back);
  // The Python retries repeated cut points; the search is deterministic, so
  // a repeat would only find the same thing again.
  const cuts = [...new Set([cut, Math.max(0, cut - N), 0])];
  const attemptMs = Math.max(1000, 0.03 * timeLimitMs);
  const attempts = 2 * cuts.length;
  let hint: Race[] | null = null;
  let hintStats: GenerateStats | null = null;
  for (const keepCp of [true, false]) {
    for (const [i, c] of cuts.entries()) {
      const ms = budget(attemptMs);
      if (outOfTime) break;
      const attempt = (keepCp ? 0 : cuts.length) + i;
      const base = STAGGER_SHARE + ((1 - STAGGER_SHARE) * attempt) / attempts;
      const message = (best: number) => `Completing (${best}/${R} races)`;
      emit(message(c), base);
      const g = staggerSearch(N, F, {
        prefix: bestPrefix.slice(0, c),
        allowDoubles: true,
        checkpointUntil: keepCp ? undefined : c,
        nodeLimit: GREEDY_NODE_LIMIT,
        timeLimitMs: ms,
        seed,
        maxStint,
        onTick: (t) =>
          emit(
            message(t.best),
            base + ((1 - STAGGER_SHARE) / attempts) * used(t.nodes, GREEDY_NODE_LIMIT, t.elapsedMs, ms),
          ),
      });
      nodes += g.nodes;
      if (g.complete) {
        if (hint === null || score(g.races) < score(hint)) {
          hint = g.races;
          hintStats = {
            prefixLength: bestPrefix.length,
            source: "greedy",
            cut: c,
            breakpointsHard: keepCp,
            nodes: 0,
          };
        }
        break;
      }
    }
  }
  if (hint === null || hintStats === null) {
    const what = `No complete schedule found for ${N} teams on ${F} flight${F === 1 ? "" : "s"}`;
    throw new Error(
      outOfTime || performance.now() >= deadline
        ? `${what} within the time limit; try a longer time limit`
        : `${what}; try more teams, fewer flights or another seed`,
    );
  }
  return done(hint, { ...hintStats, nodes });
}

/**
 * Generate a full round robin for nTeams teams on nFlights flights, obeying
 * every hard rule, with as few double changeovers and as many breakpoints as
 * the search finds. The same options always give the same schedule (unless a
 * time limit, rather than a node limit, ends a search). Throws if no complete
 * schedule is found.
 */
export function generate(
  options: GenerateOptions,
  onProgress?: (progress: Progress) => void,
): Schedule {
  return generateWithStats(options, onProgress).schedule;
}
