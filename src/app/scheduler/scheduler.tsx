"use client";

// Public schedule generator: enter teams and flights, make a team-racing round
// robin in the browser (the scheduler runs in a Web Worker), then download it
// as a CSV or print it. Standalone: no competition, no Supabase.
import {
  Alert,
  Box,
  Button,
  Collapsible,
  Container,
  Fieldset,
  Flex,
  Heading,
  Icon,
  Input,
  Link,
  Progress,
  SegmentGroup,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TbChevronDown,
  TbDownload,
  TbPlayerStopFilled,
  TbPrinter,
  TbSailboat,
  TbSelector,
} from "react-icons/tb";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import type { Report, Schedule, WorkerRequest, WorkerResponse } from "@/scheduler/types";
import {
  type Boat,
  COLOUR_NAMES,
  MAX_FLIGHTS,
  MAX_STINT,
  MAX_TEAMS,
  MAX_TIME_LIMIT_S,
  boatColour,
  boatName,
  capitalise,
  colourWordIn,
  defaultBoatName,
  duplicates,
  genericTeamNames,
  parseIntIn,
  parseSeconds,
  parseTeamNames,
  plural,
  raceCount,
  scheduleCsv,
  shuffled,
  slug,
  testedNote,
} from "./lib";
import { Quality } from "./quality";
import { type BoatLabel, ScheduleTable } from "./schedule-table";
import styles from "./scheduler.module.css";

// The scheduler worker. To use the real one, change this line to
//   new Worker(new URL("../../scheduler/worker.ts", import.meta.url), { type: "module" })
const createWorker = () => new Worker(new URL("./mock-worker.ts", import.meta.url), { type: "module" });

const REPO = "https://github.com/Ninjamouse-1000/team_race_scheduler";

type Form = {
  title: string;
  teamMode: "names" | "count";
  namesText: string;
  teamCount: string;
  flights: string;
  /** Two per flight, for up to MAX_FLIGHTS flights; only the first 2F are used. */
  boats: Boat[];
  seed: string;
  timeLimit: string;
  maxStint: string;
  shuffle: boolean;
};

const DEFAULT_FORM: Form = {
  title: "",
  teamMode: "names",
  namesText: "",
  teamCount: "10",
  flights: "1",
  boats: Array.from({ length: 2 * MAX_FLIGHTS }, (_, i) => ({
    name: defaultBoatName(i),
    colour: "",
  })),
  seed: "0",
  timeLimit: "30",
  maxStint: "2",
  shuffle: false,
};

/** Everything that changes the schedule itself (names only label it). */
type Settings = {
  nTeams: number;
  nFlights: number;
  maxStint: number;
  seed: number;
  timeLimitMs: number;
};

type Labels = { title: string; teamNames: string[]; boats: BoatLabel[] };

type Result = {
  schedule: Schedule;
  report: Report;
  elapsedMs: number;
  key: string;
  /** The labels when it was generated, used if the settings change since. */
  labels: Labels;
};

type Run =
  | { status: "idle" }
  | { status: "cancelled" }
  | { status: "error"; message: string }
  | {
      status: "running";
      message: string;
      fraction?: number;
      startedAt: number;
      timeLimitMs: number;
    };

const keyOf = (s: Settings) => JSON.stringify(s);

/** A boat name is "automatic" (and gets renamed when a colour is picked) if
 *  it's blank, the default, or just a colour. */
const isAutoName = (name: string, i: number) => {
  const n = name.trim().toLowerCase();
  return !n || n === defaultBoatName(i).toLowerCase() || COLOUR_NAMES.includes(n);
};

function useForm() {
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const set = useCallback(
    <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value })),
    [],
  );
  const setBoat = useCallback((i: number, boat: Boat) => {
    setForm((f) => ({ ...f, boats: f.boats.map((b, j) => (j === i ? boat : b)) }));
  }, []);
  return { form, set, setBoat };
}

