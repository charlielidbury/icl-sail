"use client";

import NavBar from "@/components/navbar";
import {
  Box,
  Button,
  Input,
  IconButton,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import Race from "@/components/race";
import supabase from "@/supabase";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  racesQuery,
  useAuth,
  queryClient,
  SharedLogic,
  sailingColour,
} from "@/shared";
import {
  TbChevronsDown,
  TbChevronsUp,
  TbX,
  TbDotsVertical,
} from "react-icons/tb";
import { useColorMode } from "@/components/ui/color-mode";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

// Memoize your Race component to avoid unnecessary re-renders
const MemoizedRace = memo(Race);

function Page() {
  // Admin/session state
  const { isAdmin } = useAuth();

  // Get search param from URL and process it
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search");

  // Process the search string to extract league and clean search
  const processSearchString = (search: string) => {
    const lowerSearch = search.toLowerCase();
    const leagueMatch = lowerSearch.match(/league:([^ ]+)/);
    const league = leagueMatch ? leagueMatch[1] : null;
    const cleanSearch = lowerSearch.replace(/league:[^ ]+/, "").trim();
    return { league, cleanSearch };
  };

  // Fetch all races
  const races = useQuery(racesQuery);
  const currentRace = races.data?.currentRace;

  // Fetch settings (go_to_stand offset)
  let { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .single();
      return data;
    },
  });
  const goToStandOffset = settings ? settings.go_to_stand : 0;

  // State to track if the current race is visible and if it is above the viewport.
  const [isCurrentRaceVisible, setIsCurrentRaceVisible] = useState(true);
  const [isCurrentRaceAbove, setIsCurrentRaceAbove] = useState(false);

  // Search filter state with localStorage, initialized with URL param if present
  const [search, setSearch] = useState(() => {
    if (typeof window !== "undefined") {
      return urlSearch || localStorage.getItem("search") || "";
    }
    return urlSearch || "";
  });

  // Update search when URL param changes
  useEffect(() => {
    if (urlSearch !== null) {
      setSearch(urlSearch);
    }
  }, [urlSearch]);

  // Save search to localStorage
  useEffect(() => {
    localStorage.setItem("search", search);
  }, [search]);

  // Debounce search input
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 20);
    return () => clearTimeout(handler);
  }, [search]);

  // Filtered races
  const filteredRaces = useMemo(() => {
    if (!races.data) return [];

    const { league, cleanSearch } = processSearchString(debouncedSearch);

    return races.data.races.filter((race) => {
      if (race.number === races.data.currentRace) return true;

      // Check league filter if present
      if (league && race.league !== league) return false;

      // If no other search term, show all races in league
      if (!cleanSearch) return true;

      // Normal search on team names and race number
      const raceName = `${race.number} ${race.raceteam
        .map((rt) => rt.team?.name ?? "")
        .join(" ")}`;
      return raceName.toLowerCase().includes(cleanSearch);
    });
  }, [races, debouncedSearch]);

  // Get clean search for race cards
  const cleanSearchForCards = useMemo(() => {
    return processSearchString(debouncedSearch).cleanSearch;
  }, [debouncedSearch]);

  // Button pulse animation
  const pulseAnimation = keyframes`
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
  `;

  // Force light color mode on load
  const { setColorMode } = useColorMode();
  useEffect(() => {
    setColorMode("light");
  }, [setColorMode]);

  // Reference for the Virtuoso component so we can scroll to an item
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Scroll to the current race
  const scrollToCurrentRace = useCallback(() => {
    if (!filteredRaces || currentRace === null) return;
    const index = filteredRaces.findIndex((r) => r.number === currentRace);
    if (index >= 0 && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({
        index,
        align: "start",
        behavior: "auto",
      });
    }
  }, [filteredRaces, currentRace]);

  // Use the rangeChanged callback to detect if the current race is visible.
  const handleRangeChanged = useCallback(
    (range: { startIndex: number; endIndex: number }) => {
      if (!filteredRaces || currentRace === null) return;
      const currentRaceIndex = filteredRaces.findIndex(
        (r) => r.number === currentRace
      );
      if (currentRaceIndex === -1) return;
      if (
        currentRaceIndex >= range.startIndex &&
        currentRaceIndex <= range.endIndex
      ) {
        setIsCurrentRaceVisible(true);
      } else {
        setIsCurrentRaceVisible(false);
        setIsCurrentRaceAbove(currentRaceIndex < range.startIndex);
      }
    },
    [filteredRaces, currentRace]
  );

  useEffect(() => {
    scrollToCurrentRace();
  }, [debouncedSearch]);

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Sticky navbar and search bar */}
      <Box position="sticky" top="0" zIndex="100">
        <NavBar isAdmin={isAdmin} />
        <Box p={4} bg="white" boxShadow="md">
          <Box position="relative">
            <Input
              placeholder="Search by team name or race #"
              variant="subtle"
              bg="light-gray"
              size="lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <IconButton
                aria-label="Clear search"
                size="xs"
                variant="ghost"
                onClick={() => setSearch("")}
                position="absolute"
                right="0.5rem"
                top="50%"
                transform="translateY(-50%)"
              >
                <TbX />
              </IconButton>
            )}
          </Box>
          {races.isFetched &&
            filteredRaces.length !== races.data?.races.length && (
              <Text
                mt={2}
                mb={-2}
                fontSize="xs"
                color="gray.500"
                fontStyle="italic"
              >
                Showing {filteredRaces.length}/{races.data?.races.length} races
              </Text>
            )}
          {settings?.racing_paused && (
            <Box
              mt={3}
              p={2}
              mb={-1}
              bg="yellow.100"
              color="yellow.700"
              borderRadius="md"
              textAlign="center"
              fontWeight="medium"
            >
              Racing Paused
            </Box>
          )}
        </Box>
      </Box>

      {/* Main content area */}
      <Box p={4} height="calc(100vh - 100px)">
        {races.error ? (
          <Text textAlign="center" fontSize="lg" color="red">
            Error loading races.
            {races.error.message}
          </Text>
        ) : races.isFetched && settings ? (
          filteredRaces.length > 0 && currentRace ? (
            <>
              <Virtuoso
                overscan={1000}
                initialTopMostItemIndex={filteredRaces.findIndex(
                  (r) => r.number === currentRace
                )}
                ref={virtuosoRef}
                data={filteredRaces}
                style={{ height: "100%", width: "100%" }}
                defaultItemHeight={200}
                itemContent={(index, race) => {
                  // Determine if the race is active or in stand based on currentRace & settings.
                  const isActive = race.number === currentRace;
                  const isStand =
                    currentRace !== null &&
                    goToStandOffset !== null &&
                    race.number > currentRace &&
                    race.number - currentRace <= goToStandOffset;

                  const gapAbove =
                    index !== 0 &&
                    filteredRaces[index - 1].number !== race.number - 1;

                  // Check if any team stays in boats from previous race
                  const stayingTeam =
                    index !== filteredRaces.length - 1 &&
                    filteredRaces[index + 1].number === race.number + 4 &&
                    (filteredRaces[index + 1].raceteam.some((rt1) =>
                      race.raceteam.some((rt2) => rt1.team.id === rt2.team.id)
                    )
                      ? race.raceteam.find((rt1) =>
                          filteredRaces[index + 1].raceteam.some(
                            (rt2) => rt1.team.id === rt2.team.id
                          )
                        )?.team.name
                      : null);

                  return (
                    <Box key={race.id}>
                      <MemoizedRace
                        race={race}
                        active={isActive}
                        isStand={!settings.racing_paused && isStand}
                        showEstFinishtime={
                          !settings.racing_paused && settings.estimates
                        }
                        search={cleanSearchForCards}
                      />

                      {/* dot dot dot */}
                      {gapAbove && !stayingTeam && (
                        <Text
                          display="flex"
                          justifyContent="center"
                          color="gray.500"
                          opacity={0.5}
                          pb={2}
                        >
                          <TbDotsVertical />
                        </Text>
                      )}

                      {/* Team stays in boats message */}
                      {stayingTeam && (
                        <Box
                          bg={`${sailingColour}cc`}
                          // borderRadius="md"
                          py={2}
                          mt={-5}
                          mb={-1}
                        >
                          <Text
                            textAlign="center"
                            fontSize="xs"
                            color="white"
                            fontWeight="bold"
                            fontStyle="italic"
                          >
                            {stayingTeam.toUpperCase()} STAYS ON
                          </Text>
                        </Box>
                      )}
                    </Box>
                  );
                }}
                rangeChanged={handleRangeChanged}
              />
            </>
          ) : (
            <Text textAlign="center" fontSize="lg" color="gray.600">
              No races found.
            </Text>
          )
        ) : (
          <Stack>
            <Skeleton height="80px" />
            <Skeleton height="80px" />
            <Skeleton height="80px" />
            <Skeleton height="80px" />
            <Skeleton height="80px" />
          </Stack>
        )}
      </Box>

      {/* Jump button if current race is off-screen */}
      {!isCurrentRaceVisible && (
        <Box
          position="fixed"
          bottom="20px"
          left="50%"
          transform="translateX(-50%)"
          zIndex="200"
        >
          <Button
            onClick={scrollToCurrentRace}
            borderRadius="md"
            size="sm"
            colorScheme="blue"
            animation={`${pulseAnimation} 2s infinite`}
          >
            <Box display="flex" alignItems="center">
              <span>Jump to Current Race</span>
              <Box ml={2}>
                {isCurrentRaceAbove ? <TbChevronsUp /> : <TbChevronsDown />}
              </Box>
            </Box>
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <SharedLogic />
      <Page />
    </QueryClientProvider>
  );
}
