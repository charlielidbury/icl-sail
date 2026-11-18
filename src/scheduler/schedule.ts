// Core schedule helpers.
//
// Ported from team_race_scheduler (schedule.py) by Henry Hollingworth,
// https://github.com/Ninjamouse-1000/team_race_scheduler, MIT licence.
//
// A schedule for nTeams teams on nFlights flights is a list of races. Race r
// (1-indexed) runs on flight (r - 1) % nFlights. Each flight has two boats
// (sides 0 and 1), so a race is a pair [teamOnSide0, teamOnSide1]. Teams are
// integers 0..nTeams-1; names are applied only on input/output.
//
// The boat index (used for the "same boat" rule) is 2 * flight + side.
import type { Schedule } from "./types.ts";

/** Races in a full round robin: every team meets every other team once. */
export function totalRaces(nTeams: number): number {
  return (nTeams * (nTeams - 1)) / 2;
}

/** Flight (0-indexed) of a 1-indexed race number. */
export function flightOf(nFlights: number, raceNo: number): number {
  return (raceNo - 1) % nFlights;
}

/** Boat index (2 * flight + side) of a 1-indexed race number and side. */
export function boatOf(nFlights: number, raceNo: number, side: 0 | 1): number {
  return 2 * flightOf(nFlights, raceNo) + side;
}

export function copySchedule(s: Schedule): Schedule {
  return {
    nTeams: s.nTeams,
    nFlights: s.nFlights,
    races: s.races.map(([a, b]) => [a, b]),
  };
}

/** Race numbers after which every team *could* be level (2 * c / N integral). */
export function checkpointRaces(nTeams: number, totalRaces: number): number[] {
  const out: number[] = [];
  for (let c = 1; c <= totalRaces; c++) if ((2 * c) % nTeams === 0) out.push(c);
  return out;
}

export function isFullCheckpoint(raceNo: number, nTeams: number): boolean {
  return raceNo % nTeams === 0;
}
