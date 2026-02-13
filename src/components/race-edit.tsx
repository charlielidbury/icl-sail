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
import { useEffect, useMemo, useState } from "react";
import {
  NumberInputField,
  NumberInputRoot,
} from "@/components/ui/number-input";
import supabase from "@/supabase";
import dayjs from "dayjs";

export default function RaceEdit({
  race,
  active,
}: {
  race: RaceResult;
  active: boolean;
}) {
  // Uses useEffect to update the team results when the race results are updated.
  // const initialResults = [
  //   race.raceteam[0].result ?? [null, null, null],
  //   race.raceteam[1].result ?? [null, null, null],
  // ];
  const [teamResults, setTeamResults] = useState<(number | null)[][]>([
    race.lresult ?? [null, null, null],
    race.rresult ?? [null, null, null],
  ]);
  useEffect(() => {
    setTeamResults([
      race.lresult ?? [null, null, null],
      race.rresult ?? [null, null, null],
    ]);
  }, [race.lresult, race.rresult]);

  // Calculates the next number
  const nextNumber = useMemo(() => {
    return (
      1 +
      teamResults
        .flatMap((ns) => ns.map((n) => n ?? 0))
        .reduce((a, b) => Math.max(a, b))
    );
  }, [teamResults]);

  const fullResults = useMemo(() => {
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        if (teamResults[i][j] === null) {
          return false;
        }
      }
    }
    return true;
  }, [teamResults]);

  // Update the result for a given team and boat.
  const handleChange = (
    teamIndex: number,
    boatIndex: number,
    value: number | null,
  ) => {
    setTeamResults((prev) => {
      const newResults = [teamResults[0].slice(), teamResults[1].slice()];
      newResults[teamIndex][boatIndex] = value;
      return newResults;
    });
  };

  const modifyResult = async (
    team1Results: number[] | null,
    team2Results: number[] | null,
  ) => {
    // Make sure both teams have results or neither do.
    if ((team1Results === null) !== (team2Results === null)) {
      return;
    }

    await supabase
      .from("race")
      .update({
        finishtime: team1Results ? dayjs().format() : null,
        lresult: team1Results,
        rresult: team2Results,
      })
      .eq("id", race.id)
      .select();
  };

  const [isUpdating, setIsUpdating] = useState(false);
  const updateResults = async () => {
    // Make sure all results are filled in
    if (!fullResults) {
      return;
    }
    const [team1Results, team2Results] = teamResults as number[][];

    setIsUpdating(true);
    await modifyResult(team1Results, team2Results);
    setIsUpdating(false);
  };

  const [isRemoving, setIsRemoving] = useState(false);
  const removeResults = async () => {
    setIsRemoving(true);
    await modifyResult(null, null);
    setIsRemoving(false);
  };

  const raceComplete = race.finishtime !== null;

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
              <>
                <GridItem
                  textAlign="center"
                  rowSpan={1}
                  alignSelf="center"
                  key={10 * i + 1}
                >
                  <Button
                    fontSize="xs"
                    fontWeight="bold"
                    variant="ghost"
                    onClick={() => handleChange(0, i, nextNumber)}
                  >
                    Boat {race.flight.lnumbers[i]}
                  </Button>
                </GridItem>
                <GridItem textAlign="center" key={10 * i + 2}>
                  <NumberInputRoot
                    size="lg"
                    value={String(teamResults[0][i])}
                    onValueChange={(e) => handleChange(0, i, Number(e.value))}
                  >
                    <NumberInputField />
                  </NumberInputRoot>
                </GridItem>
                <GridItem textAlign="center" key={10 * i + 3}>
                  <NumberInputRoot
                    size="lg"
                    value={String(teamResults[1][i])}
                    onValueChange={(e) => handleChange(1, i, Number(e.value))}
                  >
                    <NumberInputField />
                  </NumberInputRoot>
                </GridItem>
                <GridItem
                  textAlign="center"
                  rowSpan={1}
                  alignSelf="center"
                  key={10 * i + 4}
                >
                  <Button
                    fontSize="xs"
                    fontWeight="bold"
                    variant="ghost"
                    onClick={() => handleChange(1, i, nextNumber)}
                  >
                    Boat {race.flight.rnumbers[i]}
                  </Button>
                </GridItem>
              </>
            )}
          </For>
        </Grid>

        <Box textAlign="center" mt={2} mb={4}>
          <Text fontSize="sm" color="gray.500" fontStyle="italic">
            Click the boat numbers as they cross the line.
          </Text>
        </Box>

        <ButtonGroup attached width="100%" variant="outline">
          <Button
            width="50%"
            onClick={() => updateResults()}
            loading={isUpdating}
            disabled={!fullResults}
            mr={0.25}
          >
            {raceComplete ? "Update" : "Submit"}
          </Button>
          <Button
            width="50%"
            onClick={() =>
              raceComplete
                ? removeResults()
                : setTeamResults([
                    [null, null, null],
                    [null, null, null],
                  ])
            }
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
