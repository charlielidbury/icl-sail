"use client";

import NavBar from "@/components/navbar";
import {
  Box,
  Stack,
  Skeleton,
  Text,
  Heading,
  Flex,
  Badge,
  Button,
  ButtonGroup,
  Link,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import supabase from "@/supabase";
import { useColorMode, useColorModeValue } from "@/components/ui/color-mode";
import ordinal from "ordinal";
import { queryClient, sailingColour, SharedLogic, useAuth } from "@/shared";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";

type LeaderboardRow = {
  avg_pts: number;
  losses: number;
  order: number;
  wins: number;
  league: string;
  team: {
    id: string;
    name: string;
  };
};

function LeaderboardRow({
  row,
  selectedLeague,
  leaderboard,
  index,
}: {
  row: LeaderboardRow;
  selectedLeague: string;
  leaderboard: LeaderboardRow[];
  index: number;
}) {
  const cardBg = useColorModeValue("white", "gray.700");
  const cardBorderColor = useColorModeValue("gray.200", "gray.600");
  const defaultOrdinalBg = useColorModeValue("blue.100", "blue.900");

  // For QUALI league, use gold for top half and silver for bottom half.
  let badgeBg: string = sailingColour;
  // if (selectedLeague === "gold") {
  //   badgeBg = "gold";
  // } else if (selectedLeague === "silver") {
  //   badgeBg = "silver";
  // } else if (selectedLeague === "quali" && leaderboard) {
  //   badgeBg = index < Math.ceil(leaderboard.length / 2) ? "gold" : "silver";
  // }
  return (
    <Link
      href={`/races?search=league:${row.league} ${row.team.name}`}
      _hover={{ textDecoration: "none" }}
      key={row.team.id}
      display="block"
      width="100%"
    >
      <Box
        bg={cardBg}
        borderWidth="1px"
        borderColor={cardBorderColor}
        borderRadius="xl"
        p={3}
        boxShadow="sm"
        _hover={{ boxShadow: "md", transform: "scale(1.01)" }}
        transition="all 0.2s ease"
      >
        <Flex justify="space-between" align="center" mb={1}>
          <Text fontSize="lg" fontWeight="bold" color="black">
            {row.team.name}
          </Text>
          <Badge
            bg={badgeBg}
            color="white"
            fontSize="xs"
            fontWeight="semibold"
            px={2}
            py={1}
            borderRadius="md"
          >
            {ordinal(index + 1)}
          </Badge>
        </Flex>
        <Flex justify="space-between" align="center">
          <Flex align="center">
            <Text fontSize="sm" fontWeight="bold" color="green.600">
              {row.wins}W
            </Text>
            <Text fontSize="sm" mx={1} color="gray.600">
              /
            </Text>
            <Text fontSize="sm" fontWeight="bold" color="red.600">
              {row.losses}L
            </Text>
          </Flex>
          <Flex align="center">
            <Text fontSize="sm" color="gray.600" mr={1}>
              Avg. Points:
            </Text>
            <Text fontSize="sm" fontWeight="bold" color="black">
              {row.avg_pts.toFixed(1)}
            </Text>
          </Flex>
        </Flex>
      </Box>
    </Link>
  );
}

function Leaderboard({ league }: { league: string }) {
  // Fetch leaderboard data filtered by the selected league.
  const { data: leaderboard } = useQuery({
    queryKey: ["leaderboard", league],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select(
          `
        avg_pts,
        losses,
        order,
        wins,
        league,
        team (
          id, name
        )
      `
        )
        .eq("league", league)
        .order("order", { ascending: true });

      if (error) {
        console.error("Error fetching leaderboard:", error);
      } else {
        return data;
      }
    },
  });

  if (leaderboard === undefined) {
    return (
      <Stack>
        <Skeleton height="80px" />
        <Skeleton height="80px" />
        <Skeleton height="80px" />
      </Stack>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Text textAlign="center" fontSize="lg" color="gray.600">
        No leaderboard data available.
      </Text>
    );
  }

  return leaderboard.map((row, index) => (
    <LeaderboardRow
      row={row}
      selectedLeague={league}
      leaderboard={leaderboard}
      index={index}
      key={row.team.id}
    />
  ));
}

