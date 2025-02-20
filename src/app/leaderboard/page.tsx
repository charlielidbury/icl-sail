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
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import supabase from "@/supabase";
import { useColorMode, useColorModeValue } from "@/components/ui/color-mode";
import ordinal from "ordinal";
import { queryClient, SharedLogic, useAuth } from "@/shared";
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

function Page() {
  // Session and admin state.
  const { isAdmin } = useAuth();

  // League selection state.
  const [selectedLeague, setSelectedLeague] = useState<string>("quali");

  // Fetch leaderboard data filtered by the selected league.
  const { data: leaderboard } = useQuery({
    queryKey: ["leaderboard", selectedLeague],
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
        .eq("league", selectedLeague)
        .order("order", { ascending: true });

      if (error) {
        console.error("Error fetching leaderboard:", error);
      } else {
        return data;
      }
    },
  });

  // Ensure light mode.
  const { setColorMode } = useColorMode();
  useEffect(() => {
    setColorMode("light");
  }, []);

  // Styling values.
  const pageBg = useColorModeValue("gray.50", "gray.800");
  const cardBg = useColorModeValue("white", "gray.700");
  const cardBorderColor = useColorModeValue("gray.200", "gray.600");
  const defaultOrdinalBg = useColorModeValue("blue.100", "blue.900");

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
        <Flex maxW="600px" w="full" mx="auto" justify="center" mb={6}>
          <ButtonGroup attached variant="solid" w="full">
            <Button
              flex="1"
              bg={selectedLeague === "quali" ? "#004a79" : "gray.300"}
              color={selectedLeague === "quali" ? "white" : "gray.800"}
              _hover={{
                bg: selectedLeague === "quali" ? "#004a79" : "gray.400",
              }}
              onClick={() => setSelectedLeague("quali")}
              fontSize="xs"
              fontWeight="bold"
            >
              QUALIFYING
            </Button>
            <Button
              flex="1"
              bg={selectedLeague === "silver" ? "#004a79" : "gray.300"}
              color={selectedLeague === "silver" ? "white" : "gray.800"}
              _hover={{
                bg: selectedLeague === "silver" ? "#004a79" : "gray.400",
              }}
              onClick={() => setSelectedLeague("silver")}
              fontSize="xs"
              fontWeight="bold"
            >
              SILVER
            </Button>
            <Button
              flex="1"
              bg={selectedLeague === "gold" ? "#004a79" : "gray.300"}
              color={selectedLeague === "gold" ? "white" : "gray.800"}
              _hover={{
                bg: selectedLeague === "gold" ? "#004a79" : "gray.400",
              }}
              onClick={() => setSelectedLeague("gold")}
              fontSize="xs"
              fontWeight="bold"
            >
              GOLD
            </Button>
          </ButtonGroup>
        </Flex>
        {leaderboard === undefined ? (
          <Stack>
            <Skeleton height="80px" />
            <Skeleton height="80px" />
            <Skeleton height="80px" />
          </Stack>
        ) : (
          <Stack>
            {leaderboard && leaderboard.length > 0 ? (
              leaderboard.map((row, index) => {
                // For QUALI league, use gold for top half and silver for bottom half.
                let badgeBg: string;
                if (selectedLeague === "gold") {
                  badgeBg = "gold";
                } else if (selectedLeague === "silver") {
                  badgeBg = "silver";
                } else if (selectedLeague === "quali" && leaderboard) {
                  badgeBg =
                    index < Math.ceil(leaderboard.length / 2)
                      ? "gold"
                      : "silver";
                } else {
                  badgeBg = defaultOrdinalBg;
                }
                return (
                  <Box
                    key={row.team.id}
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
                        color="black"
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
                );
              })
            ) : (
              <Text textAlign="center" fontSize="lg" color="gray.600">
                No leaderboard data available.
              </Text>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

export default function Leaderboard() {
  return (
    <QueryClientProvider client={queryClient}>
      <SharedLogic />
      <Page />
    </QueryClientProvider>
  );
}
