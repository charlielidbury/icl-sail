// The data that scripts/schedule.typ lays out as a printable schedule, shared
// by the command line (scripts/schedule-pdf.ts, which runs the typst CLI) and
// the browser (./compile.ts, which runs typst.ts). Plain TypeScript with only
// relative imports, so Node can run it directly.
import sailColours from "../sail-colours.json" with { type: "json" };

export type Colour = { fill: string; text: string };

/** One boat of a flight: its header is coloured like its sails. */
export type DocumentHalf = { name: string; numbers: number[] } & Colour;

export type DocumentFlight = { name: string; halves: DocumentHalf[] };

export type DocumentRace = {
  number: number;
  /** Index into `flights`. */
  flight: number;
  left: string;
  right: string;
};

export type DocumentSection = { title: string; races: DocumentRace[] };

/** The template's `data` input (`typst compile --input data=<json>`). */
export type ScheduleDocument = {
  title: string;
  subtitle: string;
  /** Top right of the first page: counts, then any notes, one per line. */
  summary: string;
  accent: string;
  generated: string;
  flights: DocumentFlight[];
  sections: DocumentSection[];
  /** The "Races by team" index; empty to leave it out. */
  teams: { name: string; races: ({ number: number } & Colour)[] }[];
};

const COLOURS: Record<string, Colour> = sailColours.colours;

/**
 * Header colour for a half, from the first colour word in its name, e.g.
 * "Pink Stripe" or "Blue Tip". The palette lives in src/sail-colours.json.
 */
export function halfColour(name: string): Colour {
  const words = name.toLowerCase().match(/[a-z]+/g) ?? [];
  const word = words.find((w) => w in COLOURS);
  return word ? COLOURS[word] : sailColours.unknown;
}

/** Placeholder for a race whose team isn't known yet; not counted as a team. */
export const TBD = "TBD";

export function buildScheduleDocument(input: {
  title: string;
  /** Defaults to "<section> Schedule" for one section, else "Race Schedule". */
  subtitle?: string;
  accent: string;
  flights: DocumentFlight[];
  sections: DocumentSection[];
  /** Extra lines for the summary, under the race, team and flight counts. */
  notes?: string[];
  /** Add the "Races by team" index (it usually needs another page). */
  teams?: boolean;
  generated?: Date;
}): ScheduleDocument {
  const { flights } = input;
  const sections = input.sections.filter((s) => s.races.length > 0);

  // Each team's races, coloured by the half (boats) they sail in.
  const teamRaces = new Map<string, ({ number: number } & Colour)[]>();
  for (const s of sections) {
    for (const r of s.races) {
      const halves = flights[r.flight].halves;
      for (const [team, half] of [
        [r.left, halves[0]],
        [r.right, halves[1]],
      ] as const) {
        if (team === TBD) continue;
        const list = teamRaces.get(team) ?? [];
        list.push({ number: r.number, fill: half.fill, text: half.text });
        teamRaces.set(team, list);
      }
    }
  }
  const teams = [...teamRaces.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, races]) => ({ name, races }));

  const raceCount = sections.reduce((n, s) => n + s.races.length, 0);
  const counts = [
    `${raceCount} races`,
    `${teams.length} teams`,
    `${flights.length} ${flights.length === 1 ? "flight" : "flights"}`,
  ].join(" · ");

  return {
    title: input.title,
    subtitle:
      input.subtitle ??
      (sections.length === 1 ? `${sections[0].title} Schedule` : "Race Schedule"),
    summary: [counts, ...(input.notes ?? [])].join("\n"),
    accent: input.accent,
    generated: (input.generated ?? new Date()).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    flights,
    sections,
    teams: input.teams ? teams : [],
  };
}
