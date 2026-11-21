"use client";

import dayjs, { Dayjs } from "dayjs";
import { useEffect } from "react";
import supabase from "./supabase";
import { Session } from "@supabase/supabase-js";
import { QueryClient, QueryKey, useQueryClient } from "@tanstack/react-query";
import { atom, useAtomValue } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";
import {
  allCompetitions,
  type CompetitionBasic,
  type CompetitionId,
} from "./competitions";
import {
  isLeagueReleased,
  isLeagueVisible,
  leagueName,
  parseStage,
  type Stage,
} from "./leagues";

export interface Flight {
  id: string;
  name: string;
  lname: string;
  lnumbers: number[];
  rnumbers: number[];
  rname: string;
}

export interface Team {
  id: string;
  name: string;
}

export type RaceResult = {
  id: string;
  number: number;
  video: string | null;
  estfinishtime: Dayjs | null;
  league: string;
  /**
   * Whether visitors can see this race: its league's stage has started (see
   * src/leagues.ts). Only admins are shown races that aren't released.
   */
  released: boolean;
  flight: Flight;
  lteam: Team | null;
  rteam: Team | null;
} & ( // Captures the fact that if the finishtime is set, then the result is set.
  | {
      finishtime: null;
      lresult: null;
      rresult: null;
    }
  | {
      finishtime: Dayjs;
      lresult: number[];
      rresult: number[];
    }
);

export type LeaderboardTeam = {
  total_pts: number;
  avg_pts: number;
  win_rate: number;
  losses: number;
  order: number;
  wins: number;
  league: string;
  beat: LeaderboardTeam[];
  team: {
    id: string;
    name: string;
  };
};

export type Competition = {
  announcement: string | null;
  estimates: boolean;
  go_to_stand: number;
  host: string;
  name: string;
  racing_paused: boolean;
  id: string;
  feedback: boolean;
  finals_markdown: string | null;
  /** Which leagues visitors can see (see src/leagues.ts). */
  stage: Stage;
};

/** "Qualifying", "Gold League" etc. (see leagueName in src/leagues.ts). */
export function getLeagueName(league: string): string {
  return leagueName(league);
}

/**
 * The logged-in session, or null. Shared by every component, and kept up to
 * date from the moment anything reads it.
 */
const sessionAtom = atom<Session | null>(null);
sessionAtom.onMount = (setSession) => {
  supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  return () => subscription.unsubscribe();
};

const adminQueryAtom = atomWithQuery((get) => {
  const competition = get(competitionBasicAtom);
  const userId = get(sessionAtom)?.user.id ?? null;
  return {
    queryKey: ["admin", competition?.id ?? null, userId],
    enabled: competition !== null && userId !== null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin")
        .select("user")
        .eq("user", userId!)
        .eq("competition", competition!.id)
        .maybeSingle();
      if (error) throw error;
      return data !== null;
    },
  };
});

/** Whether the logged-in user is an admin of this competition. */
export const isAdminAtom = atom(
  (get) => get(sessionAtom) !== null && get(adminQueryAtom).data === true,
);

export function useAuth(): { session: Session | null; isAdmin: boolean } {
  return {
    session: useAtomValue(sessionAtom),
    isAdmin: useAtomValue(isAdminAtom),
  };
}

type RaceRow = Awaited<ReturnType<typeof fetchRaces>>[number];

const fetchRaces = async (competitionId: string) => {
  const { data, error } = await supabase
    .from("race")
    .select(
      `
        id,
        competition,
        number,
        video,
        finishtime,
        league,
        flight (
          id,
          name,
          lname,
          lnumbers,
          rnumbers,
          rname
        ),
        lteam:team!lteam ( id, name ),
        lresult,
        rresult,
        rteam:team!rteam ( id, name )
      `,
    )
    .order("number", { ascending: true })
    .eq("competition", competitionId);
  if (error) throw error;
  return data;
};

const racesDataAtom = atomWithQuery((get) => {
  const competition = get(competitionBasicAtom)!;
  return {
  queryKey: ["races_data", competition.id],
  enabled: get(competitionBasicAtom) !== null,
  queryFn: () => fetchRaces(competition.id),
};
});

