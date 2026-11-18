"use client";

// The race schedule as a live table: the same layout as the PDFs from
// scripts/schedule-pdf.ts, but always up to date. Its PDF button opens
// /schedule.pdf (src/app/schedule.pdf/route.ts), rendered from the same races.
import NavBar from "@/components/navbar";
import { Box, Button, Flex, Heading, Skeleton, Text } from "@chakra-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import type { CompetitionId } from "@/competitions";
import { queryClientAtom } from "jotai-tanstack-query";
import { TbFileTypePdf } from "react-icons/tb";
import {
  Flight,
  RaceResult,
  SharedLogic,
  getLeagueName,
  competitionIdAtom,
  queryClient,
  racesAtom,
  useAuth,
  useCompetition,
} from "@/shared";
import sailColours from "@/sail-colours.json";
import styles from "./schedule.module.css";

const COLOURS: Record<string, { fill: string; text: string }> =
  sailColours.colours;

// Header colour for a half, from the first colour word in its name.
function halfColour(name: string) {
  const words = name.toLowerCase().match(/[a-z]+/g) ?? [];
  const word = words.find((w) => w in COLOURS);
  return word ? COLOURS[word] : sailColours.unknown;
}

function ScheduleTable({
  flights,
  races,
}: {
  flights: Flight[];
  races: RaceResult[];
}) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th rowSpan={2} className={styles.raceHeader}>
            Race
          </th>
          {flights.map((f) => (
            <th
              key={f.id}
              colSpan={2}
              className={`${styles.flightHeader} ${styles.flightStart}`}
            >
              {f.name}
            </th>
          ))}
        </tr>
        <tr>
          {flights.flatMap((f) =>
            (
              [
                [f.lname, f.lnumbers],
                [f.rname, f.rnumbers],
              ] as const
            ).map(([name, numbers], side) => {
              const colour = halfColour(name);
              return (
                <th
                  key={`${f.id}-${side}`}
                  className={`${styles.halfHeader} ${side === 0 ? styles.flightStart : ""}`}
                  style={{ background: colour.fill, color: colour.text }}
                >
                  {name}
                  <span>{numbers.join(", ")}</span>
                </th>
              );
            }),
          )}
        </tr>
      </thead>
      <tbody>
        {races.map((r, k) => {
          // A rule above each race where the flights come round again,
          // boxing every rotation like the PDF.
          const flight = flights.findIndex((f) => f.id === r.flight.id);
          const cycleStart =
            k === 0 ||
            flight <= flights.findIndex((f) => f.id === races[k - 1].flight.id);
          return (
            <tr key={r.id} className={cycleStart ? styles.cycleStart : undefined}>
              <td className={styles.raceNumber}>{r.number}</td>
              {flights.flatMap((f, i) => {
                // Only the cells with teams in them are shaded.
                const here = i === flight;
                const team = here ? styles.team : "";
                return [
                  <td key={`${f.id}-l`} className={`${styles.flightStart} ${team}`}>
                    {here ? (r.lteam?.name ?? "TBD") : null}
                  </td>,
                  <td key={`${f.id}-r`} className={`${styles.secondHalf} ${team}`}>
                    {here ? (r.rteam?.name ?? "TBD") : null}
                  </td>,
                ];
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Page() {
  const { isAdmin } = useAuth();
  const competition = useCompetition();
  const { data, isLoading, error } = useAtomValue(racesAtom);
  const races = data?.races ?? [];

  // Leagues and flights in the order they first race.
  const leagues: string[] = [];
  const flights: Flight[] = [];
  const teams = new Set<string>();
  for (const r of races) {
    if (!leagues.includes(r.league)) leagues.push(r.league);
    if (!flights.some((f) => f.id === r.flight.id)) flights.push(r.flight);
    if (r.lteam) teams.add(r.lteam.id);
    if (r.rteam) teams.add(r.rteam.id);
  }

  const subtitle =
    leagues.length === 1
      ? `${getLeagueName(leagues[0])} Schedule`
      : "Race Schedule";

  // The PDF of the leagues shown here (it defaults to just qualifying).
  const pdfHref =
    leagues.length === 0 || (leagues.length === 1 && leagues[0] === "quali")
      ? "/schedule.pdf"
      : `/schedule.pdf?league=${encodeURIComponent(leagues.join(","))}`;

  return (
    <Box minH="100vh">
      <Box className={styles.noPrint} position="sticky" top="0" zIndex="100">
        <NavBar isAdmin={isAdmin} />
      </Box>
      {/* Like the PDFs: A4, landscape once there are 4+ flights. */}
      <style>{`@page { size: A4 ${flights.length >= 4 ? "landscape" : "portrait"}; margin: 12mm; }`}</style>

      <Box className={styles.sheet} maxW="1200px" mx="auto" my={{ base: 0, md: 6 }} p={{ base: 3, md: 6 }}>
        <Flex justify="space-between" align="flex-end" gap={4} mb={4} wrap="wrap">
          <Box>
            <Heading
              as="h1"
              size="2xl"
              color={competition.accentColour}
              textTransform="uppercase"
              letterSpacing="0.12em"
              fontWeight="bold"
            >
              {competition.name}
            </Heading>
            <Text color="gray.600">{subtitle}</Text>
          </Box>
          <Flex direction="column" align="flex-end" gap={2}>
            {races.length > 0 && (
              <Button className={styles.noPrint} size="sm" variant="outline" asChild>
                <a href={pdfHref} target="_blank" rel="noopener">
                  <TbFileTypePdf /> Open PDF
                </a>
              </Button>
            )}
            {races.length > 0 && (
              <Text fontSize="sm" color="gray.600">
                {races.length} races · {teams.size} teams · {flights.length}{" "}
                {flights.length === 1 ? "flight" : "flights"}
              </Text>
            )}
          </Flex>
        </Flex>

        {isLoading ? (
          <Skeleton height="400px" />
        ) : error ? (
          <Text color="red.600">Couldn&apos;t load the schedule.</Text>
        ) : races.length === 0 ? (
          <Text color="gray.600">No races have been scheduled yet.</Text>
        ) : (
          leagues.map((league) => (
            <Box key={league} mb={6}>
              {leagues.length > 1 && (
                <Heading as="h2" size="md" color={competition.accentColour} mb={2}>
                  {getLeagueName(league)}
                </Heading>
              )}
              <Box overflowX="auto">
                <ScheduleTable
                  flights={flights}
                  races={races.filter((r) => r.league === league)}
                />
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}

export default function SchedulePage({
  competitionId,
}: {
  competitionId: CompetitionId;
}) {
  useHydrateAtoms([
    [competitionIdAtom, competitionId],
    [queryClientAtom, queryClient],
  ]);
  return (
    <QueryClientProvider client={queryClient}>
      <SharedLogic />
      <Page />
    </QueryClientProvider>
  );
}
