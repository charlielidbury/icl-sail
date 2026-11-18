// Constructive "stagger" search.
//
// Ported from team_race_scheduler (heuristic.py) by Henry Hollingworth,
// https://github.com/Ninjamouse-1000/team_race_scheduler, MIT licence.
//
// The ideal team-racing pattern is a stagger: on every flight, each race keeps
// one team from that flight's previous race (its second race in the boat) and
// brings in exactly one new team. Viewed per flight, the sequence of entering
// teams is a trail through the complete graph of teams, and race j on the
// flight pairs entrant j with entrant j+1.
//
// Here we search over that structure directly: at each race the stayer is
// forced, so the only decision is *which team gets in*. That gives at most N
// branches per race (instead of N^2 for choosing a pair), and we prune with:
//
// * the gap rule (a new team must not have raced in the last F races),
// * spread <= 2,
// * reachability of the next "level" checkpoint at a multiple of N races.
//
// The search never introduces double changeovers (other than the first race on
// each flight) unless allowDoubles is set; it returns the deepest prefix it
// can build.
//
// Differences from the Python: the tie-break order comes from a mulberry32
// PRNG instead of Python's random.Random, so a seed gives a different (but
// equally repeatable) schedule; and maxStint = 1 switches off staying in,
// which the Python search does not support (it left that case to CP-SAT).
import type { Race } from "./types.ts";

const NEG = -(10 ** 9);

/** Small, fast, seedable PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface StaggerResult {
  /** The complete schedule, or the deepest prefix found. */
  races: Race[];
  complete: boolean;
  nodes: number;
}

export interface StaggerTick {
  nodes: number;
  /** Length of the deepest prefix found so far. */
  best: number;
  elapsedMs: number;
}

export interface StaggerOptions {
  /**
   * Enforce all teams level at every multiple of N races up to and including
   * this race number (default: the whole schedule).
   */
  checkpointUntil?: number;
  nodeLimit?: number;
  timeLimitMs?: number;
  seed?: number;
  /** Races to fix at the start of the schedule. */
  prefix?: Race[];
  /** Also try races where both boats change team. */
  allowDoubles?: boolean;
  /**
   * 1 forbids staying in a boat (every race is then a double changeover);
   * anything >= 2 behaves like the Python, which builds stints of at most 2.
   */
  maxStint?: number;
  /** Called every 1024 search nodes. */
  onTick?: (tick: StaggerTick) => void;
}

class Abort extends Error {}

/** Rows = slots, cols = teams (square, small). Simple augmenting paths. */
function hasPerfectMatching(allowed: boolean[][]): boolean {
  const n = allowed.length;
  const matchCol = new Array<number>(n).fill(-1);
  const tryRow = (r: number, seen: boolean[]): boolean => {
    for (let c = 0; c < n; c++) {
      if (allowed[r][c] && !seen[c]) {
        seen[c] = true;
        if (matchCol[c] === -1 || tryRow(matchCol[c], seen)) {
          matchCol[c] = r;
          return true;
        }
      }
    }
    return false;
  };
  for (let r = 0; r < n; r++) if (!tryRow(r, new Array<boolean>(n).fill(false))) return false;
  return true;
}

