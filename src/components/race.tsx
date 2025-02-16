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
}

function RaceCard({ race, active, isStand }: RaceCardProps) {
  // Hardcoded light mode values
  const bgColor = "white";
  const borderColor = active ? "red.500" : "gray.200";
  const shadow = active ? "lg" : "md";

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
          <Badge
            fontSize="sm"
            px={2}
            py={1}
            borderRadius="md"
            bg="green.500"
            color="white"
          >
            Current Race
          </Badge>
        )}
        {!active && isStand && (
          <Badge
            fontSize="sm"
            px={2}
            py={1}
            borderRadius="md"
            bg="red.500"
            color="white"
          >
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
              {race.raceteam[0].team.name}
            </Text>
            <Text fontSize="sm" color="gray.600">
              {race.raceteam[0].result?.join(", ") || "Pending"}
            </Text>
          </Box>
        )}
        <Text fontSize="2xl" fontWeight="bold" color="gray.500" mx={2}>
          vs
        </Text>
        {race.raceteam[1] && (
          <Box flex="1" ml={2} textAlign="right">
            <Text fontSize="xl" fontWeight="semibold">
              {race.raceteam[1].team.name}
            </Text>
            <Text fontSize="sm" color="gray.600">
              {race.raceteam[1].result?.join(", ") || "Pending"}
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
}

export default function Race({ race, active, isStand }: RaceProps) {
  return (
    <DialogRoot size="full" motionPreset="slide-in-bottom">
      <DialogTrigger asChild>
        <Box mb={4}>
          <RaceCard race={race} active={active} isStand={isStand} />
        </Box>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Race {race.number}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <RaceCard race={race} active={active} isStand={isStand} />
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
