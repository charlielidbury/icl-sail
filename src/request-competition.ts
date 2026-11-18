// Server-side: which competition the current request is for (see
// competitionForRequest in ./competitions.ts).
import { cookies, headers } from "next/headers";
import {
  COMPETITION_COOKIE,
  competitionForRequest,
  type CompetitionBasic,
} from "./competitions";

export async function requestCompetition(): Promise<{
  /** The Host header, port included. */
  host: string | undefined;
  competition: CompetitionBasic | null;
}> {
  const host = (await headers()).get("host") ?? undefined;
  const cookie = (await cookies()).get(COMPETITION_COOKIE)?.value;
  return { host, competition: competitionForRequest(host?.split(":")[0], cookie) };
}
