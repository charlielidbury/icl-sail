// Server-side: which competition the current request is for (see
// competitionForRequest in ./competitions.ts).
import { cookies, headers } from "next/headers";
import {
  COMPETITION_COOKIE,
  competitionForHost,
  competitionForRequest,
  type CompetitionBasic,
} from "./competitions";

export async function requestCompetition(): Promise<{
  /** The Host header, port included. */
  host: string | undefined;
  competition: CompetitionBasic | null;
  /**
   * Whether the address itself names the competition. When it doesn't, the
   * competition came from the cookie, so the response varies by visitor and
   * must not be cached publicly (shared caches key on the URL, not cookies).
   */
  fromHost: boolean;
}> {
  const host = (await headers()).get("host") ?? undefined;
  const hostname = host?.split(":")[0];
  const cookie = (await cookies()).get(COMPETITION_COOKIE)?.value;
  return {
    host,
    competition: competitionForRequest(hostname, cookie),
    fromHost: competitionForHost(hostname) !== null,
  };
}
