import { RaceResult } from "@/shared";
import {
  Box,
  Flex,
  Text,
  Input,
  For,
  Heading,
  Grid,
  GridItem,
  Button,
} from "@chakra-ui/react";
import { useState } from "react";
import {
  NumberInputField,
  NumberInputRoot,
} from "@/components/ui/number-input";
import supabase from "@/supabase";

export default function RaceEdit({
  race,
  active,
}: {
  race: RaceResult;
  active: boolean;
}) {
  if (!race.raceteam[0] || !race.raceteam[1]) return <></>;

  const [teamResults, setTeamResults] = useState<(number | null)[][]>([
    race.raceteam[0].result ?? [null, null, null],
    race.raceteam[1].result ?? [null, null, null],
  ]);

  // Update the result for a given team and boat.
  const handleChange = (
    teamIndex: number,
    boatIndex: number,
    value: number | null
  ) => {
    setTeamResults((prev) => {
      const newResults = [teamResults[0].slice(), teamResults[1].slice()];
      newResults[teamIndex][boatIndex] = value;
      return newResults;
    });
  };

  const [isUpdating, setIsUpdating] = useState(false);

  const updateResults = async () => {
    setIsUpdating(true);

    // Make sure all results are filled in
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        if (teamResults[i][j] === null) {
          return;
        }
      }
    }
    const [team1Results, team2Results] = teamResults as number[][];
    console.log({ team1Results, team2Results });

    const update1 = supabase
      .from("raceteam")
      .update({ result: team1Results })
      .eq("team", race.raceteam[0].team.id)
      .eq("race", race.id)
      .select();

    const update2 = supabase
      .from("raceteam")
      .update({ result: team2Results })
      .eq("team", race.raceteam[1].team.id)
      .eq("race", race.id)
      .select();

    const { data: update1Data, error: update1Error } = await update1;
    const { data: update2Data, error: update2Error } = await update2;

    if (update1Error) {
      console.error({ update1Error });
    } else {
      console.log({ update1Data });
    }

    if (update2Error) {
      console.error({ update2Error });
    } else {
      console.log({ update2Data });
    }
  };

  return (
    <>
      <Heading size="2xl">Results</Heading>
      <Box mb={4} borderWidth="1px" borderRadius="md" bg="gray.50">
        <Grid templateColumns="1fr auto 1fr" gap={2} m={4}>
          <GridItem textAlign="center">
            <Text fontSize="sm" fontWeight="bold">
              {race.raceteam[0].halfflight.name}
            </Text>
          </GridItem>
          <GridItem textAlign="center" rowSpan={1} alignSelf="center">
            <Text fontSize="xs" color="gray.600" fontWeight="bold">
              FLIGHT
            </Text>
          </GridItem>
          <GridItem textAlign="center">
            <Text fontSize="sm" fontWeight="bold">
              {race.raceteam[1].halfflight.name}
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
                  <Text fontSize="xs" color="gray.600" fontWeight="bold">
                    Boat {race.raceteam[0].halfflight.numbers[i]}
                  </Text>
                </GridItem>
                <GridItem textAlign="center" key={10 * i + 2}>
                  <NumberInputRoot
                    value={String(teamResults[0][i])}
                    onValueChange={(e) => handleChange(0, i, Number(e.value))}
                  >
                    <NumberInputField />
                  </NumberInputRoot>
                </GridItem>
                <GridItem textAlign="center" key={10 * i + 3}>
                  <NumberInputRoot
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
                  <Text fontSize="xs" color="gray.600" fontWeight="bold">
                    Boat {race.raceteam[1].halfflight.numbers[i]}
                  </Text>
                </GridItem>
              </>
            )}
          </For>
        </Grid>

        <Button
          variant="solid"
          width="100%"
          onClick={() => updateResults()}
          loading={isUpdating}
        >
          Update
        </Button>
      </Box>
      <Heading size="2xl">Drone Recording</Heading>
      <Flex>
        <Box>
          <Input placeholder="Vimeo link" />
        </Box>
        <Box>
          <Button variant="solid">Upload</Button>
        </Box>
      </Flex>
    </>
  );
}
