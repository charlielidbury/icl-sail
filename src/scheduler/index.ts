// Team racing round-robin scheduler: a TypeScript port of team_race_scheduler
// by Henry Hollingworth, https://github.com/Ninjamouse-1000/team_race_scheduler,
// MIT licence. Runs in the browser (see worker.ts) and in Node.
export type * from "./types.ts";
export { analyse, W_DOUBLE, W_FULL_BREAKPOINT, W_HALF_BREAKPOINT } from "./analyse.ts";
export {
  defaultBoatNames,
  defaultTeamNames,
  parseCsvRows,
  readCsv,
  readTeamNames,
  writeCsv,
  type ReadCsvResult,
} from "./csv.ts";
export {
  DEFAULT_TIME_LIMIT_MS,
  generate,
  generateWithStats,
  type GenerateStats,
  type Progress,
} from "./generate.ts";
export {
  mulberry32,
  staggerSearch,
  type StaggerOptions,
  type StaggerResult,
  type StaggerTick,
} from "./heuristic.ts";
export {
  boatOf,
  checkpointRaces,
  copySchedule,
  flightOf,
  isFullCheckpoint,
  totalRaces,
} from "./schedule.ts";
export { handleRequest } from "./worker.ts";