/** Depth-first search for a double-changeover-free prefix (see file header). */
export function staggerSearch(
  nTeams: number,
  nFlights: number,
  {
    checkpointUntil,
    nodeLimit = 200_000,
    timeLimitMs = 10_000,
    seed = 0,
    prefix,
    allowDoubles = false,
    maxStint = 2,
    onTick,
  }: StaggerOptions = {},
): StaggerResult {
  const N = nTeams;
  const F = nFlights;
  const R = (N * (N - 1)) / 2;
  const cpUntil = checkpointUntil ?? R;
  const canStay = maxStint >= 2;
  const rng = mulberry32(seed);
  const tiebreak = Array.from({ length: N }, () => rng());

  const cnt = new Array<number>(N).fill(0);
  const last = new Array<number>(N).fill(NEG); // last race number raced
  const stint = new Array<number>(N).fill(0); // stint length at last race
  const used = Array.from({ length: N }, () => new Array<boolean>(N).fill(false));
  const races: Race[] = [];
  let best: Race[] = [];
  let nodes = 0;
  const start = performance.now();
  const deadline = start + timeLimitMs;

  // max(cnt) - min(cnt), with a loop: spreading cnt into Math.max is slow.
  const spread = (): number => {
    let lo = cnt[0];
    let hi = cnt[0];
    for (let t = 1; t < N; t++) {
      if (cnt[t] < lo) lo = cnt[t];
      else if (cnt[t] > hi) hi = cnt[t];
    }
    return hi - lo;
  };

  // Whether team t is in a stint of 1 that it may extend by staying in.
  const mayStay = (t: number) => canStay && stint[t] === 1;

  /** Upper bound on extra races team t can complete by race cp. */
  const maxReachable = (t: number, done: number, cp: number): number => {
    let extra = 0;
    const lt = last[t];
    let e: number;
    if (mayStay(t) && lt + F > done) {
      // may stay in at lt+F
      if (lt + F <= cp) extra += 1;
      e = lt + 2 * F + 1;
    } else {
      e = Math.max(done + 1, lt + F + 1);
    }
    if (!canStay) {
      // every race needs a change of boat, so a gap of F+1
      for (; e <= cp; e += F + 1) extra += 1;
      return extra;
    }
    while (e <= cp) {
      extra += 1;
      if (e + F <= cp) extra += 1;
      e += 2 * F + 1;
    }
    return extra;
  };

  /**
   * Odd-need teams must be the entrants of the last F races before cp. Check
   * they can be matched to those races against the (known) stayers.
   */
  const finalSlotsMatchable = (done: number, cp: number, odd: number[]): boolean => {
    const slots: number[] = [];
    for (let x = Math.max(done + 1, cp - F + 1); x <= cp; x++) slots.push(x);
    if (odd.length !== slots.length) return odd.length <= slots.length;
    const allowed: boolean[][] = [];
    for (const x of slots) {
      let stayer: number | null = null;
      if (x - F <= done) {
        // Python indexing: a negative index counts from the end.
        const [a, b] = races.at(x - F - 1)!;
        stayer = stint[a] === 1 && last[a] === x - F ? a : b;
      }
      allowed.push(
        odd.map((t) => {
          const pendingStay = stint[t] === 1 && last[t] + F > done;
          const freeFrom = last[t] + (pendingStay ? 2 * F + 1 : F + 1);
          return x >= freeFrom && (stayer === null || (t !== stayer && !used[t][stayer]));
        }),
      );
    }
    return hasPerfectMatching(allowed);
  };

  const checkpointOk = (done: number): boolean => {
    // level exactly at checkpoint
    if (done % N === 0 && done <= cpUntil) {
      if (spread() !== 0) return false;
    }
    const nxt = (Math.floor(done / N) + 1) * N;
    if (nxt > Math.min(R, cpUntil)) return true;
    const target = Math.floor((2 * nxt) / N);
    // Under a strict stagger every race from done+1..nxt has exactly one
    // entrant; entrants in the last F races only get one race in before the
    // checkpoint, earlier entrants get two. Stayers are forced.
    const slots1 = Math.min(F, nxt - done);
    const odd: number[] = [];
    for (let t = 0; t < N; t++) {
      let need = target - cnt[t];
      if (need < 0) return false;
      if (need > maxReachable(t, done, nxt)) return false;
      if (mayStay(t) && done < last[t] + F && last[t] + F <= nxt) {
        need -= 1; // forced stay
        if (need < 0) return false;
      }
      if (need & 1) odd.push(t);
    }
    // Without staying in, the parity argument below does not apply.
    if (!canStay) return true;
    if (allowDoubles) {
      // a double changeover race has two entrants, so the strict stagger
      // arithmetic only gives a weaker bound
      return odd.length <= 2 * slots1;
    }
    if (odd.length > slots1) return false;
    if (nxt - done <= 2 * F && odd.length) return finalSlotsMatchable(done, nxt, odd);
    return true;
  };

  const spreadOk = () => spread() <= 2;

  type Saved = [number, number, number, number, number, number];
  const place = (a: number, b: number, raceNo: number): Saved => {
    const saved: Saved = [cnt[a], last[a], stint[a], cnt[b], last[b], stint[b]];
    for (const t of [a, b]) {
      stint[t] = last[t] === raceNo - F ? stint[t] + 1 : 1;
      cnt[t] += 1;
      last[t] = raceNo;
    }
    used[a][b] = used[b][a] = true;
    races.push([a, b]);
    return saved;
  };

  const unplace = (a: number, b: number, saved: Saved) => {
    races.pop();
    used[a][b] = used[b][a] = false;
    [cnt[a], last[a], stint[a], cnt[b], last[b], stint[b]] = saved;
  };

  const order = (cands: number[], done: number): number[] => {
    const nxt = (Math.floor(done / N) + 1) * N;
    const target = nxt <= cpUntil ? Math.floor((2 * nxt) / N) : null;
    // Python sorts by the key (-need, cnt[t], tiebreak[t]), where need is
    // target - cnt[t] (or 0 without a target).
    if (target === null) return cands.sort((x, y) => cnt[x] - cnt[y] || tiebreak[x] - tiebreak[y]);
    return cands.sort(
      (x, y) => target - cnt[y] - (target - cnt[x]) || cnt[x] - cnt[y] || tiebreak[x] - tiebreak[y],
    );
  };

  const dfs = (raceNo: number): boolean => {
    if (races.length > best.length) best = races.slice();
    if (raceNo > R) return true;
    nodes += 1;
    if (nodes > nodeLimit) throw new Abort();
    if ((nodes & 1023) === 0) {
      const now = performance.now();
      if (now > deadline) throw new Abort();
      onTick?.({ nodes, best: best.length, elapsedMs: now - start });
    }

    const eligible: number[] = [];
    for (let t = 0; t < N; t++) if (last[t] <= raceNo - F - 1 && cnt[t] < N - 1) eligible.push(t);
    const el = order(eligible, raceNo - 1);

    let opts: Race[] = [];
    if (raceNo <= F) {
      // first race on this flight: two new teams
      for (const a of el) for (const b of el) if (a < b && !used[a][b]) opts.push([a, b]);
      opts = opts.slice(0, 3 * N);
    } else {
      const [pa, pb] = races[raceNo - F - 1];
      for (const [side, h] of [
        [0, pa],
        [1, pb],
      ] as const) {
        if (!(mayStay(h) && last[h] === raceNo - F)) continue;
        if (cnt[h] >= N - 1) continue;
        for (const n of el) if (n !== h && !used[h][n]) opts.push(side === 0 ? [h, n] : [n, h]);
      }
      if (allowDoubles) {
        const dbl: Race[] = [];
        for (let i = 0; i < el.length && dbl.length < 2 * N; i++) {
          for (let j = i + 1; j < el.length && dbl.length < 2 * N; j++) {
            if (!used[el[i]][el[j]]) dbl.push([el[i], el[j]]);
          }
        }
        opts.push(...dbl);
      }
    }

    for (const [a, b] of opts) {
      const saved = place(a, b, raceNo);
      if (spreadOk() && checkpointOk(raceNo) && dfs(raceNo + 1)) return true;
      unplace(a, b, saved);
    }
    return false;
  };

  (prefix ?? []).forEach(([a, b], i) => place(a, b, i + 1));
  best = races.slice();
  let complete: boolean;
  try {
    complete = dfs(races.length + 1);
  } catch (e) {
    if (!(e instanceof Abort)) throw e;
    complete = false;
  }
  return { races: complete ? races.slice() : best, complete, nodes };
}