// The parts of the queries racesAtom uses. Each keeps its value (by
// reference) while a refetch finds nothing new, so racesAtom only recomputes
// when the races, the competition or your admin status actually change.
const racesRowsAtom = atom((get) => get(racesDataAtom).data);
const competitionDataAtom = atom((get) => get(competitionAtom).data);
const racesErrorAtom = atom(
  (get) => get(racesDataAtom).error ?? get(competitionAtom).error ?? null,
);

export type Races = {
  /** The races you can see, in race order. */
  races: RaceResult[];
  currentRace: number | null;
  numFlights: number;
};

/**
 * The races you can see: visitors see the leagues released by the
 * competition's stage, admins see them all (see src/leagues.ts). The current
 * race and the time estimates only count those races. Shaped like a query
 * result.
 */
export const racesAtom = atom<{
  data: Races | undefined;
  error: Error | null;
  isFetched: boolean;
  isLoading: boolean;
}>((get) => {
  const error = get(racesErrorAtom);
  const racesData = get(racesRowsAtom);
  const competition = get(competitionDataAtom);
  if (racesData === undefined || competition === undefined) {
    return { data: undefined, error, isFetched: false, isLoading: !error };
  }
  const data = buildRaces(racesData, competition, get(isAdminAtom));
  return { data, error, isFetched: true, isLoading: false };
});

function buildRaces(
  racesData: RaceRow[],
  competition: Competition,
  isAdmin: boolean,
): Races {
  // How many races in advance to go to stand for
  const goToStand = competition.go_to_stand;

  // Convert from Supabase data to RaceResult, leaving out the leagues you
  // can't see.
  const flights = new Set<string>();
  const races: RaceResult[] = racesData
    .filter((d) => isLeagueVisible(d.league, competition.stage, isAdmin))
    .map((d) => {
      flights.add(d.flight.id);
      const result =
        d.finishtime === null
          ? {
              finishtime: null,
              lresult: null,
              rresult: null,
            }
          : {
              finishtime: dayjs(d.finishtime),
              // these should be set if finishtime is set
              lresult: d.lresult!,
              rresult: d.rresult!,
            };
      return {
        ...d,
        ...result,
        released: isLeagueReleased(d.league, competition.stage),
        estfinishtime: null as Dayjs | null,
      };
    });

  // Determine the current race: the first unfinished race after the last
  // finished one. Unfinished races before that are treated as skipped or
  // postponed, and races appended after a finished stage become current.
  // If the schedule ends in finished races while earlier races are still
  // unfinished, those trailing results were entered early (e.g. the last
  // race by mistake), so look for the current race before them instead.
  // When every race is finished there is no current race.
  let end = races.length;
  while (end > 0 && races[end - 1].finishtime !== null) {
    end--;
  }
  let currentRaceIndex: number | null = null;
  for (let i = end - 1; i >= 0 && races[i].finishtime === null; i--) {
    currentRaceIndex = i;
  }
  const currentRace: number | null =
    currentRaceIndex === null ? null : races[currentRaceIndex].number;

  // Calculate average time between races
  if (currentRaceIndex !== null && currentRaceIndex !== races.length - 1) {
    const finishTimes = [];
    for (
      let i = currentRaceIndex - 1;
      finishTimes.length < 10 && i >= 0;
      i--
    ) {
      if (races[i].finishtime) {
        finishTimes.push(races[i].finishtime);
      } else {
        break; // if there is no finish time, cancel early
      }
    }

    if (finishTimes.length >= 2) {
      let totalTimeDiff = 0;
      for (let j = 0; j < finishTimes.length - 1; j++) {
        const timeDiff = finishTimes[j]!.diff(finishTimes[j + 1]!);
        totalTimeDiff += timeDiff;
      }
      const averageTimeBetweenRacesMs =
        totalTimeDiff / (finishTimes.length - 1);

      // Add estimates to races array
      for (let i = currentRaceIndex + 1; i < races.length; i++) {
        // Races entered early already have a finish time
        if (races[i].finishtime !== null) continue;
        const time = dayjs().add(
          averageTimeBetweenRacesMs * (i - currentRaceIndex - goToStand),
        );
        races[i].estfinishtime = time;
      }
    }
  }

  return { races, currentRace, numFlights: flights.size };
}

