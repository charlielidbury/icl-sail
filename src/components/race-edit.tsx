import { RaceResult } from "@/shared";
import {
  Box,
  Text,
  For,
  Heading,
  Grid,
  GridItem,
  Button,
  ButtonGroup,
} from "@chakra-ui/react";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  NumberInputField,
  NumberInputRoot,
} from "@/components/ui/number-input";
import supabase from "@/supabase";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";

// What the race officer has typed into each box, before parsing.
type Entries = string[][];

const toEntries = (result: number[] | null): string[] =>
  result?.map(String) ?? ["", "", ""];

// A valid position is a whole number of 1 or more. Numbers above 6 are allowed
// because penalties add points.
const parsePosition = (entry: string): number | null => {
  const n = Number(entry.trim());
  return entry.trim() !== "" && Number.isInteger(n) && n >= 1 ? n : null;
};

const describeFailure = (message: string) =>
  /fetch|network/i.test(message)
    ? "Not saved: couldn't reach the server. Check your connection and try again."
    : `Not saved: ${message}. Check your connection and try again.`;

// Runs a race update and turns every way it can fail into a message for the
// race officer, including RLS silently matching no rows for a non-admin.
export async function saveRace(
  raceId: string,
  update: {
    finishtime?: string | null;
    lresult?: number[] | null;
    rresult?: number[] | null;
    video?: string | null;
  },
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("race")
      .update(update)
      .eq("id", raceId)
      .select("id");
    if (error) {
      return describeFailure(error.message);
    }
    if (!data || data.length === 0) {
      return "Not saved: the change was rejected. Make sure you're logged in as an admin of this competition, then try again.";
    }
    return null;
  } catch (e) {
    return describeFailure(e instanceof Error ? e.message : String(e));
  }
}

