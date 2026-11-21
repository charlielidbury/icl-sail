// The Gold and Silver round robins (the "groups" stage, see src/leagues.ts),
// made from the qualifying standings: the top half races in Gold and the
// bottom half in Silver, each in its own round robin on its own flight.
//
// Each group's round robin comes from the scheduler (src/scheduler, one
// flight). The two are interleaved, numbered on from the last qualifying race:
// Gold and Silver take turns, each on its own flight, and when the shorter
// one runs out the longer one carries on alone. The first race goes on the
// flight that didn't sail the last qualifying race, so the flights keep
// alternating.
//
// Plain TypeScript with only relative imports, so Node can run it (and its
// tests, src/groups.test.ts).
import type { GroupsConfig } from "./competitions.ts";
import { generate } from "./scheduler/generate.ts";
import { GOLD_LEAGUE, GROUP_LEAGUES, QUALI_LEAGUE, SILVER_LEAGUE } from "./leagues.ts";

/** A race as planGroups needs it. Teams and flights are ids. */
export type PlanRace = {
  number: number;
  league: string;
  flight: string;
  lteam: string | null;
  rteam: string | null;
  finished: boolean;
};

/** A team's qualifying record, best first (leaderboardAtom's "quali" order). */
export type Standing = {
  id: string;
  name: string;
  wins: number;
  losses: number;
  totalPoints: number;
};

export type GroupTeam = Standing & {
  /** Qualifying position, from 1. */
  rank: number;
};

/** A race to insert. */
export type NewRace = {
  number: number;
  league: string;
  flight: string;
  lteam: string;
  rteam: string;
};

export type Group = {
  league: string;
  /** Flight id. */
  flight: string;
  /** In qualifying order. */
  teams: GroupTeam[];
  /** This group's races, in order. */
  races: NewRace[];
};

export type GroupsPlan = {
  gold: Group;
  silver: Group;
  /** Every new race, in race order. */
  races: NewRace[];
  /** Things to check before going ahead. */
  warnings: string[];
};

/**
 * Plan the Gold and Silver round robins. `races` are all the competition's
 * races; `standings` the qualifying standings. Throws an Error explaining why
 * if it can't be done (too few teams or flights).
 */