export const leaderboardAtom = atom((get) => {
  const races = get(racesAtom).data?.races;
  if (races === undefined) {
    return undefined;
  }

  // league -> team -> row
  const leaderboard: Map<string, Map<string, LeaderboardTeam>> = new Map();
  const teamRow = (team: Team, league: string): LeaderboardTeam => {
    // Get league board
    let leagueBoard = leaderboard.get(league);
    if (leagueBoard === undefined) {
      leagueBoard = new Map();
      leaderboard.set(league, leagueBoard);
    }

    const row = leagueBoard.get(team.id);
    if (row !== undefined) {
      // Return existing
      return row;
    } else {
      // Create team row
      const row: LeaderboardTeam = {
        total_pts: 0,
        avg_pts: NaN, // populated later
        losses: 0,
        win_rate: NaN, // populated later
        order: NaN, // populated later
        beat: [],
        wins: 0,
        league,
        team,
      };

      leagueBoard.set(team.id, row);
      return row;
    }
  };

  // Iterate through races
  // - populate leaderboard
  // - group races by league
  const racesByLeague = new Map<string, RaceResult[]>();
  for (const race of races) {
    if (race.finishtime === null) {
      continue;
    }
    // Skip placeholder races without teams
    if (race.lteam === null || race.rteam === null) {
      continue;
    }

    // Group races by league
    let races = racesByLeague.get(race.league);
    if (races === undefined) {
      races = [];
      racesByLeague.set(race.league, races);
    }
    races.push(race);

    // Add this result to running leaderboard
    const lteam = teamRow(race.lteam, race.league);
    const rteam = teamRow(race.rteam, race.league);

    const lpts = race.lresult.reduce((a, b) => a + b, 0);
    const rpts = race.rresult.reduce((a, b) => a + b, 0);
    lteam.total_pts += lpts;
    rteam.total_pts += rpts;

    if (lpts < rpts) {
      lteam.wins += 1;
      lteam.beat.push(rteam);
      rteam.losses += 1;
    } else {
      rteam.wins += 1;
      rteam.beat.push(lteam);
      lteam.losses += 1;
    }
  }
  const sortedLeaderboard: Map<string, LeaderboardTeam[]> = new Map();
  for (const [league, leagueBoard] of leaderboard) {
    // Populate with statistics useful for tie breaks
    const leagueArray = [...leagueBoard.values()];
    for (const row of leagueArray) {
      row.win_rate = row.wins / (row.wins + row.losses);
      row.avg_pts = row.total_pts / (row.wins + row.losses);
    }

    // each criteria returns a number, sorts by HIGHEST number first
    const initialCriteria: ((
      _: LeaderboardTeam[],
    ) => (_: LeaderboardTeam) => number)[] = [
      // (0) by win %
      (_) => (t) => t.win_rate,
      // (1) if all tied teams have met, the number of races won when they met, highest first;
      // (2) if all tied teams have met, the total points scored when they met, lowest first;
      (teams) => {
        // Mini round robin
        const miniStats = new Map<
          string,
          { wins: number; total_pts: number }
        >();
        for (const t of teams) {
          miniStats.set(t.team.id, { wins: 0, total_pts: 0 });
        }

        // Consider all races between these teams
        let rs = 0;
        for (const r of races) {
          if (r.league !== league) continue;
          if (r.finishtime === null) continue;

          const lStats = r.lteam ? miniStats.get(r.lteam.id) : undefined;
          const rStats = r.rteam ? miniStats.get(r.rteam.id) : undefined;
          if (lStats !== undefined && rStats !== undefined) {
            rs += 1;
            const lpts = r.lresult.reduce((a, b) => a + b);
            const rpts = r.rresult.reduce((a, b) => a + b);

            // Add wins
            if (lpts < rpts) {
              lStats.wins += 1;
            } else {
              rStats.wins += 1;
            }

            // Add points
            lStats.total_pts += lpts;
            rStats.total_pts += rpts;
          }
        }

        // If the teams haven't all played eachother, ties cannot be broken this way
        if (rs !== (teams.length * (teams.length - 1)) / 2) {
          return (_) => 0;
        }

        // First by number of races won, then by avg pts
        return (t) => {
          const { wins, total_pts } = miniStats.get(t.team.id)!;
          return wins * rs - total_pts / 30;
        };
      },
      // (3) the average points per race scored by each tied team in all its races, lowest first;
      (_) => (t) => -t.avg_pts,
      // (4) the average of the percentage wins of teams that each tied team beat, highest first;
      (_) => (t) =>
        t.beat.map((t2) => t2.win_rate).reduce((a, b) => a + b, 0) /
        t.beat.length,
      // (5) the average of the average points scored in all races by teams that each tied team beat, lowest first;
      (_) => (t) =>
        -t.beat.map((t2) => t2.avg_pts).reduce((a, b) => a + b, 0) /
        t.beat.length,
    ];

    // Orders according to various criteria
    const orderTeams = (
      teams: LeaderboardTeam[],
      criteria: ((_: LeaderboardTeam[]) => (_: LeaderboardTeam) => number)[],
    ): LeaderboardTeam[] => {
      if (teams.length <= 1) {
        return teams;
      }

      if (criteria.length === 0) {
        console.error(
          "Unbreakable tie, using coin toss",
          teams.map((t) => t.team.name),
        );
        return teams;
      }
      const c = criteria[0](teams);

      // Sort according to first criteria, HIGHEST FIRST
      teams.sort((a, b) => c(b) - c(a));

      // Iterate over this tie break block
      let endI = 0;
      while (endI < teams.length - 1 && c(teams[0]) === c(teams[endI + 1])) {
        endI++;
      }

      // Split teams into tied and remaining teams
      let tiedTeams = teams.slice(0, endI + 1);
      teams = teams.slice(endI + 1);

      if (tiedTeams.length > 1) {
        // Fix ties in this block,
        // but avoids using the first criteria because that caused this tie
        tiedTeams = orderTeams(tiedTeams, criteria.slice(1));
      }

      // Orders remaining
      teams = orderTeams(teams, criteria);

      return tiedTeams.concat(teams);
    };

    sortedLeaderboard.set(league, orderTeams(leagueArray, initialCriteria));
  }
  return sortedLeaderboard;
});

