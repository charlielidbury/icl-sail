// Renders a competition's race schedule to a printable PDF with Typst
// (template: scripts/schedule.typ, data: src/schedule-pdf/document.ts; the
// /scheduler page compiles the same template in the browser).
//
// Usage:
//   node scripts/schedule-pdf.ts <competition> [options]      races from Supabase
//   node scripts/schedule-pdf.ts --config <config.json> [options]
//                                races from a schedule CSV, before importing it
//
// Options:
//   --league <a,b>   leagues to include, in race order (default: quali)
//   --title <text>   heading (default: the competition's name in the database)
//   --out <path>     output PDF (default: public/<competition>/schedule.pdf)
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
import {
  buildScheduleDocument,
  halfColour,
} from "../src/schedule-pdf/document.ts";

type Flight = {
  id: string;
  name: string;
  lname: string;
  lnumbers: number[];
  rname: string;
  rnumbers: number[];
};

type Race = {
  number: number;
  league: string;
  flight: string; // flight id
  lteam: string;
  rteam: string;
};

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

// The competition's accent colour, as the site uses it: its `accentColour` in
// `allCompetitions` (src/competitions.ts).
function accentColour(id: string): string {
  const competitions = fs.readFileSync(
    new URL("../src/competitions.ts", import.meta.url),
    "utf-8",
  );
  const block = competitions.match(new RegExp(`\\bid: "${id}",[^}]*`))?.[0];
  return block?.match(/accentColour: "(#[0-9a-fA-F]{6})"/)?.[1] ?? "#004a79";
}

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

const LEAGUE_NAMES: Record<string, string> = {
  quali: "Qualifying",
  "semis/gold": "Gold Semi-Final",
  "semis/silver": "Silver Semi-Final",
};
const leagueName = (l: string) => LEAGUE_NAMES[l] ?? l;

// Flights in the order they first race.
const flightById = new Map(source.flights.map((f) => [f.id, f]));
const flightOrder: string[] = [];
for (const r of source.races) {
  if (!flightById.has(r.flight)) throw new Error(`Unknown flight ${r.flight}`);
  if (!flightOrder.includes(r.flight)) flightOrder.push(r.flight);
}
const flights = flightOrder.map((id) => {
  const f = flightById.get(id)!;
  return {
    name: f.name,
    halves: [
      { name: f.lname, numbers: f.lnumbers, ...halfColour(f.lname) },
      { name: f.rname, numbers: f.rnumbers, ...halfColour(f.rname) },
    ],
  };
});

const data = buildScheduleDocument({
  title: opts.title ?? source.name ?? competition,
  accent: accentColour(competition),
  flights,
  sections: leagues.map((league) => ({
    title: leagueName(league),
    races: source.races
      .filter((r) => r.league === league)
      .map((r) => ({
        number: r.number,
        flight: flightOrder.indexOf(r.flight),
        left: r.lteam,
        right: r.rteam,
      })),
  })),
  teams: opts.teams,
});
const raceCount = data.sections.reduce((n, s) => n + s.races.length, 0);

if (opts.json) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

// --- Render ---------------------------------------------------------------------

const out = opts.out ?? path.join("public", competition, "schedule.pdf");
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