function Page() {
  // Session and admin state.
  const { isAdmin } = useAuth();

  // League selection state.
  const [selectedLeague, setSelectedLeague] = useState<string>("quali");

  // Ensure light mode.
  const { setColorMode } = useColorMode();
  useEffect(() => {
    setColorMode("light");
  }, []);

  // Styling values.
  const pageBg = useColorModeValue("gray.50", "gray.800");

  return (
    <Box minH="100vh" bg="gray.50">
      <Box position="sticky" top="0" zIndex="100">
        <NavBar isAdmin={isAdmin} />
      </Box>
      <Box p={4} bg={pageBg} minH="100vh">
        <Heading
          as="h1"
          size="xl"
          mb={4}
          textAlign="center"
          color="black"
          fontWeight="extrabold"
        >
          Leaderboard
        </Heading>

        {/* League switcher */}
        <Flex
          maxW="600px"
          w="full"
          mx="auto"
          justify="center"
          mb={6}
          boxShadow="lg"
        >
          <ButtonGroup attached variant="solid" w="full">
            <Button
              flex="1"
              bg={selectedLeague === "quali" ? sailingColour : "gray.300"}
              color={selectedLeague === "quali" ? "white" : "gray.800"}
              _hover={{
                bg: selectedLeague === "quali" ? sailingColour : "gray.400",
              }}
              onClick={() => setSelectedLeague("quali")}
              fontSize="xs"
              fontWeight="bold"
            >
              1. QUALIFYING
            </Button>
            {/* <Button
              flex="1"
              bg={selectedLeague === "semis" ? sailingColour : "gray.300"}
              color={selectedLeague === "semis" ? "white" : "gray.800"}
              _hover={{
                bg: selectedLeague === "semis" ? sailingColour : "gray.400",
              }}
              onClick={() => setSelectedLeague("semis")}
              fontSize="xs"
              fontWeight="bold"
            >
              2. GROUPS
            </Button> */}
            <Button
              flex="1"
              bg={selectedLeague === "finals" ? sailingColour : "gray.300"}
              color={selectedLeague === "finals" ? "white" : "gray.800"}
              _hover={{
                bg: selectedLeague === "finals" ? sailingColour : "gray.400",
              }}
              onClick={() => setSelectedLeague("finals")}
              fontSize="xs"
              fontWeight="bold"
            >
              2. KNOCKOUTS
            </Button>
          </ButtonGroup>
        </Flex>
        <Stack>
          {selectedLeague === "quali" ? (
            // Qualis
            <>
              <Text fontSize="sm" color="gray.600" mb={4} fontStyle="italic">
                Round Robin
              </Text>
              <Leaderboard league="quali" />
            </>
          ) : // ) : selectedLeague === "semis" ? (
          //   // Semis
          //   <>
          //     <Heading as="h1" size="xl" mt={4} color="black">
          //       Gold Division
          //     </Heading>
          //     <Text
          //       fontSize="sm"
          //       color="gray.600"
          //       mb={4}
          //       fontStyle="italic"
          //     >
          //       Round robin between top half of qualifying
          //     </Text>
          //     {leaderboard.length > 0 ? (
          //       leaderboard
          //         .filter((r) => r.league === "semis/gold")
          //         .map((row, index) => (
          //           <LeaderboardRow
          //             row={row}
          //             selectedLeague={selectedLeague}
          //             leaderboard={leaderboard}
          //             index={index}
          //             key={row.team.id}
          //           />
          //         ))
          //     ) : (
          //       <Text textAlign="center" fontSize="lg" color="gray.600">
          //         No leaderboard data available.
          //       </Text>
          //     )}

          //     <Heading as="h1" size="xl" mt={4} color="black">
          //       Silver Division
          //     </Heading>
          //     <Text
          //       fontSize="sm"
          //       color="gray.600"
          //       mb={4}
          //       fontStyle="italic"
          //     >
          //       Round robin between bottom half of qualifying
          //     </Text>
          //     {leaderboard.length > 0 ? (
          //       leaderboard
          //         .filter((r) => r.league === "semis/silver")
          //         .map((row, index) => (
          //           <LeaderboardRow
          //             row={row}
          //             selectedLeague={selectedLeague}
          //             leaderboard={leaderboard}
          //             index={index}
          //             key={row.team.id}
          //           />
          //         ))
          //     ) : (
          //       <Text textAlign="center" fontSize="lg" color="gray.600">
          //         No leaderboard data available.
          //       </Text>
          //     )}
          //   </>
          selectedLeague === "finals" ? (
            <>
              {/* Semi-finals */}
              <Heading as="h1" size="xl" mt={4} color="black">
                Semi-finals
              </Heading>
              <Text fontSize="sm" color="gray.600" mb={4} fontStyle="italic">
                Qualis 1st vs Qualis 4th
              </Text>
              <Leaderboard league="finals/q1vsq4" />
              <Text fontSize="sm" color="gray.600" mb={4} fontStyle="italic">
                Qualis 2nd vs Qualis 3rd
              </Text>
              <Leaderboard league="finals/q2vsq3" />

              {/* Finals */}
              <Heading as="h1" size="xl" mt={4} color="black">
                Finals
              </Heading>
              <Text fontSize="sm" color="gray.600" mb={4} fontStyle="italic">
                Best of 5 between semi-final winners
              </Text>
              <Leaderboard league="finals/winners" />
              <Text fontSize="sm" color="gray.600" mb={4} fontStyle="italic">
                Best of 3 between semi-final losers
              </Text>
              <Leaderboard league="finals/losers" />
            </>
          ) : (
            <></>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

export default function LeaderboardPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <SharedLogic />
      <Page />
    </QueryClientProvider>
  );
}
