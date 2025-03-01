import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import supabase from "./supabase";
import { Session } from "@supabase/supabase-js";
import { QueryClient, QueryKey, useQueryClient } from "@tanstack/react-query";
import { atom, useAtom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";

export interface Flight {
  id: string;
  name: string;
  lhalf: HalfFlight;
  rhalf: HalfFlight;
}

export interface HalfFlight {
  id: string;
  name: string;
  numbers: number[];
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
  flight: Flight;
  lteam: Team;
  rteam: Team;
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
  code: string;
  estimates: boolean;
  go_to_stand: number;
  host: string;
  name: string;
  racing_paused: boolean;
  id: string;
};

export const sailingColour = "#004a79";

export function getLeagueName(league: string): string {
  switch (league.toLowerCase()) {
    case "quali":
      return "Qualifying";
    case "semis/silver":
      return "Silver Semi-Final";
    case "semis/gold":
      return "Gold Semi-Final";
    default:
      return league;
  }
}

export function useAuth(): { session: Session | null; isAdmin: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session)
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session && session.user) {
        const { data } = await supabase
          .from("admin")
          .select("uuid")
          .eq("uuid", session.user.id)
          .maybeSingle();
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [session]);

  return { session, isAdmin };
}

const racesDataAtom = atomWithQuery((get) => ({
  queryKey: ["races_data"],
  enabled: get(competitionAtom).isFetched,
  error: get(competitionAtom).error,
  queryFn: async () => {
    const competition = get(competitionAtom).data?.current;
    if (!competition) {
      return undefined;
    }

    // Get races
    const { data: racesData, error: racesError } = await supabase
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
            lhalf:halfflight!lhalf ( id, name, numbers ),
            rhalf:halfflight!rhalf ( id, name, numbers )
          ),
          lteam:team!lteam ( id, name ),
          lresult,
          rresult,
          rteam:team!rteam ( id, name )
        `
      )
      .order("number", { ascending: true })
      .eq("competition", competition.id);

    if (racesError) throw racesError;

    return racesData;
  },
}));

export const racesAtom = atomWithQuery((get) => ({
  queryKey: ["races"],
  enabled: get(racesDataAtom).isFetched && get(competitionAtom).isFetched,
  error: get(racesDataAtom).error || get(competitionAtom).error,
  queryFn: async () => {
    const racesData = get(racesDataAtom).data;
    if (racesData === undefined) {
      return undefined;
    }

    // How many races in advance to go to stand for
    const competition = get(competitionAtom).data?.current;
    const goToStand = competition?.go_to_stand ?? 4;

    // Convert from Supabase data to RaceResult
    const races: RaceResult[] = racesData.map((d) => {
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
        estfinishtime: null as Dayjs | null,
      };
    });

    // Determine current race (first race with no result)
    let currentRace: number | null = null;
    let currentRaceIndex: number | null = null;
    for (let i = races.length - 1; i >= 0; i--) {
      // If the first team in this race has a result, it means the race is done.
      if (races[i].finishtime !== null) {
        break;
      }
      currentRace = races[i].number;
      currentRaceIndex = i;
    }

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
          // races[i].estfinishtime = dayjs();
          const time = dayjs().add(
            averageTimeBetweenRacesMs * (i - currentRaceIndex - goToStand)
          );
          races[i].estfinishtime = time;
        }
      }
    }

    return { races, currentRace };
  },
}));

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
      _: LeaderboardTeam[]
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

          const lStats = miniStats.get(r.lteam.id);
          const rStats = miniStats.get(r.rteam.id);
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
      criteria: ((_: LeaderboardTeam[]) => (_: LeaderboardTeam) => number)[]
    ): LeaderboardTeam[] => {
      if (teams.length <= 1) {
        return teams;
      }

      if (criteria.length === 0) {
        console.error(
          "Unbreakable tie, using coin toss",
          teams.map((t) => t.team.name)
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

export const competitionAtom = atomWithQuery((get) => ({
  queryKey: ["competition"],
  queryFn: async () => {
    const competitions = await supabase.from("competition").select("*");
    const current =
      document.location.hostname === "localhost"
        ? competitions.data?.find((c) => c.code === "imperialicicle")
        : competitions.data?.find((c) => c.host === document.location.hostname);
    return { current, all: competitions.data };
  },
}));

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
                  table
                );

                await queryClient.invalidateQueries({ queryKey });
              })
            );
            loading = false;
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach((channel) => channel.unsubscribe());
    };
  }, []);

  return <></>;
}