function check(form: Form) {
  const count = parseIntIn(form.teamCount, 3, MAX_TEAMS);
  const names =
    form.teamMode === "names" ? parseTeamNames(form.namesText) : count ? genericTeamNames(count) : [];
  const nTeams = names.length;

  let teamError: string | null = null;
  if (form.teamMode === "count") {
    if (count === null) teamError = `Enter a whole number from 3 to ${MAX_TEAMS}.`;
  } else if (nTeams > 0 && nTeams < 3) {
    teamError = "Enter at least 3 teams.";
  } else if (nTeams > MAX_TEAMS) {
    teamError = `At most ${MAX_TEAMS} teams.`;
  } else {
    const dups = duplicates(names);
    if (dups.length) teamError = `Each team needs a different name: ${dups.join(", ")}.`;
  }

  const nFlights = parseIntIn(form.flights, 1, MAX_FLIGHTS);
  let flightError: string | null = null;
  if (nFlights === null) flightError = `Enter a whole number from 1 to ${MAX_FLIGHTS}.`;
  else if (nTeams >= 3 && 2 * nFlights >= nTeams) {
    const most = Math.floor((nTeams - 1) / 2);
    flightError = `Flights must be fewer than half the teams: ${nTeams} teams can use at most ${plural(most, "flight")}.`;
  }

  const seed = parseIntIn(form.seed, 0, 2 ** 31 - 1);
  const timeLimit = parseSeconds(form.timeLimit, MAX_TIME_LIMIT_S);
  const maxStint = parseIntIn(form.maxStint, 1, MAX_STINT);

  const settings: Settings | null =
    nTeams >= 3 && !teamError && nFlights && !flightError && seed !== null && timeLimit && maxStint
      ? { nTeams, nFlights, maxStint, seed, timeLimitMs: Math.round(timeLimit * 1000) }
      : null;

  return { names, nTeams, nFlights, teamError, flightError, seed, timeLimit, maxStint, settings };
}

function labelsFor(form: Form, names: string[], s: Settings): Labels {
  return {
    title: form.title.trim(),
    teamNames: form.shuffle ? shuffled(names, s.seed) : names,
    boats: form.boats.slice(0, 2 * s.nFlights).map((b, i) => ({
      name: boatName(b, i),
      colour: boatColour(b, i),
    })),
  };
}

/** A sail-coloured swatch that opens a colour picker (a native select). */
function ColourPicker({
  boat,
  index,
  onChange,
  disabled,
}: {
  boat: Boat;
  index: number;
  onChange: (colour: string) => void;
  disabled: boolean;
}) {
  const colour = boatColour(boat, index);
  const auto = colourWordIn(boatName(boat, index));
  return (
    <Flex
      position="relative"
      flexShrink={0}
      w="10"
      align="center"
      justify="center"
      bg={colour.fill}
      color={colour.text}
      borderWidth="1px"
      borderColor="border.emphasized"
      borderStartRadius="l2"
      borderEndWidth="0"
      css={{ printColorAdjust: "exact" }}
    >
      <TbSelector />
      <select
        aria-label={`Sail colour for ${boatName(boat, index)}`}
        value={boat.colour}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          cursor: disabled ? "not-allowed" : "pointer",
          width: "100%",
        }}
      >
        <option value="">Auto{auto ? ` (${auto})` : " (no colour)"}</option>
        {COLOUR_NAMES.map((c) => (
          <option key={c} value={c}>
            {capitalise(c)}
          </option>
        ))}
      </select>
    </Flex>
  );
}

