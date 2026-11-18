// Shared contract between the TypeScript port of team_race_scheduler
// (src/scheduler/) and the /scheduler page that runs it in a Web Worker.
// The scheduler is ported from team_race_scheduler by Henry Hollingworth
// (https://github.com/Ninjamouse-1000/team_race_scheduler, MIT licence).

/**
 * One race: [team in the flight's "a" boat (left), team in its "b" boat (right)].
 * Teams are 0..nTeams-1. Race r (1-indexed) runs on flight (r - 1) % nFlights,
 * and the boat index used by the "same boat" rule is 2 * flight + side.
 */
export type Race = [number, number];

export interface Schedule {
  nTeams: number;
  nFlights: number;
  /** In race order; a full round robin has nTeams * (nTeams - 1) / 2 races. */
  races: Race[];
}

/** Result of checking and scoring a schedule (port of analyse.py). */
export interface Report {
  nTeams: number;
  nFlights: number;
  nRaces: number;
  /** All hard rules hold: full round robin, gap rule, max stint, spread <= 2. */
  hardOk: boolean;
  duplicatePairs: [number, number][];
  missingPairs: number;
  gapViolations: string[];
  stintViolations: string[];
  maxSpread: number;
  maxStint: number;
  /** Race numbers after which every team has sailed the same number of races. */
  breakpoints: number[];
  /** The breakpoints that fall on a multiple of nTeams. */
  fullBreakpoints: number[];
  /** Largest k * nTeams such that nTeams, 2 * nTeams, ..., k * nTeams are all breakpoints. */
  breakpointsEveryNUntil: number;
  /** Race numbers where both boats on the flight change team. */
  doubleChangeovers: number[];
  /** Stint length -> how many stints of that length. */
  stintLengths: Record<number, number>;
  /** Lower is better; same weighting as analyse.py. */
  score: number;
  /** Human-readable multi-line summary, like `trs analyse`. */
  summary: string;
}

export interface GenerateOptions {
  nTeams: number;
  nFlights: number;
  /** Max consecutive races a team stays in one boat (default 2). */
  maxStint?: number;
  /** Same seed and options give the same schedule (default 0). */
  seed?: number;
  /** Overall search budget in milliseconds. */
  timeLimitMs?: number;
}

/** Messages the page sends to the worker. */
export type WorkerRequest =
  | ({ type: "generate"; id: number } & GenerateOptions)
  | { type: "analyse"; id: number; schedule: Schedule; maxStint?: number };

/** Messages the worker sends back. Every request ends with "done" or "error". */
export type WorkerResponse =
  | {
      type: "progress";
      id: number;
      /** Short status line for the UI, e.g. "Searching (82/91 races)". */
      message: string;
      /** 0..1 if known. */
      fraction?: number;
    }
  | {
      type: "done";
      id: number;
      schedule: Schedule;
      report: Report;
      elapsedMs: number;
    }
  | { type: "error"; id: number; message: string };
