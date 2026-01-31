"use client";

import {
  Box,
  Flex,
  Text,
  Heading,
  Grid,
  GridItem,
  Skeleton,
  Stack,
  chakra,
  Input,
  Icon,
  Button,
  Image,
  Group,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import supabase from "@/supabase";
import { leaderboardAtom, RaceResult, useAuth } from "../shared";
import RaceEdit from "./race-edit";
import { TbChevronLeft } from "react-icons/tb";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

// Define a type for a leaderboard row.
type LeaderboardRow = {
  avg_pts: number;
  losses: number;
  wins: number;
  team: {
    id: string;
    name: string;
  };
};

// Helper to transform a YouTube watch URL into an embed URL.
function getEmbedUrl(url: string): string {
  if (
    url.startsWith("https://youtu.be/") ||
    url.startsWith("https://www.youtu.be/")
  ) {
    url = url.replace("youtu.be/", "youtube.com/watch?v=");
  }

  const ytRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/;
  const match = url.match(ytRegex);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url;
}

// Wrap iframe using Chakra's chakra() so we can pass style props.
const Iframe = chakra("iframe");

function FlightPictures({ race }: { race: RaceResult }) {
  return (
    <Box>
      <Flex justify="center" gap={4}>
        <Box borderWidth="1px" borderRadius="md" overflow="hidden">
          <Image
            src={`/halfflights/${race.flight.id}_left.jpeg`}
            alt="Left Flight Half"
            width={300}
            objectFit="cover"
            borderRadius="lg"
            boxShadow="md"
          />
        </Box>
        <Box borderWidth="1px" borderRadius="md" overflow="hidden">
          <Image
            src={`/halfflights/${race.flight.id}_right.jpeg`}
            alt="Right Flight Half"
            width={300}
            objectFit="cover"
            borderRadius="lg"
            boxShadow="md"
          />
        </Box>
      </Flex>
    </Box>
  );
}

function TeamComparison({
  league,
  leftTeamId,
  rightTeamId,
}: {
  league: string;
  leftTeamId: string;
  rightTeamId: string;
}) {
  const data = useAtomValue(leaderboardAtom);
  const stats = data?.get(league);
  const leftStats = stats?.find((s) => s.team.id === leftTeamId);
  const rightStats = stats?.find((s) => s.team.id === rightTeamId);

  return (
    <>
      <Heading size="xl" textAlign="center" mt={2}>
        Team Comparison
      </Heading>
      {false ? (
        <Skeleton height="80px" variant="shine" />
      ) : (
        <Box mb={4} p={3} borderWidth="1px" borderRadius="md" bg="white">
          <Grid templateColumns="1fr auto 1fr" gap={2}>
            {/* Row 1: Wins */}
            <GridItem textAlign="center">
              <Text fontSize="sm" color="green.600" fontWeight="bold">
                {leftStats ? leftStats.wins : "-"}
              </Text>
            </GridItem>
            <GridItem textAlign="center" rowSpan={1} alignSelf="center">
              <Text fontSize="xs" color="gray.600" fontWeight="bold">
                WINS
              </Text>
            </GridItem>
            <GridItem textAlign="center">
              <Text fontSize="sm" color="green.600" fontWeight="bold">
                {rightStats ? rightStats.wins : "-"}
              </Text>
            </GridItem>
            {/* Row 2: Losses */}
            <GridItem textAlign="center">
              <Text fontSize="sm" color="red.600" fontWeight="bold">
                {leftStats ? leftStats.losses : "-"}
              </Text>
            </GridItem>
            <GridItem textAlign="center" alignSelf="center">
              <Text fontSize="xs" color="gray.600" fontWeight="bold">
                LOSSES
              </Text>
            </GridItem>
            <GridItem textAlign="center">
              <Text fontSize="sm" color="red.600" fontWeight="bold">
                {rightStats ? rightStats.losses : "-"}
              </Text>
            </GridItem>
            {/* Row 3: Average Points */}
            <GridItem textAlign="center">
              <Text fontSize="sm" color="black.600" fontWeight="bold">
                {leftStats ? leftStats.avg_pts.toFixed(1) : "-"}
              </Text>
            </GridItem>
            <GridItem textAlign="center" alignSelf="center">
              <Text fontSize="xs" color="gray.600" fontWeight="bold">
                AVG. POINTS
              </Text>
            </GridItem>
            <GridItem textAlign="center">
              <Text fontSize="sm" color="black.600" fontWeight="bold">
                {rightStats ? rightStats.avg_pts.toFixed(1) : "-"}
              </Text>
            </GridItem>
          </Grid>
        </Box>
      )}
    </>
  );
}

function DroneVideo({ race }: { race: RaceResult }) {
  const { isAdmin } = useAuth();
  const [newVideoURL, setNewVideoURL] = useState<string | null>(race.video);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  function updateVideo() {
    setIsEditing(true);
    supabase
      .from("race")
      .update({ video: newVideoURL })
      .eq("id", race.id)
      .then(() => setIsEditing(false));
  }

  return (
    <>
      <Heading as="h3" size="xl" textAlign="center">
        Drone Footage
      </Heading>
      {race.video && (
        <>
          <Box width="100%" position="relative" paddingBottom="56.25%">
            <Iframe
              src={getEmbedUrl(race.video)}
              title="Race Video"
              width="100%"
              height="100%"
              border="0"
              position="absolute"
              top="0"
              left="0"
              borderRadius="md"
            />
          </Box>
        </>
      )}
      {isAdmin && (
        <Flex>
          <Input
            value={newVideoURL || ""}
            onChange={(e) => setNewVideoURL(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateVideo();
              }
            }}
            placeholder="https://player.vimeo.com/video/3539..."
            width="100%"
            borderRightRadius="0"
            bg="white"
          />
          <Button
            onClick={() => updateVideo()}
            loading={isEditing}
            disabled={race.video === newVideoURL}
            borderLeftRadius="0"
          >
            {race.video ? "Save" : "Add"}
          </Button>
        </Flex>
      )}
    </>
  );
}

interface RaceDialogProps {
  race: RaceResult;
  active: boolean;
}

export default function RaceDialog({ race, active }: RaceDialogProps) {
  const { isAdmin } = useAuth();

  return (
    <Box mt={4}>
      <Box
        maxW="1000px"
        mx="auto"
        display="flex"
        flexDirection="column"
        gap={4}
      >
        {/* Flight Pictures */}
        <FlightPictures race={race} />

        {/* Video embed */}
        {(race.video || isAdmin) && <DroneVideo race={race} />}

        {/* Race Edit */}
        {isAdmin && <RaceEdit race={race} active={active} />}

        {/* Head-to-Head Header */}
        {race.lteam && race.rteam && (
          <TeamComparison
            league={race.league}
            leftTeamId={race.lteam.id}
            rightTeamId={race.rteam.id}
          />
        )}
      </Box>
    </Box>
  );
}
