// Leagues and the competition stages they belong to.
//
// A competition runs in stages, stored in competition.stage:
//   quali  - the qualifying round robin (league "quali");
//   groups - the Gold and Silver round robins ("semis/gold", "semis/silver");
//   finals - everything after, in any other league.
// Visitors only see the leagues of stages up to the competition's stage, so
// races can be scheduled before they're released. Admins see every league.
// A competition can skip the Gold/Silver stage (`groups.enabled` in
// src/competitions.ts), going straight from qualifying to finals.
// This is about not showing races early, not security: the database lets
// anyone read every race.
//
// A plain module with no imports, so the server (/schedule.pdf), the client
// and Node scripts can all use it.

export const STAGES = ["quali", "groups", "finals"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_NAMES: Record<Stage, string> = {
  quali: "Qualifying",
  groups: "Gold/Silver",
  finals: "Finals",
};

export const QUALI_LEAGUE = "quali";
export const GOLD_LEAGUE = "semis/gold";
export const SILVER_LEAGUE = "semis/silver";
/** The leagues of the groups stage, which the leaderboard can generate. */
export const GROUP_LEAGUES = [GOLD_LEAGUE, SILVER_LEAGUE];

/** The stage a league belongs to. */
export function leagueStage(league: string): Stage {
  if (league === QUALI_LEAGUE) return "quali";
  if (league.startsWith("semis/")) return "groups";
  return "finals";
}

/** The stages a competition goes through, with or without Gold/Silver. */
export function competitionStages(hasGroups: boolean): Stage[] {
  return STAGES.filter((s) => hasGroups || s !== "groups");
}

/**
 * competition.stage as a Stage. Anything unexpected, including "groups" for a
 * competition without a Gold/Silver stage, counts as qualifying.
 */
export function parseStage(
  stage: string | null | undefined,
  hasGroups: boolean,
): Stage {
  return (competitionStages(hasGroups) as string[]).includes(stage ?? "")
    ? (stage as Stage)
    : "quali";
}

/** Whether `a` comes at or before `b`. */
export function stageAtOrBefore(a: Stage, b: Stage): boolean {
  return STAGES.indexOf(a) <= STAGES.indexOf(b);
}

/** Whether visitors can see a league, given the competition's stage. */
export function isLeagueReleased(league: string, stage: Stage): boolean {
  return stageAtOrBefore(leagueStage(league), stage);
}

/** Whether a league is shown: admins see everything, visitors what's released. */
export function isLeagueVisible(
  league: string,
  stage: Stage,
  isAdmin: boolean,
): boolean {
  return isAdmin || isLeagueReleased(league, stage);
}

const LEAGUE_NAMES: Record<string, string> = {
  [QUALI_LEAGUE]: "Qualifying",
  [GOLD_LEAGUE]: "Gold League",
  [SILVER_LEAGUE]: "Silver League",
};

/** A league's display name; leagues without one show as they're stored. */
export function leagueName(league: string): string {
  return LEAGUE_NAMES[league.toLowerCase()] ?? league;
}