function BoatInput({
  boat,
  index,
  onChange,
  disabled,
}: {
  boat: Boat;
  index: number;
  onChange: (boat: Boat) => void;
  disabled: boolean;
}) {
  return (
    <Flex>
      <ColourPicker
        boat={boat}
        index={index}
        disabled={disabled}
        onChange={(colour) =>
          onChange({
            colour,
            name: colour && isAutoName(boat.name, index) ? capitalise(colour) : boat.name,
          })
        }
      />
      <Input
        size="sm"
        h="9"
        borderStartRadius="0"
        value={boat.name}
        placeholder={defaultBoatName(index)}
        aria-label={`Name of boat ${index % 2 ? "b" : "a"} on flight ${Math.floor(index / 2) + 1}`}
        onChange={(e) =>
          // Typing a colour word lets the name pick the colour again.
          onChange({
            name: e.target.value,
            colour: colourWordIn(e.target.value) ? "" : boat.colour,
          })
        }
      />
    </Flex>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box bg="bg" borderWidth="1px" borderRadius="lg" p={{ base: 4, md: 5 }}>
      <Heading as="h2" size="md" mb={3}>
        {title}
      </Heading>
      {children}
    </Box>
  );
}

function Credit() {
  return (
    <Text fontSize="xs" color="fg.muted">
      Scheduling algorithm by Henry Hollingworth (
      <Link href={REPO} target="_blank" rel="noopener noreferrer" color="blue.600">
        team_race_scheduler
      </Link>
      , MIT)
    </Text>
  );
}