export function planGroups(input: {
  standings: Standing[];
  races: PlanRace[];
  config: GroupsConfig;
  /** Passed to the scheduler; the same inputs always give the same plan. */
  seed?: number;
}): GroupsPlan {
  const { standings, config } = input;
  if (!config.enabled) {
    throw new Error("This competition has no Gold/Silver stage (see src/competitions.ts).");
  }
  const races = [...input.races].sort((a, b) => a.number - b.number);
  const quali = races.filter((r) => r.league === QUALI_LEAGUE);
  const warnings: string[] = [];

  // Teams in qualifying order. A team without a finished race isn't in the
  // standings, so it has no place to split by.
  const teams: GroupTeam[] = standings.map((s, i) => ({ ...s, rank: i + 1 }));
  const unranked = new Set<string>();
  for (const r of quali) {
    for (const id of [r.lteam, r.rteam]) {
      if (id !== null && !teams.some((t) => t.id === id)) unranked.add(id);
    }
  }
  if (unranked.size > 0) {
    throw new Error(
      `${unranked.size} qualifying ${unranked.size === 1 ? "team has" : "teams have"} ` +
        "no results yet, so there's no ranking for them. Enter the qualifying results first.",
    );
  }
  if (teams.length < 6) {
    throw new Error(
      `Gold and Silver need at least 3 teams each, so at least 6 teams; the qualifying standings have ${teams.length}.`,
    );
  }

  // Split: the larger half goes to config.largerGroup.
  const half = config.largerGroup === "gold" ? Math.ceil(teams.length / 2) : Math.floor(teams.length / 2);
  const goldTeams = teams.slice(0, half);
  const silverTeams = teams.slice(half);

  // Flights, in the order qualifying first used them.
  const flights: string[] = [];
  for (const r of quali) {
    if (!flights.includes(r.flight)) flights.push(r.flight);
  }
  if (flights.length < 2) {
    throw new Error(
      "Gold and Silver race on the two qualifying flights, but qualifying used " +
        (flights.length === 0 ? "no flights." : "only one."),
    );
  }
  if (flights.length > 2) {
    warnings.push(
      `Qualifying used ${flights.length} flights; Gold and Silver only use the first two.`,
    );
  }
  const goldFlight = flights[config.goldFlight];
  const silverFlight = flights[1 - config.goldFlight];

  // Warn about things that make the split questionable.
  const unfinished = quali.filter((r) => !r.finished).length;
  if (unfinished > 0) {
    warnings.push(
      `${unfinished} qualifying ${unfinished === 1 ? "race hasn't" : "races haven't"} finished, ` +
        "so the standings (and the split) could still change.",
    );
  }
  const tied = boundaryTie(teams, half);
  if (tied.length > 0) {
    warnings.push(
      `${listNames(tied.map((t) => `${t.name} (${ordinal(t.rank)})`))} have identical records ` +
        `(${tied[0].wins} wins, ${tied[0].losses} losses, ${tied[0].totalPoints} points) ` +
        "across the Gold/Silver line, so the later tie-breaks (head-to-head first) decided who's in Gold. " +
        "Check the order before going ahead.",
    );
  }
  const existing = races.filter((r) => GROUP_LEAGUES.includes(r.league));
  if (existing.length > 0) {
    warnings.push(
      `The ${existing.length} existing Gold/Silver ${existing.length === 1 ? "race" : "races"} will be deleted and replaced.`,
    );
  }

  // Each group's round robin, on one flight.
  const robin = (league: string, flight: string, group: GroupTeam[]): Group => {
    const schedule = generate({ nTeams: group.length, nFlights: 1, seed: input.seed ?? 0 });
    return {
      league,
      flight,
      teams: group,
      races: schedule.races.map(([a, b]) => ({
        number: 0, // numbered below
        league,
        flight,
        lteam: group[a].id,
        rteam: group[b].id,
      })),
    };
  };
  const gold = robin(GOLD_LEAGUE, goldFlight, goldTeams);
  const silver = robin(SILVER_LEAGUE, silverFlight, silverTeams);

  // Interleave, starting with the group on the flight that didn't sail the
  // last qualifying race.
  const last = quali[quali.length - 1];
  const [first, second] = last.flight === goldFlight ? [silver, gold] : [gold, silver];
  const ordered: NewRace[] = [];
  for (let i = 0; i < Math.max(first.races.length, second.races.length); i++) {
    if (i < first.races.length) ordered.push(first.races[i]);
    if (i < second.races.length) ordered.push(second.races[i]);
  }
  const start = Math.max(...quali.map((r) => r.number)) + 1;
  ordered.forEach((r, i) => (r.number = start + i));

  // Race numbers are unique in a competition (the database enforces it).
  const end = start + ordered.length - 1;
  const clash = races.find(
    (r) => !GROUP_LEAGUES.includes(r.league) && r.number >= start && r.number <= end,
  );
  if (clash) {
    throw new Error(
      `The Gold/Silver races would be ${start}-${end}, but race ${clash.number} (${clash.league}) ` +
        "already has one of those numbers. Renumber or delete the later races first.",
    );
  }

  return { gold, silver, races: ordered, warnings };
}

/**
 * The teams either side of the Gold/Silver line (between positions `half`
 * and `half + 1`) whose wins, losses and points are identical, if any.
 */
function boundaryTie(teams: GroupTeam[], half: number): GroupTeam[] {
  const same = (a: Standing, b: Standing) =>
    a.wins === b.wins && a.losses === b.losses && a.totalPoints === b.totalPoints;
  const above = teams[half - 1];
  const below = teams[half];
  if (!above || !below || !same(above, below)) return [];
  return teams.filter((t) => same(t, above));
}

/** Gold/Silver races that already have a result, which mustn't be replaced. */
export function racedGroupRaces(races: PlanRace[]): PlanRace[] {
  return races.filter((r) => GROUP_LEAGUES.includes(r.league) && r.finished);
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function listNames(names: string[]): string {
  return names.length <= 1
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
