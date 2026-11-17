// Reads a schedule CSV and the config.json that describes it (see
// schedule/sixpack/ for an example). Shared by import-schedule.ts and
// schedule-pdf.ts.
//
// The CSV's first column is the race number, and each flight occupies two
// columns (left half, right half). A row only fills in one flight's columns.
import * as fs from "node:fs";
import * as path from "node:path";

export type FlightConfig = {
  // Fixed so re-runs don't duplicate the flight. Also names the flight photos:
  // public/halfflights/<id>_left.jpeg and <id>_right.jpeg.
  id: string;
  // CSV headers of this flight's left and right halves.
  columns: [string, string];
  // Omit these to reuse an existing flight row with this id.
  name?: string;
  lname?: string;
  lnumbers?: number[];
  rname?: string;
  rnumbers?: number[];
};

export type ScheduleConfig = {
  competition: string;
  league: string;
  // Path to the CSV, relative to the config file.
  schedule: string;
  flights: FlightConfig[];
  // Maps names in the CSV to team names in the database. Unmapped names are
  // used as-is.
  teams?: Record<string, string>;
};

export type CsvRace = {
  number: number;
  flight: string; // flight id
  lteam: string;
  rteam: string;
};

export function readSchedule(configPath: string): {
  config: ScheduleConfig;
  races: CsvRace[];
} {
  const config: ScheduleConfig = JSON.parse(
    fs.readFileSync(configPath, "utf-8"),
  );
  const csv = fs.readFileSync(
    path.join(path.dirname(configPath), config.schedule),
    "utf-8",
  );

  const [header, ...rows] = csv
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(",").map((cell) => cell.trim()));

  const column = (name: string): number => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`No column "${name}" in ${config.schedule}`);
    return i;
  };
  const team = (csvName: string) => config.teams?.[csvName] ?? csvName;

  const races: CsvRace[] = [];
  for (const row of rows) {
    const number = parseInt(row[0], 10);
    if (isNaN(number)) continue;
    for (const flight of config.flights) {
      const l = row[column(flight.columns[0])];
      const r = row[column(flight.columns[1])];
      if (l && r) {
        races.push({ number, flight: flight.id, lteam: team(l), rteam: team(r) });
      } else if (l || r) {
        throw new Error(`Race ${number} has only one team in ${flight.id}`);
      }
    }
  }

  const numbers = races.map((r) => r.number);
  if (new Set(numbers).size !== numbers.length) {
    throw new Error("A race number appears more than once");
  }

  return { config, races };
}
