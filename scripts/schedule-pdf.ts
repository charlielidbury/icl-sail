// Renders a competition's race schedule to a printable PDF with Typst
// (template: scripts/schedule.typ, data: src/schedule-pdf/document.ts). The
// site renders the same template on the server: /schedule.pdf is always the
// current schedule (src/schedule-pdf/render.ts).
//
// Usage:
//   node scripts/schedule-pdf.ts <competition> [options]      races from Supabase
//   node scripts/schedule-pdf.ts --config <config.json> [options]
//                                races from a schedule CSV, before importing it
//
// Options:
//   --league <a,b>   leagues to include, in race order (default: quali)
//   --title <text>   heading (default: the competition's name in the database)
//   --out <path>     output PDF (default: public/<competition>/schedule.pdf for
//                    qualifying, else schedule-<leagues>.pdf beside it)
//   --teams          add a "Races by team" index after the schedule (off by
//                    default: it usually adds a page to what gets printed)
//   --json           print the template data instead of writing a PDF
//
// Needs `supabase` (logged in and linked, see .claude/skills/db/SKILL.md) and
// `typst` on the PATH; both come with the nix dev shell.
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";
import { readSchedule } from "./schedule-csv.ts";
import { allCompetitions, type CompetitionId } from "../src/competitions.ts";
import {
  competitionDocument,
  type FlightRow,
  type RaceRow,
} from "../src/schedule-pdf/document.ts";

type Flight = FlightRow;
type Race = RaceRow;

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    config: { type: "string" },
    league: { type: "string", default: "quali" },
    title: { type: "string" },
    out: { type: "string" },
    teams: { type: "boolean", default: false },
    json: { type: "boolean", default: false },
  },
});

const leagues = opts.league.split(",").map((l) => l.trim());

// --- Data -------------------------------------------------------------------

function query<T>(sql: string): T[] {
  try {
    const out = execFileSync(
      "supabase",
      ["db", "query", "--linked", "--agent=no", "-o", "json", sql],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return JSON.parse(out);
  } catch (e) {
    const err = e as { stderr?: string; message: string };
    throw new Error(`supabase db query failed:\n${err.stderr ?? err.message}`);
  }
}

const sqlString = (s: string) => `'${s.replace(/'/g, "''")}'`;
const sqlList = (xs: string[]) => `ARRAY[${xs.map(sqlString).join(", ")}]::text[]`;

const flightColumns = "id, name, lname, lnumbers, rname, rnumbers";

function fromDatabase(competition: string): {
  name: string | null;
  flights: Flight[];
  races: Race[];
} {
  const [{ data }] = query<{
    data: {
      name: string | null;
      flights: Flight[] | null;
      races: Race[] | null;
    };
  }>(`
    WITH r AS (
      SELECT race.number, race.league, race.flight,
        coalesce(lt.name, race.lplaceholder, 'TBD') AS lteam,
        coalesce(rt.name, race.rplaceholder, 'TBD') AS rteam
      FROM race
      LEFT JOIN team lt ON lt.id = race.lteam
      LEFT JOIN team rt ON rt.id = race.rteam
      WHERE race.competition = ${sqlString(competition)}
        AND race.league = ANY(${sqlList(leagues)})
    )
    SELECT json_build_object(
      'name', (SELECT name FROM competition WHERE id = ${sqlString(competition)}),
      'races', (SELECT json_agg(r ORDER BY r.number) FROM r),
      'flights', (SELECT json_agg(f) FROM (
        SELECT ${flightColumns} FROM flight WHERE id IN (SELECT flight FROM r)
      ) f)
    ) AS data`);
  return {
    name: data.name,
    flights: data.flights ?? [],
    races: data.races ?? [],
  };
}

function fromConfig(configPath: string): {
  competition: string;
  name: string | null;
  flights: Flight[];
  races: Race[];
} {
  const { config, races } = readSchedule(configPath);
  if (!leagues.includes(config.league)) {
    throw new Error(
      `${configPath} is for league "${config.league}"; pass --league ${config.league}`,
    );
  }
  // Flights given in full in the config don't need the database.
  const flights: Flight[] = config.flights
    .filter((f) => f.name !== undefined)
    .map((f) => ({
      id: f.id,
      name: f.name!,
      lname: f.lname!,
      lnumbers: f.lnumbers!,
      rname: f.rname!,
      rnumbers: f.rnumbers!,
    }));
  const missing = config.flights
    .filter((f) => f.name === undefined)
    .map((f) => f.id);
  let name: string | null = null;
  if (missing.length > 0 || opts.title === undefined) {
    const [{ data }] = query<{
      data: { name: string | null; flights: Flight[] | null };
    }>(`
      SELECT json_build_object(
        'name', (SELECT name FROM competition WHERE id = ${sqlString(config.competition)}),
        'flights', (SELECT json_agg(f) FROM (
          SELECT ${flightColumns} FROM flight WHERE id::text = ANY(${sqlList(missing)})
        ) f)
      ) AS data`);
    name = data.name;
    flights.push(...(data.flights ?? []));
  }
  return {
    competition: config.competition,
    name,
    flights,
    races: races.map((r) => ({ ...r, league: config.league })),
  };
}

let competition: string;
let source: ReturnType<typeof fromDatabase>;
if (opts.config !== undefined) {
  const c = fromConfig(opts.config);
  competition = c.competition;
  source = c;
} else {
  competition = positionals[0];
  if (!competition || !/^[\w-]+$/.test(competition)) {
    console.error(
      "Usage: node scripts/schedule-pdf.ts <competition> | --config <config.json> [--league quali] [--title ...] [--out ...] [--teams] [--json]",
    );
    process.exit(1);
  }
  source = fromDatabase(competition);
}

if (source.races.length === 0) {
  throw new Error(
    `No races found for ${competition} in league(s) ${leagues.join(", ")}`,
  );
}

// --- Layout data --------------------------------------------------------------

const data = competitionDocument({
  title: opts.title ?? source.name ?? competition,
  accent: allCompetitions[competition as CompetitionId]?.accentColour ?? "#004a79",
  leagues,
  flights: source.flights,
  races: source.races,
  teams: opts.teams,
});
const raceCount = data.sections.reduce((n, s) => n + s.races.length, 0);

if (opts.json) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

// --- Render ---------------------------------------------------------------------

// Only the qualifying schedule gets the plain name, so printing other leagues
// never overwrites it.
const leagueSuffix =
  leagues.length === 1 && leagues[0] === "quali"
    ? ""
    : "-" + leagues.join("-").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
const out = opts.out ?? path.join("public", competition, `schedule${leagueSuffix}.pdf`);
fs.mkdirSync(path.dirname(out), { recursive: true });
execFileSync(
  "typst",
  [
    "compile",
    "--input",
    `data=${JSON.stringify(data)}`,
    path.join(import.meta.dirname, "schedule.typ"),
    out,
  ],
  { stdio: "inherit" },
);
console.error(`Wrote ${out} (${raceCount} races)`);
