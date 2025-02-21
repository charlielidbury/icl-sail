import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import supabase from "./supabase";
import { Session } from "@supabase/supabase-js";
import { QueryClient, QueryKey, useQueryClient } from "@tanstack/react-query";

export const sailingColour = "#004a79";

export function getLeagueName(league: string): string {
  switch (league.toLowerCase()) {
    case "quali":
      return "Qualifying";
    case "silver":
      return "Silver";
    case "gold":
      return "Gold";
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

export const racesQuery = {
  queryKey: ["races"],
  queryFn: async () => {
    const [
      { data: racesData, error: racesError },
      { data: settingsData, error: settingsError },
    ] = await Promise.all([
      supabase
        .from("race")
        .select(
          `
          id,
          number,
          video,
          finishtime,
          league,
          raceteam (
            race,
            team ( id, name ),
            result,
            halfflight ( id, name, symbol, colour, numbers )
          )
        `
        )
        .order("number", { ascending: false }),
      supabase.from("settings").select("*").maybeSingle(),
    ]);

    if (racesError) throw racesError;
    if (settingsError) throw settingsError;

    const goToStand = settingsData?.go_to_stand ?? 4;

    // Convert from Supabase data to RaceResult
    const races: RaceResult[] = racesData.map((d) => ({
      id: d.id,
      number: d.number,
      video: d.video,
      finishtime: d.finishtime === null ? null : dayjs(d.finishtime),
      estfinishtime: null as Dayjs | null,
      league: d.league,
      raceteam: d.raceteam.map((rt) => ({
        team: rt.team,
        result: rt.result,
        halfflight: {
          ...rt.halfflight,
          image: `/flights/${rt.halfflight.name}(${rt.halfflight.numbers.join(
            ","
          )}).jpeg`,
        },
      })),
    }));

    // Determine current race (first race with no result)
    let currentRace: number | null = null;
    let currentRaceIndex: number | null = null;
    for (let i = 0; i < races.length; i++) {
      // If the first team in this race has a result, it means the race is done.
      if (races[i].raceteam[0]?.result !== null) {
        break;
      }
      currentRace = races[i].number;
      currentRaceIndex = i;
    }

    // Calculate average time between races
    if (currentRaceIndex !== null && currentRaceIndex !== races.length - 1) {
      const finishTimes = [];
      for (
        let i = currentRaceIndex + 1;
        finishTimes.length < 10 && i < races.length;
        i++
      ) {
        if (races[i].finishtime) {
          console.log("finish time", races[i].number);
          finishTimes.push(races[i].finishtime);
        } else {
          console.log("no finish time", races[i].number);
          break; // if there is no finish time, cancel early
        }
      }

      console.log({ finishTimes });

      if (finishTimes.length >= 2) {
        let totalTimeDiff = 0;
        for (let j = 0; j < finishTimes.length - 1; j++) {
          const timeDiff = finishTimes[j]!.diff(finishTimes[j + 1]!);
          totalTimeDiff += timeDiff;
        }
        const averageTimeBetweenRacesMs =
          totalTimeDiff / (finishTimes.length - 1);

        console.log({ currentRace, averageTimeBetweenRacesMs });

        // Add estimates to races array
        const currentTime = races[currentRaceIndex + 1]!.finishtime!;
        for (let i = 0; i < currentRaceIndex; i++) {
          races[i].estfinishtime = currentTime.add(
            averageTimeBetweenRacesMs * (currentRaceIndex - i - goToStand)
          );
        }
      }
    }

    // Add estimates
    // Calculate average time between races for the most recent 10 races

    return { races, currentRace };
  },
};

export interface RaceResult {
  id: string;
  number: number;
  video: string | null;
  finishtime: Dayjs | null;
  estfinishtime: Dayjs | null;
  league: string;
  raceteam: {
    team: {
      id: string;
      name: string;
    };
    halfflight: {
      id: string;
      name: string;
      symbol: string | null;
      colour: string | null;
      numbers: number[];
      image: string;
    };
    result: number[] | null;
  }[];
}

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
    const keyTableLinks: [QueryKey, string][] = [
      [["leaderboard"], "leaderboard"],
      [["races"], "raceteam"],
      [["settings"], "settings"],
      [["races"], "settings"],
    ];

    const channels = keyTableLinks.map(([queryKey, table]) => {
      let loading = false;
      return supabase
        .channel(table + "-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          async (payload) => {
            const queryState = queryClient.getQueryState(queryKey);
            if (loading || queryState?.status === "pending") {
              return;
            }

            console.log("invalidating", queryKey);

            loading = true;
            await queryClient.invalidateQueries({ queryKey });
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
