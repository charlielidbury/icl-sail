// A generated schedule as the printable schedule document: the data for the
// same Typst template as the competition schedule PDFs. The page posts it to
// /scheduler/pdf (./pdf/route.ts), which renders it on the server.
import type { Report, Schedule } from "@/scheduler/types";
import { buildScheduleDocument, type ScheduleDocument } from "@/schedule-pdf/document";
import type { BoatLabel } from "./schedule-table";

/** The site's default accent colour, as on most competitions. */
const ACCENT = "#004a79";

export type PdfLabels = { title: string; teamNames: string[]; boats: BoatLabel[] };

/** When teams are all level, as a line for the summary (or null if never). */
function levelNote(report: Report): string | null {
  const until = report.breakpointsEveryNUntil;
  if (until === 0) return null;
  return until === report.nRaces
    ? `Teams level every ${report.nTeams} races, to the end`
    : `Teams level every ${report.nTeams} races until race ${until}`;
}

export function schedulerDocument(
  schedule: Schedule,
  report: Report,
  labels: PdfLabels,
): ScheduleDocument {
  const { nFlights } = schedule;
  const level = levelNote(report);
  return buildScheduleDocument({
    title: labels.title || "Race Schedule",
    subtitle: "Round Robin",
    accent: ACCENT,
    flights: Array.from({ length: nFlights }, (_, f) => ({
      name: `Flight ${f + 1}`,
      halves: [labels.boats[2 * f], labels.boats[2 * f + 1]].map((b) => ({
        name: b.name,
        numbers: [],
        ...b.colour,
      })),
    })),
    sections: [
      {
        title: "Round Robin",
        races: schedule.races.map(([a, b], i) => ({
          number: i + 1,
          flight: i % nFlights,
          left: labels.teamNames[a],
          right: labels.teamNames[b],
        })),
      },
    ],
    notes: level ? [level] : [],
  });
}
