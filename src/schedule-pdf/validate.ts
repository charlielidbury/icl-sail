// Checks template data posted by a browser (the /scheduler page) before it is
// rendered: the right shape, and sizes no bigger than a real schedule needs.
import type { Colour, ScheduleDocument } from "./document";

export const LIMITS = {
  /** Bytes of JSON accepted at all. */
  bytes: 512 * 1024,
  teams: 60,
  flights: 10,
  /** A full round robin of the most teams. */
  races: (60 * 59) / 2,
  sections: 5,
  /** Characters in a team or boat name. */
  name: 80,
  /** Characters in the title, subtitle, a section title or the date. */
  text: 120,
  summaryLines: 4,
  sailNumbers: 20,
};

/** Bad input, reported to the user as a 400. */
export class InputError extends Error {}

const fail = (message: string): never => {
  throw new InputError(message);
};

function object(v: unknown, what: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) fail(`${what} must be an object`);
  return v as Record<string, unknown>;
}

function array(v: unknown, what: string, max: number): unknown[] {
  if (!Array.isArray(v)) fail(`${what} must be a list`);
  const a = v as unknown[];
  if (a.length > max) fail(`${what} can have at most ${max} entries`);
  return a;
}

function string(v: unknown, what: string, max: number): string {
  if (typeof v !== "string") fail(`${what} must be text`);
  const s = v as string;
  if (s.length > max) fail(`${what} must be at most ${max} characters`);
  return s;
}

function integer(v: unknown, what: string, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    fail(`${what} must be a whole number from ${min} to ${max}`);
  }
  return v as number;
}

function hex(v: unknown, what: string): string {
  if (typeof v !== "string" || !/^#[0-9a-fA-F]{6}$/.test(v)) {
    fail(`${what} must be a colour like #1a2b3c`);
  }
  return v as string;
}

const colour = (o: Record<string, unknown>, what: string): Colour => ({
  fill: hex(o.fill, `${what} colour`),
  text: hex(o.text, `${what} text colour`),
});

/** The template data, checked. Throws InputError saying what's wrong. */
export function parseScheduleDocument(json: string): ScheduleDocument {
  if (json.length > LIMITS.bytes) fail("The schedule is too big");
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    fail("The schedule isn't valid JSON");
  }
  const d = object(raw, "The schedule");

  const flights = array(d.flights, "Flights", LIMITS.flights).map((f, i) => {
    const fo = object(f, `Flight ${i + 1}`);
    const halves = array(fo.halves, `Flight ${i + 1}'s boats`, 2);
    if (halves.length !== 2) fail(`Flight ${i + 1} needs two boats`);
    return {
      name: string(fo.name, `Flight ${i + 1}'s name`, LIMITS.name),
      halves: halves.map((h, j) => {
        const what = `Flight ${i + 1}'s boat ${j + 1}`;
        const ho = object(h, what);
        return {
          name: string(ho.name, `${what}'s name`, LIMITS.name),
          numbers: array(ho.numbers, `${what}'s sail numbers`, LIMITS.sailNumbers).map((n) =>
            integer(n, `${what}'s sail numbers`, 0, 99999),
          ),
          ...colour(ho, what),
        };
      }),
    };
  });
  if (flights.length === 0) fail("There must be at least one flight");

  let raceCount = 0;
  const teamNames = new Set<string>();
  const sections = array(d.sections, "Sections", LIMITS.sections).map((s, i) => {
    const so = object(s, `Section ${i + 1}`);
    const races = array(so.races, "Races", LIMITS.races).map((r) => {
      const ro = object(r, "A race");
      const number = integer(ro.number, "A race number", 1, 100000);
      const race = {
        number,
        flight: integer(ro.flight, `Race ${number}'s flight`, 0, flights.length - 1),
        left: string(ro.left, `Race ${number}'s team`, LIMITS.name),
        right: string(ro.right, `Race ${number}'s team`, LIMITS.name),
      };
      teamNames.add(race.left).add(race.right);
      return race;
    });
    raceCount += races.length;
    return { title: string(so.title, `Section ${i + 1}'s title`, LIMITS.text), races };
  });
  if (raceCount === 0) fail("There are no races");
  if (raceCount > LIMITS.races) fail(`At most ${LIMITS.races} races`);
  if (teamNames.size > LIMITS.teams) fail(`At most ${LIMITS.teams} teams`);

  const teams = array(d.teams ?? [], "Teams", LIMITS.teams).map((t) => {
    const to = object(t, "A team");
    const name = string(to.name, "A team's name", LIMITS.name);
    return {
      name,
      races: array(to.races, `${name}'s races`, LIMITS.races).map((r) => {
        const ro = object(r, `${name}'s race`);
        return {
          number: integer(ro.number, `${name}'s race number`, 1, 100000),
          ...colour(ro, `${name}'s race`),
        };
      }),
    };
  });

  const summary = string(d.summary, "The summary", LIMITS.text * LIMITS.summaryLines);
  if (summary.split("\n").length > LIMITS.summaryLines) {
    fail(`The summary can have at most ${LIMITS.summaryLines} lines`);
  }
  return {
    title: string(d.title, "The title", LIMITS.text),
    subtitle: string(d.subtitle, "The subtitle", LIMITS.text),
    summary,
    accent: hex(d.accent, "The accent colour"),
    generated: string(d.generated, "The date", LIMITS.text),
    flights,
    sections,
    teams,
  };
}
