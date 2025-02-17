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
import { RaceResult, useAuth } from "@/shared";
import { TbChevronsDown, TbChevronsUp, TbX } from "react-icons/tb";
import { useColorMode } from "@/components/ui/color-mode";
import dayjs from "dayjs";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

// Memoize your Race component to avoid unnecessary re-renders
const MemoizedRace = memo(Race);

export default function Home() {
  // Admin/session state
  const { isAdmin } = useAuth();

  // Fetch all races
  const [races, setRaces] = useState<RaceResult[] | null>(null);
  useEffect(() => {
    supabase
      .from("race")
      .select(
        `
          id,
          number,
          video,
          finishtime,
          raceteam (
            race,
            team ( id, name ),
            result,
            halfflight ( id, name, symbol, colour, numbers )
          )
        `
      )
      .order("number", { ascending: false })
      .then(({ data, error }) => {
        if (!data) return;
        setRaces(
          data.map((d) => ({
            id: d.id,
            number: d.number,
            video: d.video,
            finishtime: dayjs(d.finishtime),
            raceteam: d.raceteam.map((rt: any) => ({
              team: rt.team,
              result: rt.result,
              halfflight: rt.halfflight,
            })),
          }))
        );
        console.log({ data, error });
      });
  }, []);

  // Fetch settings (go_to_stand offset)
  const [goToStandOffset, setGoToStandOffset] = useState<number | null>(null);
  useEffect(() => {
    supabase
      .from("settings")
      .select("go_to_stand")
      .single()
      .then(({ data, error }) => {
        if (data) setGoToStandOffset(data.go_to_stand);
        console.log({ data, error });
      });
  }, []);

  // Determine current race (first race with no result)
  const [currentRace, setCurrentRace] = useState<number | null>(null);
  useEffect(() => {
    if (!races) return;
    let cr: number | null = null;
    for (let i = 0; i < races.length; i++) {
      // If the first team in this race has a result, it means the race is done.
      if (races[i].raceteam[0]?.result !== null) {
        break;
      }
      cr = races[i].number;
    }
    setCurrentRace(cr);
  }, [races]);

  // State to track if the current race is visible and if it is above the viewport.
  const [isCurrentRaceVisible, setIsCurrentRaceVisible] = useState(true);
  const [isCurrentRaceAbove, setIsCurrentRaceAbove] = useState(false);

  // Search filter state with localStorage
  const [search, setSearch] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("search") || "";
    }
    return "";
  });
  useEffect(() => {
    localStorage.setItem("search", search);
  }, [search]);

  // Debounce search input
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 20);
    return () => clearTimeout(handler);
  }, [search]);

  // Filtered races
  const filteredRaces = useMemo(() => {
    if (!races) return [];
    const lowerSearch = debouncedSearch.toLowerCase();
    return races.filter((race) => {
      const raceName = `${race.number} ${race.raceteam
        .map((rt) => rt.team?.name ?? "")
        .join(" ")}`;
      return raceName.toLowerCase().includes(lowerSearch);
    });
  }, [races, debouncedSearch]);

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
        align: "center",
        behavior: "smooth",
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

  return (
    <>
      {/* Sticky navbar and search bar */}
      <Box position="sticky" top="0" zIndex="100">
        <NavBar isAdmin={isAdmin} />
        <Box p={4} bg="white" boxShadow="md">
          <Box position="relative">
            <Input
              placeholder="Search by team name or race #"
              variant="subtle"
              bg="light-gray"
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
        </Box>
      </Box>

      {/* Main content area */}
      <Box p={4} height="calc(100vh - 100px)">
        {races ? (
          filteredRaces.length > 0 ? (
            <Virtuoso
              ref={virtuosoRef}
              data={filteredRaces}
              style={{ height: "100%", width: "100%" }}
              itemContent={(index, race) => {
                // Determine if the race is active or in stand based on currentRace & settings.
                const isActive = race.number === currentRace;
                const isStand =
                  currentRace !== null &&
                  goToStandOffset !== null &&
                  race.number > currentRace &&
                  race.number - currentRace <= goToStandOffset;
                return (
                  // <Box key={race.id} py={2} px={4} width="100%">
                  <MemoizedRace
                    race={race}
                    active={isActive}
                    isStand={isStand}
                    search={debouncedSearch}
                    key={race.id}
                  />
                  // </Box>
                );
              }}
              rangeChanged={handleRangeChanged}
            />
          ) : (
            <Text>No races found.</Text>
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
    </>
  );
}
