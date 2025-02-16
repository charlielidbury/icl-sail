import { Box, Flex, Text, Badge } from "@chakra-ui/react";
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RaceResult } from "../shared";

interface RaceCardProps {
  race: RaceResult;
  active: boolean;
  isStand?: boolean;
  search?: string;
}

function highlightText(text: string, search: string) {
  if (!search) return text;
  // Create a case-insensitive regex for the search term.
  const regex = new RegExp(`(${search})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <Box
            key={i}
            as="span"
            textDecoration="underline"
            fontWeight="bold"
          >
            {part}
          </Box>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function RaceCard({ race, active, isStand, search }: RaceCardProps) {
  // Hardcoded light mode values
  const bgColor = "white";
  const borderColor = active ? "red.500" : "gray.200";
  const shadow = active ? "lg" : "md";

  // Prepare team names and results.
  const leftTeamName = race.raceteam[0]?.team.name || "";
  const leftResult = race.raceteam[0]?.result?.join(", ") || "Pending";
  const rightTeamName = race.raceteam[1]?.team.name || "";
  const rightResult = race.raceteam[1]?.result?.join(", ") || "Pending";

  return (
    <Box
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      p={4}
      boxShadow={shadow}
      _hover={{ boxShadow: "xl" }}
      position="relative"
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Text fontSize="lg" fontWeight="bold">
          Race {race.number}
        </Text>
        {active && (
          <Badge fontSize="sm" px={2} py={1} borderRadius="md" bg="green.500" color="white">
            Current Race
          </Badge>
        )}
        {!active && isStand && (
          <Badge fontSize="sm" px={2} py={1} borderRadius="md" bg="red.500" color="white">
            Go to Stand
          </Badge>
        )}
      </Flex>

      {/* Custom Divider */}
      <Box height="1px" bg="gray.200" my={3} />

      <Flex justify="space-between" align="center">
        {race.raceteam[0] && (
          <Box flex="1" mr={2}>
            <Text fontSize="xl" fontWeight="semibold">
              {highlightText(leftTeamName, search || "")}
            </Text>
            <Text fontSize="sm" color="gray.600">
              {highlightText(leftResult, search || "")}
            </Text>
          </Box>
        )}
        <Text fontSize="2xl" fontWeight="bold" color="gray.500" mx={2}>
          vs
        </Text>
        {race.raceteam[1] && (
          <Box flex="1" ml={2} textAlign="right">
            <Text fontSize="xl" fontWeight="semibold">
              {highlightText(rightTeamName, search || "")}
            </Text>
            <Text fontSize="sm" color="gray.600">
              {highlightText(rightResult, search || "")}
            </Text>
          </Box>
        )}
      </Flex>
    </Box>
  );
}

interface RaceProps {
  race: RaceResult;
  active: boolean;
  isStand?: boolean;
  search?: string;
}

export default function Race({ race, active, isStand, search }: RaceProps) {
  return (
    <DialogRoot size="full" motionPreset="slide-in-bottom">
      <DialogTrigger asChild>
        <Box mb={4}>
          <RaceCard race={race} active={active} isStand={isStand} search={search} />
        </Box>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Race {race.number}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <RaceCard race={race} active={active} isStand={isStand} search={search} />
        </DialogBody>
        <DialogFooter>
          <DialogActionTrigger asChild>
            <Box as="button" p={2} borderWidth="1px" borderRadius="md">
              Cancel
            </Box>
          </DialogActionTrigger>
          <Box as="button" p={2} borderWidth="1px" borderRadius="md" ml={2}>
            Save
          </Box>
        </DialogFooter>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  );
}