export default function Scheduler() {
  const { form, set, setBoat } = useForm();
  const v = check(form);

  const [run, setRun] = useState<Run>({ status: "idle" });
  const [result, setResult] = useState<Result | null>(null);
  const [now, setNow] = useState(0);
  const running = run.status === "running";

  const workerRef = useRef<Worker | null>(null);
  const activeId = useRef(0); // id of the request we're waiting on; 0 = none
  const nextId = useRef(0);
  const pending = useRef<{ key: string; labels: Labels } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const startWorker = useCallback(() => {
    const w = createWorker();
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.id !== activeId.current) return; // from a cancelled run
      if (msg.type === "progress") {
        setRun((r) =>
          r.status === "running" ? { ...r, message: msg.message, fraction: msg.fraction } : r,
        );
      } else if (msg.type === "done") {
        activeId.current = 0;
        const p = pending.current;
        if (!p) return;
        setResult({
          schedule: msg.schedule,
          report: msg.report,
          elapsedMs: msg.elapsedMs,
          key: p.key,
          labels: p.labels,
        });
        setRun({ status: "idle" });
        requestAnimationFrame(() =>
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
      } else if (msg.type === "error") {
        activeId.current = 0;
        setRun({ status: "error", message: msg.message });
      }
    };
    // The worker failed to load or crashed: report it and start a fresh one.
    w.onerror = (e) => {
      e.preventDefault();
      const wasRunning = activeId.current !== 0;
      activeId.current = 0;
      w.terminate();
      if (workerRef.current === w) workerRef.current = null;
      if (wasRunning) {
        setRun({
          status: "error",
          message: `The scheduler stopped unexpectedly${e.message ? ` (${e.message})` : ""}. Please try again.`,
        });
      }
    };
    workerRef.current = w;
    return w;
  }, []);

  useEffect(() => {
    startWorker();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [startWorker]);

  // Tick the elapsed time while running.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  const generate = () => {
    const s = v.settings;
    if (!s || running) return;
    const id = ++nextId.current;
    activeId.current = id;
    pending.current = { key: keyOf(s), labels: labelsFor(form, v.names, s) };
    const startedAt = Date.now();
    setNow(startedAt);
    setRun({ status: "running", message: "Starting…", startedAt, timeLimitMs: s.timeLimitMs });
    const req: WorkerRequest = { type: "generate", id, ...s };
    (workerRef.current ?? startWorker()).postMessage(req);
  };

  const cancel = () => {
    activeId.current = 0;
    workerRef.current?.terminate();
    startWorker();
    setRun({ status: "cancelled" });
  };

  // Names and boats are only labels, so apply edits to them straight away
  // unless the settings that shape the schedule have changed since.
  const key = v.settings && keyOf(v.settings);
  const stale = result !== null && key !== result.key;
  const labels = !result
    ? null
    : stale || !v.settings
      ? result.labels
      : labelsFor(form, v.names, v.settings);

  const downloadCsv = () => {
    if (!result || !labels) return;
    const csv = scheduleCsv(
      result.schedule,
      labels.teamNames,
      labels.boats.map((b) => b.name),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    const { nTeams, nFlights } = result.schedule;
    a.download = `${slug(labels.title) || "schedule"}-${nTeams}x${nFlights}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const shownFlights = v.nFlights ?? Math.min(MAX_FLIGHTS, Math.max(1, parseInt(form.flights) || 1));
  const warning = v.settings && testedNote(v.settings.nTeams, v.settings.nFlights);
  const elapsed = run.status === "running" ? Math.max(0, now - run.startedAt) : 0;

  return (
    <Box minH="100vh" bg={{ base: "gray.50", _dark: "gray.950" }} className={styles.page}>
      {result && (
        // Like the PDFs: A4, landscape once there are 4+ flights.
        <style>{`@page { size: A4 ${result.schedule.nFlights >= 4 ? "landscape" : "portrait"}; margin: 12mm; }
@media print { body { background: #fff !important; } }`}</style>
      )}

      <Box as="header" className={styles.noPrint} bg="bg" borderBottomWidth="1px">
        <Container maxW="5xl" py={{ base: 3, md: 4 }} px={{ base: 4, md: 6 }}>
          <Flex align="center" gap={2}>
            <Icon as={TbSailboat} boxSize={6} color="blue.600" flexShrink={0} />
            <Heading as="h1" size={{ base: "lg", md: "xl" }}>
              iSail Schedule Generator
            </Heading>
          </Flex>
          <Text fontSize="sm" color="fg.muted" mt={1}>
            Make a team racing round robin for any number of teams and flights. It runs in your
            browser; download it as a CSV or print it.
          </Text>
        </Container>
      </Box>

      <Container maxW="5xl" py={{ base: 4, md: 6 }} px={{ base: 4, md: 6 }}>
        <Stack gap={4} className={styles.noPrint}>
          <Fieldset.Root disabled={running} minW={0}>
            <Stack gap={4}>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} alignItems="start">
                <Card title="Teams">
                  <Stack gap={3}>
                    <SegmentGroup.Root
                      size="sm"
                      value={form.teamMode}
                      disabled={running}
                      onValueChange={(e) => e.value && set("teamMode", e.value as Form["teamMode"])}
                    >
                      <SegmentGroup.Indicator />
                      <SegmentGroup.Items
                        items={[
                          { value: "names", label: "Team names" },
                          { value: "count", label: "Number of teams" },
                        ]}
                      />
                    </SegmentGroup.Root>

                    {form.teamMode === "names" ? (
                      <Field
                        label="One team per line"
                        invalid={!!v.teamError}
                        errorText={v.teamError}
                        helperText={
                          v.teamError
                            ? undefined
                            : v.nTeams === 0
                              ? "Blank lines are ignored."
                              : `${plural(v.nTeams, "team")} · ${plural(raceCount(v.nTeams), "race")}`
                        }
                      >
                        <Textarea
                          value={form.namesText}
                          onChange={(e) => set("namesText", e.target.value)}
                          rows={9}
                          autoresize
                          maxH="20lh"
                          placeholder={"Imperial 1\nImperial 2\nSouthampton\nBristol\n…"}
                          spellCheck={false}
                        />
                      </Field>
                    ) : (
                      <Field
                        label="Number of teams"
                        invalid={!!v.teamError}
                        errorText={v.teamError}
                        helperText={
                          v.teamError
                            ? undefined
                            : `Team 1 to Team ${v.nTeams} · ${plural(raceCount(v.nTeams), "race")}`
                        }
                      >
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={3}
                          max={MAX_TEAMS}
                          value={form.teamCount}
                          onChange={(e) => set("teamCount", e.target.value)}
                        />
                      </Field>
                    )}
                  </Stack>
                </Card>

                <Card title="Flights">
                  <Stack gap={3}>
                    <Field
                      label="Number of flights"
                      invalid={!!v.flightError}
                      errorText={v.flightError}
                      helperText={
                        v.flightError
                          ? undefined
                          : "A flight is a pair of boats. Races take turns on each flight."
                      }
                    >
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_FLIGHTS}
                        value={form.flights}
                        onChange={(e) => set("flights", e.target.value)}
                      />
                    </Field>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={1}>
                        Boats
                      </Text>
                      <Text fontSize="xs" color="fg.muted" mb={2}>
                        Name each flight&apos;s two boats; the swatch picks a sail colour (a colour
                        in the name works too).
                      </Text>
                      <Stack gap={2}>
                        {Array.from({ length: shownFlights }, (_, f) => (
                          <Box key={f}>
                            <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={1}>
                              Flight {f + 1}
                            </Text>
                            <SimpleGrid columns={2} gap={2}>
                              {[2 * f, 2 * f + 1].map((i) => (
                                <BoatInput
                                  key={i}
                                  boat={form.boats[i]}
                                  index={i}
                                  disabled={running}
                                  onChange={(b) => setBoat(i, b)}
                                />
                              ))}
                            </SimpleGrid>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </Card>
              </SimpleGrid>

              <Box bg="bg" borderWidth="1px" borderRadius="lg" p={{ base: 4, md: 5 }}>
                <Stack gap={4}>
                  <Field
                    label="Event name (optional)"
                    helperText="Printed as the schedule's title and used for the file name."
                  >
                    <Input
                      value={form.title}
                      onChange={(e) => set("title", e.target.value)}
                      placeholder="Race Schedule"
                    />
                  </Field>

                  <Collapsible.Root>
                    <Collapsible.Trigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        px={2}
                        ml={-2}
                        _expanded={{ bg: "transparent" }}
                        css={{ "&[data-state=open] .chev": { transform: "rotate(180deg)" } }}
                      >
                        Advanced <TbChevronDown className="chev" />
                      </Button>
                    </Collapsible.Trigger>
                    <Collapsible.Content>
                      <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4} pt={3}>
                        <Field
                          label="Seed"
                          invalid={v.seed === null}
                          errorText="A whole number, 0 or more."
                          helperText={v.seed === null ? undefined : "Same seed and settings, same schedule."}
                        >
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={form.seed}
                            onChange={(e) => set("seed", e.target.value)}
                          />
                        </Field>
                        <Field
                          label="Time limit (seconds)"
                          invalid={v.timeLimit === null}
                          errorText={`More than 0, at most ${MAX_TIME_LIMIT_S}.`}
                          helperText={v.timeLimit === null ? undefined : "Longer can find a better schedule."}
                        >
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={1}
                            max={MAX_TIME_LIMIT_S}
                            value={form.timeLimit}
                            onChange={(e) => set("timeLimit", e.target.value)}
                          />
                        </Field>
                        <Field
                          label="Max stint"
                          invalid={v.maxStint === null}
                          errorText={`A whole number from 1 to ${MAX_STINT}.`}
                          helperText={
                            v.maxStint === null ? undefined : "Most races in a row a team stays in one boat."
                          }
                        >
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={MAX_STINT}
                            value={form.maxStint}
                            onChange={(e) => set("maxStint", e.target.value)}
                          />
                        </Field>
                      </SimpleGrid>
                      <Checkbox
                        mt={4}
                        size="sm"
                        checked={form.shuffle}
                        disabled={running}
                        onCheckedChange={(e) => set("shuffle", e.checked === true)}
                      >
                        Shuffle the team order (using the seed)
                      </Checkbox>
                    </Collapsible.Content>
                  </Collapsible.Root>
                </Stack>
              </Box>
            </Stack>
          </Fieldset.Root>

          {warning && !running && (
            <Alert.Root status="warning" size="sm">
              <Alert.Indicator />
              <Alert.Description>{warning}</Alert.Description>
            </Alert.Root>
          )}

          {run.status === "running" ? (
            <Box bg="bg" borderWidth="1px" borderRadius="lg" p={{ base: 4, md: 5 }}>
              <Flex justify="space-between" align="center" gap={3} mb={2}>
                <Text fontSize="sm" fontWeight="medium" aria-live="polite">
                  {run.message}
                </Text>
                <Text fontSize="sm" color="fg.muted" flexShrink={0} fontVariantNumeric="tabular-nums">
                  {Math.floor(elapsed / 1000)}s / {Math.round(run.timeLimitMs / 1000)}s
                </Text>
              </Flex>
              <Progress.Root
                size="sm"
                colorPalette="blue"
                max={100}
                value={Math.round(
                  100 * Math.min(1, run.fraction ?? elapsed / run.timeLimitMs),
                )}
              >
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
              <Button mt={3} size="sm" variant="outline" colorPalette="red" onClick={cancel}>
                <TbPlayerStopFilled /> Cancel
              </Button>
            </Box>
          ) : (
            <Flex align="center" gap={3} wrap="wrap">
              <Button
                colorPalette="blue"
                size="lg"
                w={{ base: "full", sm: "auto" }}
                disabled={!v.settings}
                onClick={generate}
              >
                {result ? "Generate again" : "Generate schedule"}
              </Button>
              <Text fontSize="sm" color="fg.muted">
                {v.settings
                  ? `${plural(raceCount(v.settings.nTeams), "race")}: ${v.settings.nTeams} teams on ${plural(v.settings.nFlights, "flight")}`
                  : v.nTeams < 3 && !v.teamError
                    ? "Enter at least 3 teams to start."
                    : "Fix the highlighted fields to start."}
              </Text>
            </Flex>
          )}

          {run.status === "error" && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Couldn&apos;t make a schedule</Alert.Title>
                <Alert.Description>{run.message}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}
          {run.status === "cancelled" && (
            <Text fontSize="sm" color="fg.muted">
              Cancelled.
            </Text>
          )}
        </Stack>

        {result && labels && (
          <Box
            ref={resultsRef}
            mt={6}
            scrollMarginTop={4}
            className={styles.sheet}
            borderWidth="1px"
            borderRadius="lg"
            p={{ base: 3, md: 6 }}
          >
            {stale && (
              <Alert.Root status="info" size="sm" mb={4} className={styles.noPrint}>
                <Alert.Indicator />
                <Alert.Description>
                  The settings have changed since this schedule was made. Generate again to
                  update it.
                </Alert.Description>
              </Alert.Root>
            )}
            <Flex justify="space-between" align="flex-end" gap={3} mb={4} wrap="wrap">
              <Box>
                <Heading as="h2" size="2xl" textTransform="uppercase" letterSpacing="0.08em">
                  {labels.title || "Race Schedule"}
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  {plural(result.schedule.races.length, "race")} · {result.schedule.nTeams} teams ·{" "}
                  {plural(result.schedule.nFlights, "flight")}
                </Text>
              </Box>
              <Flex gap={2} wrap="wrap" className={styles.noPrint}>
                <Button size="sm" variant="outline" onClick={downloadCsv}>
                  <TbDownload /> Download CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <TbPrinter /> Print / Save as PDF
                </Button>
              </Flex>
            </Flex>

            <Box className={styles.noPrint} mb={4}>
              <Quality report={result.report} elapsedMs={result.elapsedMs} />
            </Box>

            <Box overflowX="auto" className={styles.scroll}>
              <ScheduleTable
                schedule={result.schedule}
                teamNames={labels.teamNames}
                boats={labels.boats}
              />
            </Box>

            <Box className={styles.printOnly} mt={3}>
              <Credit />
            </Box>
          </Box>
        )}

        <Box as="footer" mt={8} pb={6} textAlign="center" className={styles.noPrint}>
          <Credit />
        </Box>
      </Container>
    </Box>
  );
}
