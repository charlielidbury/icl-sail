// Pure helpers for the /scheduler page: parsing and checking the inputs,
// sail colours, the seeded team shuffle and the CSV export.
import type { Schedule } from "@/scheduler/types";
import sailColours from "@/sail-colours.json";

export const MAX_TEAMS = 60;
export const MAX_FLIGHTS = 10;
export const MAX_STINT = 10;
export const MAX_TIME_LIMIT_S = 600;

export type Colour = { fill: string; text: string };

export const COLOURS: Record<string, Colour> = sailColours.colours;
export const UNKNOWN_COLOUR: Colour = sailColours.unknown;
/** Colour words to offer in the picker ("gray" is a spelling of "grey"). */
export const COLOUR_NAMES = Object.keys(COLOURS).filter((c) => c !== "gray");

/** A boat (one half of a flight). An empty colour means "from the name". */
export type Boat = { name: string; colour: string };

/** "Flight 1a", "Flight 1b", ... like io.py's default_boat_names. */
export const defaultBoatName = (i: number) =>
  `Flight ${Math.floor(i / 2) + 1}${i % 2 ? "b" : "a"}`;

export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The first colour word in a name, as on /schedule (e.g. "Light Blue" -> blue). */
export function colourWordIn(name: string): string | undefined {
  const words = name.toLowerCase().match(/[a-z]+/g) ?? [];
  return words.find((w) => w in COLOURS);
}

export function boatColour(boat: Boat, index: number): Colour {
  if (boat.colour && COLOURS[boat.colour]) return COLOURS[boat.colour];
  const word = colourWordIn(boatName(boat, index));
  return word ? COLOURS[word] : UNKNOWN_COLOUR;
}

export const boatName = (boat: Boat, index: number) =>
  boat.name.trim() || defaultBoatName(index);

/** One team per line; blank lines are ignored. */
export const parseTeamNames = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

export const genericTeamNames = (n: number) =>
  Array.from({ length: n }, (_, i) => `Team ${i + 1}`);

export const plural = (n: number, word: string) => `${n} ${n === 1 ? word : word + "s"}`;

export const raceCount = (n: number) => (n * (n - 1)) / 2;

/**
 * The fewest teams that can race a round robin on `flights` flights.
 *
 * - On 2+ flights, 2F + 1 teams is impossible: each race on a flight would
 *   have to keep one team in and bring in the one team sitting out, so teams
 *   would only ever meet the same two opponents. So at least 2F + 2.
 * - A max stint of 1 needs 2F + 3: with 2F + 2, every team would race again
 *   exactly F + 1 races later, against the same opponent.
 * - On one flight (with longer stints), 3 teams work.
 */
export function minTeams(flights: number, maxStint: number): number {
  if (maxStint === 1) return 2 * flights + 3;
  return flights === 1 ? 3 : 2 * flights + 2;
}

/** The most flights `teams` teams can use (0 if none). */
export function maxFlights(teams: number, maxStint: number): number {
  let f = 0;
  while (minTeams(f + 1, maxStint) <= teams) f += 1;
  return f;
}

/** Sizes the original tool is tested on: flights -> [min teams, max teams]. */
export const TESTED: Record<number, [number, number]> = {
  1: [4, 9],
  2: [10, 15],
  3: [15, 20],
  4: [20, 26],
};

export function testedNote(nTeams: number, nFlights: number): string | null {
  const range = TESTED[nFlights];
  if (range && nTeams >= range[0] && nTeams <= range[1]) return null;
  const tested = Object.entries(TESTED)
    .filter(([, [lo, hi]]) => nTeams >= lo && nTeams <= hi)
    .map(([f]) => f);
  const suggestion = tested.length
    ? ` ${nTeams} teams are tested on ${tested.join(" or ")} ${tested.length === 1 && tested[0] === "1" ? "flight" : "flights"}.`
    : "";
  return (
    `${nTeams} teams on ${nFlights} ${nFlights === 1 ? "flight" : "flights"} is outside the sizes ` +
    `the scheduler is tested on, so it may take longer or give a weaker schedule.${suggestion}`
  );
}

/** Integer in [min, max], or null. */
export function parseIntIn(s: string, min: number, max: number): number | null {
  if (!/^\s*\d+\s*$/.test(s)) return null;
  const v = Number(s);
  return v >= min && v <= max ? v : null;
}

/** Number in (0, max], or null. */
export function parseSeconds(s: string, max: number): number | null {
  if (!/^\s*(\d+(\.\d*)?|\.\d+)\s*$/.test(s)) return null;
  const v = Number(s);
  return v > 0 && v <= max ? v : null;
}

/** Names that appear more than once (ignoring case), in first-seen spelling. */
export function duplicates(names: string[]): string[] {
  const seen = new Map<string, number>();
  for (const n of names) seen.set(n.toLowerCase(), (seen.get(n.toLowerCase()) ?? 0) + 1);
  const out: string[] = [];
  for (const n of names) {
    if ((seen.get(n.toLowerCase()) ?? 0) > 1 && !out.some((o) => o.toLowerCase() === n.toLowerCase())) {
      out.push(n);
    }
  }
  return out;
}

// Small seeded PRNG (mulberry32).
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The same names in a seeded random order (Fisher-Yates). */
export function shuffled<T>(xs: T[], seed: number): T[] {
  const out = [...xs];
  // Offset the seed so the shuffle doesn't track the generator's own stream.
  const rand = rng(seed ^ 0x5eed5eed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Python's csv module with its defaults: minimal quoting, "\r\n" line ends.
const csvField = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/**
 * The schedule in team_race_scheduler's CSV format (io.py write_csv): a
 * `Race,<boat names...>` header, then one row per race with only the active
 * flight's two boats filled in.
 */
export function scheduleCsv(s: Schedule, teamNames: string[], boatNames: string[]): string {
  const rows = [["Race", ...boatNames]];
  s.races.forEach(([a, b], i) => {
    const row = new Array<string>(boatNames.length).fill("");
    const flight = i % s.nFlights;
    row[2 * flight] = teamNames[a];
    row[2 * flight + 1] = teamNames[b];
    rows.push([String(i + 1), ...row]);
  });
  return rows.map((r) => r.map(csvField).join(",") + "\r\n").join("");
}

export function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
