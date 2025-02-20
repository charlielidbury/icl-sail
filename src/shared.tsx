import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import supabase from "./supabase";
import { Session } from "@supabase/supabase-js";
import {
  QueryClient,
  QueryOptions,
  useQueryClient,
} from "@tanstack/react-query";

export const sailingColour = "#004a79";

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
      raceteam: d.raceteam.map((rt: any) => ({
        team: rt.team,
        result: rt.result,
        halfflight: rt.halfflight,
      })),
    }));
  },
};

export interface RaceResult {
  id: string;
  number: number;
  video: string | null;
  finishtime: Dayjs | null;
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
// the navbar is just a convienient place to put it
export function SharedLogic() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let leaderboardLoading = false;
    const leaderboardChannel = supabase
      .channel("leaderboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard" },
        async (payload) => {
          const queryState = queryClient.getQueryState(["leaderboard"]);
          if (leaderboardLoading || queryState?.status === "pending") {
            return;
          }

          leaderboardLoading = true;
          await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
          leaderboardLoading = false;
        }
      )
      .subscribe();

    let racesLoading = false;
    const racesChannel = supabase
      .channel("races-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "raceteam" },
        async (payload) => {
          const queryState = queryClient.getQueryState(["races"]);
          if (racesLoading || queryState?.status === "pending") {
            return;
          }

          racesLoading = true;
          await queryClient.invalidateQueries({ queryKey: ["races"] });
          racesLoading = false;
        }
      )
      .subscribe();

    return () => {
      leaderboardChannel.unsubscribe();
      racesChannel.unsubscribe();
    };
  }, []);

  return <></>;
}