export {
  allCompetitions,
  type CompetitionBasic,
  type CompetitionId,
} from "./competitions";

/** The competition this page is for, decided on the server (see requestCompetition). */
export const competitionIdAtom = atom<CompetitionId | null>(null);

export const competitionBasicAtom = atom<CompetitionBasic | null>((get) => {
  const id = get(competitionIdAtom);
  return id === null ? null : allCompetitions[id];
});

/** The current competition. Only for competition pages, which always have one. */
export function useCompetition(): CompetitionBasic {
  const competition = useAtomValue(competitionBasicAtom);
  if (competition === null) {
    throw new Error("useCompetition() used on a page without a competition");
  }
  return competition;
}

export const competitionAtom = atomWithQuery<Competition>((get) => {
  const competition = get(competitionBasicAtom)!;
  return {
  queryKey: ["competition", competition.id],
  // enabled: get(competitionBasicAtom) !== null,
  queryFn: async () => {

    const settings = await supabase
      .from("competition")
      .select("*")
      .eq("id", competition.id)
      .single();

    if (settings.error) {
      throw settings.error;
    }

    const x: Competition = {
      ...settings.data,
      stage: parseStage(settings.data.stage),
    };
    return x;
  },
};
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1 * 1000, // 1s
    },
  },
});

// This is supabase logic which needs to run all the time
export function SharedLogic() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // {queryKey} is invalidated when {table} changes
    const keyTableLinks: [QueryKey[], string][] = [
      [[["races_data"]], "race"],
      [[["competition"]], "competition"],
      [[["feedback"]], "feedback"],
    ];

    const channels = keyTableLinks.map(([queryKeys, table]) => {
      let loading = false;
      return supabase
        .channel(table + "-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          async (payload) => {
            if (loading) {
              return;
            }

            loading = true;
            await Promise.all(
              queryKeys.map(async (queryKey) => {
                const queryState = queryClient.getQueryState(queryKey);
                if (queryState?.status === "pending") {
                  return;
                }

                console.log(
                  "invalidating",
                  queryKey,
                  "due to a change in",
                  table,
                );

                await queryClient.invalidateQueries({ queryKey });
              }),
            );
            loading = false;
          },
        )
        .subscribe();
    });

    return () => {
      channels.forEach((channel) => channel.unsubscribe());
    };
  }, []);

  return <></>;
}
