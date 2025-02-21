import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import supabase from "./supabase";
import { Session } from "@supabase/supabase-js";
import {
  QueryClient,
  QueryKey,
  QueryOptions,
  useQueryClient,
} from "@tanstack/react-query";

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
    const { data, error } = await supabase
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
      .order("number", { ascending: false });

    if (error) throw error;

    return data.map((d) => ({
      id: d.id,
      number: d.number,
      video: d.video,
      finishtime: dayjs(d.finishtime),
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
  },
};

export interface RaceResult {
  id: string;
  number: number;
  video: string | null;
  finishtime: Dayjs | null;
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
