"use client";

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
import { FaCrown } from "react-icons/fa";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

// Extend Day.js with the relativeTime plugin.
dayjs.extend(relativeTime);

interface RaceCardProps {
  race: RaceResult;
  active: boolean;
  isStand?: boolean;
  search?: string;
}

// Helper function to highlight search term.
function highlightText(text: string, search: string) {
  if (!search) return text;
  const regex = new RegExp(`(${search})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <Box key={i} as="span" textDecoration="underline" fontWeight="bold">
            {part}
          </Box>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// Helper to format finish time.
// If the finish time is today or yesterday, show relative time ("Today, HH:mm:ss"/"Yesterday, HH:mm:ss").
// Otherwise, show the full date/time in "DD/MM/YYYY, HH:mm:ss" format.
// If the finish time is invalid, return an empty string.
function formatFinishTime(finishTime: dayjs.Dayjs | null): string {
  if (!finishTime || !finishTime.isValid()) return "";
  const now = dayjs();
  const diffDays = now.diff(finishTime, "day");
  const timeFormatted = finishTime.format("HH:mm:ss");
  if (diffDays === 0) return `Today, ${timeFormatted}`;
  if (diffDays === 1) return `Yesterday, ${timeFormatted}`;
  return finishTime.format("DD/MM/YYYY, HH:mm:ss");
}

const sumResult = (result: number[] | null): number =>
  result ? result.reduce((acc, val) => acc + val, 0) : 0;

function RaceCard({ race, active, isStand, search }: RaceCardProps) {
  // Hardcoded light mode styling.
  const bgColor = "white";
  const borderColor = active ? "red.500" : "gray.200";
  const shadow = active ? "lg" : "md";

  // Prepare team names and results.
  const leftTeamName = race.raceteam[0]?.team.name || "";
  const rightTeamName = race.raceteam[1]?.team.name || "";
  const leftResultStr = race.raceteam[0]?.result?.join(", ") || "Pending";
  const rightResultStr = race.raceteam[1]?.result?.join(", ") || "Pending";

  // Compute scores if available.
  const leftScore =
    race.raceteam[0]?.result !== null ? sumResult(race.raceteam[0].result) : null;
  const rightScore =
    race.raceteam[1]?.result !== null ? sumResult(race.raceteam[1].result) : null;

  // Determine winners (lower score wins).
  const leftIsWinner =
    leftScore !== null && rightScore !== null && leftScore < rightScore;
  const rightIsWinner =
    leftScore !== null && rightScore !== null && rightScore < leftScore;

  let headerBadge = null;
  if (active) {
    headerBadge = (
      <Badge fontSize="sm" px={2} py={1} borderRadius="md" bg="green.500" color="white">
        Current Race
      </Badge>
    );
  } else if (isStand) {
    headerBadge = (
      <Badge fontSize="sm" px={2} py={1} borderRadius="md" bg="red.500" color="white">
        Go to Stand
      </Badge>
    );
  } else {
    headerBadge = (
      <Text fontSize="sm" px={2} py={1} color="gray.500">
        {formatFinishTime(race.finishtime)}
      </Text>
    )
  }

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
        {headerBadge}
      </Flex>

      <Box height="1px" bg="gray.200" my={3} />

      <Flex justify="space-between" align="center">
        {race.raceteam[0] && (
          <Box flex="1" mr={2}>
            <Text fontSize="xl" fontWeight="semibold">
              {highlightText(leftTeamName, search || "")}
            </Text>
            <Text fontSize="sm" color="gray.600">
              {highlightText(leftResultStr, search || "")}
              {leftIsWinner && (
                <Box as="span" ml={1} color="#B59410" display="inline-flex" verticalAlign="middle">
                  <FaCrown />
                </Box>
              )}
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
              {rightIsWinner && (
                <Box as="span" mr={1} color="#B59410" display="inline-flex" verticalAlign="middle">
                  <FaCrown />
                </Box>
              )}
              {highlightText(rightResultStr, search || "")}
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
