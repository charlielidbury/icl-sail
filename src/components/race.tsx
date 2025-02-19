"use client";

import { Box, Flex, Text, Badge, Grid, GridItem } from "@chakra-ui/react";
import {
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
import RaceDialog from "./race-dialog";

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

const sumResult = (result: number[] | null): number =>
  result ? result.reduce((acc, val) => acc + val, 0) : 0;

function formatFinishTime(finishTime: dayjs.Dayjs | null): string {
  if (!finishTime || !finishTime.isValid()) return "";
  const now = dayjs();
  const diffDays = now.diff(finishTime, "day");
  const timeFormatted = finishTime.format("HH:mm");
  if (diffDays === 0) return `Today, ${timeFormatted}`;
  if (diffDays === 1) return `Yesterday, ${timeFormatted}`;
  return finishTime.format("DD/MM/YYYY, HH:mm");
}

function RaceCard({ race, active, isStand, search }: RaceCardProps) {
  // Styling for light mode.
  const bgColor = "white";
  const borderColor = active ? "green.500" : "gray.200";
  const shadow = active ? "lg" : "md";

  if (!race.raceteam[0] || !race.raceteam[1]) return <></>;

  // Extract team names and result strings.
  const leftTeamName = race.raceteam[0].team.name || "";
  const rightTeamName = race.raceteam[1].team.name || "";
  const leftSubStr =
    race.raceteam[0].result?.join(", ") ||
    `in ${
      race.raceteam[0].halfflight.name
    } (${race.raceteam[0].halfflight.numbers.join(",")})`;
  const rightSubStr =
    race.raceteam[1].result?.join(", ") ||
    `in ${
      race.raceteam[1].halfflight.name
    } (${race.raceteam[1].halfflight.numbers.join(",")})`;

  // Compute scores if available.
  const leftScore =
    race.raceteam[0]?.result !== null
      ? sumResult(race.raceteam[0].result)
      : null;
  const rightScore =
    race.raceteam[1]?.result !== null
      ? sumResult(race.raceteam[1].result)
      : null;

  // Determine winners (lower score wins).
  const leftIsWinner =
    leftScore !== null && rightScore !== null && leftScore < rightScore;
  const rightIsWinner =
    leftScore !== null && rightScore !== null && rightScore < leftScore;

  // Header badge: if finish time exists, display formatted finish time; otherwise "Current Race" or "Go to Stand".
  let headerBadge = null;

  if (active) {
    headerBadge = (
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
    );
  } else if (isStand) {
    headerBadge = (
      <Badge
        fontSize="sm"
        px={2}
        py={1}
        borderRadius="md"
        bg="red.500"
        color="white"
      >
        Go to Pontoon
      </Badge>
    );
  } else if (race.finishtime) {
    headerBadge = (
      <Text fontSize="sm" px={2} py={1} borderRadius="md" color="gray.500">
        {race.finishtime.isValid() ? formatFinishTime(race.finishtime) : ""}
      </Text>
    );
  }

  return (
    <Box
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      boxShadow={shadow}
      borderRadius="md"
      _hover={{ boxShadow: "lg" }}
      position="relative"
    >
      <Box m={4}>
        {/* HEADER */}
        <Flex justify="space-between" align="center" mb={3}>
          <Text fontSize="lg" fontWeight="bold">
            Race {race.number}
          </Text>
          {headerBadge}
        </Flex>
        {/* DIVIDER */}
        <Box height="1px" bg="gray.200" my={3} />
        {/* RACE DETAILS */}

        <Grid templateColumns="1fr auto 1fr" gap={2}>
          {/* Row 1: Team A vs Team B */}
          <GridItem textAlign="left" alignSelf="center">
            <Text fontSize="xl" fontWeight="semibold">
              {highlightText(leftTeamName, search || "")}
            </Text>
          </GridItem>
          <GridItem
            rowSpan={2}
            alignSelf="center"
            display="flex"
            alignItems="center"
            mx={2}
          >
            <Text fontSize="2xl" color="gray.500">
              vs
            </Text>
          </GridItem>
          <GridItem textAlign="right" alignSelf="center">
            <Text fontSize="xl" fontWeight="semibold">
              {highlightText(rightTeamName, search || "")}
            </Text>
          </GridItem>
          {/* Row 2: Flight A       Flight B or 1,2,3      4,5,6 */}
          <GridItem textAlign="left">
            <Text fontSize="sm" color="gray.600">
              {leftSubStr}
              {leftIsWinner && (
                <Box
                  as="span"
                  ml={1}
                  color="#B59410"
                  display="inline-flex"
                  verticalAlign="middle"
                >
                  <FaCrown />
                </Box>
              )}
            </Text>
          </GridItem>
          <GridItem textAlign="right">
            <Text fontSize="sm" color="gray.600">
              {rightIsWinner && (
                <Box
                  as="span"
                  mr={1}
                  color="#B59410"
                  display="inline-flex"
                  verticalAlign="middle"
                >
                  <FaCrown />
                </Box>
              )}
              {rightSubStr}
            </Text>
          </GridItem>
        </Grid>

        <Flex justify="space-between" align="center">
          <Box flex="1" mr={2}></Box>
          <Box flex="1" ml={2} textAlign="right"></Box>
        </Flex>
      </Box>

      <Box>
        {race.video ? (
          <Box mt={3} borderRadius={"none"}>
            <Badge
              w="full"
              display="flex"
              justifyContent="center"
              textAlign="center"
              fontSize="xxs"
              pt="2"
              pb="2"
              fontWeight={"bold"}
              bg="#004a79"
              color="white"
              borderTopRadius="none"
              borderBottomLeftRadius="md"
              borderBottomRightRadius="md"
            >
              DRONE FOOTAGE AVAILABLE
            </Badge>
          </Box>
        ) : (
          <Box pb="2" />
        )}
      </Box>
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
  // const showRace =
  //   !search ||
  //   `${race.number} ${race.raceteam[0]?.team?.name} ${race.raceteam[1]?.team?.name}`
  //     .toLowerCase()
  //     .includes(search.toLowerCase());

  return (
    // <Box display={showRace ? "block" : "none"}>
    <DialogRoot size="full" motionPreset="slide-in-bottom">
      <DialogTrigger asChild>
        <Box mb={4}>
          <RaceCard
            race={race}
            active={active}
            isStand={isStand}
            search={search}
          />
        </Box>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Race {race.number}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <RaceCard
            race={race}
            active={active}
            isStand={isStand}
            search={search}
          />
          <RaceDialog race={race} active={active} />
        </DialogBody>
        <DialogFooter></DialogFooter>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
    // </Box>
  );
}