export default function RaceEdit({
  race,
  active,
}: {
  race: RaceResult;
  active: boolean;
}) {
  const queryClient = useQueryClient();

  const [entries, setEntries] = useState<Entries>([
    toEntries(race.lresult),
    toEntries(race.rresult),
  ]);
  // Reset the boxes only when the saved result actually changes. Refetches
  // (e.g. after another race is updated) create new arrays with the same
  // values, which must not wipe what the race officer has typed.
  const savedKey = JSON.stringify([race.lresult, race.rresult]);
  useEffect(() => {
    setEntries([toEntries(race.lresult), toEntries(race.rresult)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const positions = useMemo(
    () => entries.map((team) => team.map(parsePosition)),
    [entries],
  );
  const isEmpty = (entry: string) => entry.trim() === "";
  const anyFilled = entries.some((team) => team.some((e) => !isEmpty(e)));
  const anyEmpty = entries.some((team) => team.some(isEmpty));
  const anyInvalid = entries.some((team, i) =>
    team.some((e, j) => !isEmpty(e) && positions[i][j] === null),
  );
  const isValid = !anyEmpty && !anyInvalid;
  // Don't nag about an untouched, empty form.
  const showErrors = anyFilled;
  const validationError = !showErrors
    ? null
    : anyInvalid
      ? "Positions must be whole numbers of 1 or more."
      : anyEmpty
        ? "Every boat needs a position before the result can be saved."
        : null;

  // The number to give the next boat clicked: one more than the highest so far.
  const nextNumber =
    1 +
    positions.flat().reduce<number>((a, b) => Math.max(a, b ?? 0), 0);

  const handleChange = (teamIndex: number, boatIndex: number, value: string) => {
    setSaved(false);
    setEntries((prev) => {
      const next = [prev[0].slice(), prev[1].slice()];
      next[teamIndex][boatIndex] = value;
      return next;
    });
  };

  const save = async (
    lresult: number[] | null,
    rresult: number[] | null,
  ): Promise<boolean> => {
    // The finish time records when the result first came in, so keep it when
    // correcting an existing result.
    const finishtime =
      lresult === null
        ? { finishtime: null }
        : race.finishtime === null
          ? { finishtime: dayjs().format() }
          : {};
    const error = await saveRace(race.id, { ...finishtime, lresult, rresult });
    setSaveError(error);
    setSaved(error === null);
    if (error === null) {
      // Don't rely on the realtime subscription alone on a bad connection.
      queryClient.invalidateQueries({ queryKey: ["races_data"] });
    }
    return error === null;
  };

  const [isUpdating, setIsUpdating] = useState(false);
  const updateResults = async () => {
    if (!isValid) {
      return;
    }
    setIsUpdating(true);
    await save(
      positions[0] as number[],
      positions[1] as number[],
    );
    setIsUpdating(false);
  };

  const [isRemoving, setIsRemoving] = useState(false);
  const removeResults = async () => {
    setIsRemoving(true);
    await save(null, null);
    setIsRemoving(false);
  };

  const raceComplete = race.finishtime !== null;

  const boxInvalid = (teamIndex: number, boatIndex: number) =>
    showErrors && positions[teamIndex][boatIndex] === null;

  return (
    <>
      <Heading size="xl" textAlign="center">
        Results
      </Heading>
      <Box borderWidth="1px" borderRadius="md" bg="white">
        <Grid templateColumns="1fr auto 1fr" gap={2} m={4}>
          <GridItem textAlign="center">
            <Text fontSize="sm" fontWeight="bold">
              {race.flight.lname}
            </Text>
          </GridItem>
          <GridItem textAlign="center" rowSpan={1} alignSelf="center">
            <Text fontSize="xs" color="gray.600" fontWeight="bold">
              FLIGHT
            </Text>
          </GridItem>
          <GridItem textAlign="center">
            <Text fontSize="sm" fontWeight="bold">
              {race.flight.rname}
            </Text>
          </GridItem>
        </Grid>

        <Grid templateColumns="1fr 1fr 1fr 1fr" gap={4} m={4}>
          <For each={[0, 1, 2]}>
            {(i) => (
              <Fragment key={i}>
                <GridItem textAlign="center" rowSpan={1} alignSelf="center">
                  <Button
                    fontSize="xs"
                    fontWeight="bold"
                    variant="ghost"
                    onClick={() => handleChange(0, i, String(nextNumber))}
                  >
                    Boat {race.flight.lnumbers[i]}
                  </Button>
                </GridItem>
                <GridItem textAlign="center">
                  <NumberInputRoot
                    size="lg"
                    value={entries[0][i]}
                    invalid={boxInvalid(0, i)}
                    onValueChange={(e) => handleChange(0, i, e.value)}
                  >
                    <NumberInputField />
                  </NumberInputRoot>
                </GridItem>
                <GridItem textAlign="center">
                  <NumberInputRoot
                    size="lg"
                    value={entries[1][i]}
                    invalid={boxInvalid(1, i)}
                    onValueChange={(e) => handleChange(1, i, e.value)}
                  >
                    <NumberInputField />
                  </NumberInputRoot>
                </GridItem>
                <GridItem textAlign="center" rowSpan={1} alignSelf="center">
                  <Button
                    fontSize="xs"
                    fontWeight="bold"
                    variant="ghost"
                    onClick={() => handleChange(1, i, String(nextNumber))}
                  >
                    Boat {race.flight.rnumbers[i]}
                  </Button>
                </GridItem>
              </Fragment>
            )}
          </For>
        </Grid>

        <Box textAlign="center" mt={2} mb={4} mx={4}>
          {validationError ? (
            <Text fontSize="sm" color="red.600" fontWeight="medium">
              {validationError}
            </Text>
          ) : (
            <Text fontSize="sm" color="gray.500" fontStyle="italic">
              Click the boat numbers as they cross the line.
            </Text>
          )}
        </Box>

        {saveError && (
          <Box
            mx={4}
            mb={4}
            p={3}
            borderWidth="1px"
            borderColor="red.300"
            bg="red.50"
            borderRadius="md"
            role="alert"
          >
            <Text fontSize="sm" color="red.700" fontWeight="medium">
              {saveError}
            </Text>
          </Box>
        )}
        {saved && !saveError && (
          <Box textAlign="center" mb={4}>
            <Text fontSize="sm" color="green.600" fontWeight="medium">
              Saved
            </Text>
          </Box>
        )}

        <ButtonGroup attached width="100%" variant="outline">
          <Button
            width="50%"
            onClick={() => updateResults()}
            loading={isUpdating}
            disabled={!isValid}
            mr={0.25}
          >
            {raceComplete ? "Update" : "Submit"}
          </Button>
          <Button
            width="50%"
            onClick={() => {
              if (raceComplete) {
                removeResults();
              } else {
                setSaveError(null);
                setSaved(false);
                setEntries([
                  ["", "", ""],
                  ["", "", ""],
                ]);
              }
            }}
            loading={isRemoving}
            colorPalette="red"
          >
            {raceComplete ? "Remove Result" : "Clear"}
          </Button>
        </ButtonGroup>
      </Box>
    </>
  );
}
