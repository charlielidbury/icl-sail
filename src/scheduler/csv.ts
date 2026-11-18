// Schedule CSV input/output, working on strings so it runs in the browser.
//
// Ported from team_race_scheduler (io.py) by Henry Hollingworth,
// https://github.com/Ninjamouse-1000/team_race_scheduler, MIT licence.
//
// Columns: "Race" then two columns per flight (one per boat). Only the two
// boats of the active flight are filled in each row. writeCsv() produces the
// same bytes as Python's write_csv() (csv module defaults: minimal quoting,
// "\r\n" line endings), which scripts/import-schedule.ts also reads.
import type { Race, Schedule } from "./types.ts";
import { boatOf } from "./schedule.ts";

export function defaultBoatNames(nFlights: number): string[] {
  const names: string[] = [];
  for (let f = 0; f < nFlights; f++) names.push(`Flight ${f + 1}a`, `Flight ${f + 1}b`);
  return names;
}

export function defaultTeamNames(nTeams: number): string[] {
  return Array.from({ length: nTeams }, (_, i) => `Team ${i + 1}`);
}

/** One team name per line; blank lines and lines starting with "#" are skipped. */
export function readTeamNames(text: string): string[] {
  return text
    .split(/\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/)
    .map((ln) => ln.trim())
    .filter((n) => n && !n.startsWith("#"));
}

// Python csv.writer with the default "excel" dialect quotes a field only when
// it contains the delimiter, the quote character or a line break.
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * The schedule as CSV text. Team names default to "Team 1".."Team N" and boat
 * names (two per flight, in flight order) to "Flight 1a", "Flight 1b", ...
 */
export function writeCsv(s: Schedule, teamNames?: string[], boatNames?: string[]): string {
  const names = teamNames && teamNames.length ? teamNames : defaultTeamNames(s.nTeams);
  if (names.length < s.nTeams) {
    throw new Error(`Need ${s.nTeams} team names, got ${names.length}`);
  }
  const boats = boatNames && boatNames.length ? boatNames : defaultBoatNames(s.nFlights);
  if (boats.length !== 2 * s.nFlights) {
    throw new Error(`Need ${2 * s.nFlights} boat names, got ${boats.length}`);
  }
  const lines = [["Race", ...boats]];
  s.races.forEach(([a, b], i) => {
    const raceNo = i + 1;
    const row = new Array<string>(boats.length).fill("");
    row[boatOf(s.nFlights, raceNo, 0)] = names[a];
    row[boatOf(s.nFlights, raceNo, 1)] = names[b];
    lines.push([String(raceNo), ...row]);
  });
  return lines.map((cells) => cells.map(csvField).join(",") + "\r\n").join("");
}

/**
 * Parse CSV text the way Python's csv.reader does with the default dialect
 * (non-strict): quoted fields may contain commas, doubled quotes and line
 * breaks; "\r\n", "\n" and "\r" all end a record; a blank line is an empty row.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  type State = "startRecord" | "startField" | "inField" | "inQuoted" | "quoteInQuoted";
  let state: State = "startRecord";
  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRecord = () => {
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const eol = c === "\n" || c === "\r";
    if (eol && c === "\r" && text[i + 1] === "\n" && state !== "inQuoted") i++;
    switch (state) {
      case "startRecord":
        if (eol) {
          endRecord();
          break;
        }
      // falls through
      case "startField":
        if (eol) {
          endField();
          endRecord();
          state = "startRecord";
        } else if (c === '"') state = "inQuoted";
        else if (c === ",") {
          endField();
          state = "startField";
        } else {
          field += c;
          state = "inField";
        }
        break;
      case "inField":
        if (eol) {
          endField();
          endRecord();
          state = "startRecord";
        } else if (c === ",") {
          endField();
          state = "startField";
        } else field += c;
        break;
      case "inQuoted":
        if (c === '"') state = "quoteInQuoted";
        else field += c;
        break;
      case "quoteInQuoted":
        if (c === '"') {
          field += c;
          state = "inQuoted";
        } else if (c === ",") {
          endField();
          state = "startField";
        } else if (eol) {
          endField();
          endRecord();
          state = "startRecord";
        } else {
          field += c;
          state = "inField";
        }
        break;
    }
  }
  if (state !== "startRecord") {
    endField();
    endRecord();
  }
  return rows;
}

export interface ReadCsvResult {
  schedule: Schedule;
  /** Team names indexed by team number; teams are numbered by first appearance. */
  teamNames: string[];
  /** Boat column headers, two per flight. */
  boatNames: string[];
}

/** Read a schedule CSV. Teams are numbered by first appearance. */
export function readCsv(text: string): ReadCsvResult {
  const rows = parseCsvRows(text.replace(/^\ufeff/, ""));
  if (rows.length === 0) throw new Error("Empty CSV");
  const [header, ...rest] = rows;
  const body = rest.filter((r) => r.some((c) => c.trim()));
  const boats = header.slice(1).map((h) => h.trim());
  if (boats.length % 2) {
    throw new Error("Expected an even number of boat columns (two per flight)");
  }
  const nFlights = boats.length / 2;

  const ids = new Map<string, number>();
  const races: Race[] = [];
  for (const row of body) {
    const cells = [...row.slice(1).map((c) => c.trim()), ...new Array<string>(boats.length).fill("")].slice(
      0,
      boats.length,
    );
    const filled = cells.flatMap((c, i) => (c ? [i] : []));
    if (filled.length !== 2 || Math.floor(filled[0] / 2) !== Math.floor(filled[1] / 2)) {
      throw new Error(
        `Race ${row[0]}: expected exactly two boats of one flight, got [${filled.join(", ")}]`,
      );
    }
    const raceText = row[0].trim();
    if (!/^[+-]?\d+$/.test(raceText)) throw new Error(`Race "${row[0]}": not a race number`);
    const raceNo = parseInt(raceText, 10);
    const flight = Math.floor(filled[0] / 2);
    if (flight !== (((raceNo - 1) % nFlights) + nFlights) % nFlights) {
      throw new Error(`Race ${raceNo} is on flight ${flight + 1}, expected rotating flights`);
    }
    const pair = filled.map((i) => {
      if (!ids.has(cells[i])) ids.set(cells[i], ids.size);
      return ids.get(cells[i])!;
    });
    races.push([pair[0], pair[1]]);
  }

  const teamNames = new Array<string>(ids.size);
  for (const [name, id] of ids) teamNames[id] = name;
  return { schedule: { nTeams: ids.size, nFlights, races }, teamNames, boatNames: boats };
}
