// GET /schedule.pdf: the competition's current race schedule as a PDF, made
// from the database on each request (cached briefly), so links to it never go
// stale. Same layout and defaults as scripts/schedule-pdf.ts: the qualifying
// league unless ?league=a,b says otherwise, and no "Races by team" page.
import { requestCompetition } from "@/request-competition";
import supabase from "@/supabase";
import {
  DEFAULT_LEAGUES,
  TBD,
  competitionDocument,
  type RaceRow,
} from "@/schedule-pdf/document";
import { renderSchedulePdf } from "@/schedule-pdf/render";
import { messageResponse, pdfResponse } from "@/schedule-pdf/response";

export const runtime = "nodejs";

const CACHE = "public, s-maxage=60, stale-while-revalidate=300";

export async function GET(request: Request) {
  const { competition } = await requestCompetition();
  if (competition === null) {
    return messageResponse(
      404,
      "No competition here",
      "This address isn't a competition's site, so there's no schedule to show.",
    );
  }

  const param = new URL(request.url).searchParams.get("league");
  const leagues = param ? param.split(",").map((l) => l.trim()) : DEFAULT_LEAGUES;
  if (leagues.length > 5 || !leagues.every((l) => /^[\w/-]{1,40}$/.test(l))) {
    return messageResponse(400, "Unknown league", "The league in the address isn't one we know.");
  }

  const start = performance.now();
  const [{ data: comp, error: compError }, { data: races, error: raceError }] =
    await Promise.all([
      supabase.from("competition").select("name").eq("id", competition.id).maybeSingle(),
      supabase
        .from("race")
        .select(
          "number, league, lplaceholder, rplaceholder, lteam:team!race_lteam_fkey(name), rteam:team!race_rteam_fkey(name), flight:flight!race_flight_fkey(id, name, lname, lnumbers, rname, rnumbers)",
        )
        .eq("competition", competition.id)
        .in("league", leagues)
        .order("number"),
    ]);
  if (compError || raceError) {
    console.error(compError ?? raceError);
    return messageResponse(503, "Couldn't load the schedule", "Please try again in a minute.");
  }
  if (!races || races.length === 0) {
    return messageResponse(404, "No schedule yet", `${competition.name} has no races scheduled yet.`);
  }

  // Each race comes with its flight, so this is one round trip.
  const flights = [...new Map(races.map((r) => [r.flight.id, r.flight])).values()];
  const rows: RaceRow[] = races.map((r) => ({
    number: r.number,
    league: r.league,
    flight: r.flight.id,
    lteam: r.lteam?.name ?? r.lplaceholder ?? TBD,
    rteam: r.rteam?.name ?? r.rplaceholder ?? TBD,
  }));
  const loaded = performance.now();
  const doc = competitionDocument({
    title: comp?.name ?? competition.name,
    accent: competition.accentColour,
    leagues,
    flights,
    races: rows,
  });
  const pdf = renderSchedulePdf(doc);
  return pdfResponse(pdf, `${competition.id} schedule`, CACHE, {
    db: loaded - start,
    pdf: performance.now() - loaded,
  });
}
