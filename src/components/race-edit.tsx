import { RaceResult } from "@/shared";
import { Box, Flex, Text, Badge, For } from "@chakra-ui/react";

export default function RaceEdit({ race }: { race: RaceResult }) {
  return (
    <For each={[0, 1, 2]}>
      {(i) => (
        <Flex justify="space-between" align="center">
          {race.raceteam[0] && (
            <Box flex="1" mr={2}>
              <Text fontSize="xl" fontWeight="semibold">
                {race.raceteam[0].team.name}
              </Text>
            </Box>
          )}
          {race.raceteam[1] && (
            <Box flex="1" ml={2} textAlign="right">
              <Text fontSize="xl" fontWeight="semibold">
                {race.raceteam[1].team.name}
              </Text>
            </Box>
          )}
        </Flex>
      )}
    </For>
  );
}
