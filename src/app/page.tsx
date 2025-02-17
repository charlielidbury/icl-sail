"use client";

import NavBar from "@/components/navbar";
import {
  Box,
  Button,
  Input,
  IconButton,
  Skeleton,
  Stack,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import Race from "@/components/race";
import supabase from "@/supabase";
import { useEffect, useRef, useState } from "react";
import { RaceResult } from "@/shared";
import { TbChevronsDown, TbChevronsUp, TbX } from "react-icons/tb";
import { Session } from "@supabase/auth-js";
import { useColorMode } from "@/components/ui/color-mode";
import dayjs from "dayjs";

export default function Home() {
  // Admin/session state.
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session)
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session && session.user) {
        const { data } = await supabase
          .from("admin")
          .select("uuid")
          .eq("uuid", session.user.id)
          .maybeSingle();
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [session]);

  // Fetch all races (including finishtime) with raceteam.
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
        if (data === null) return;
        // Transform finishtime into a Day.js object (or null if not present)
        setRaces(
          data.map((d) => ({
            id: d.id,
            number: d.number,
            video: d.video,
            finishtime: dayjs(d.finishtime),
            raceteam: d.raceteam.map((raceteam) => ({
              team: raceteam.team,
              result: raceteam.result,
              halfflight: raceteam.halfflight,
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
      if (races[i].raceteam[0] && races[i].raceteam[0].result !== null) {
        break;
      }
      cr = races[i].number;
    }
    setCurrentRace(cr);
  }, [races]);

  // Scroll to current race.
  const currentRaceRef = useRef<HTMLDivElement>(null);
  const scrollToCurrentRace = () => {
    currentRaceRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };
  useEffect(() => {
    if (currentRace !== null && races) scrollToCurrentRace();
  }, [currentRace, races]);

  // Observer to detect if the current race card is in view.
  const [isCurrentRaceVisible, setIsCurrentRaceVisible] = useState(true);
  const [isCurrentRaceAbove, setIsCurrentRaceAbove] = useState(false);
  useEffect(() => {
    if (!currentRaceRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCurrentRaceVisible(entry.isIntersecting);
        setIsCurrentRaceAbove(entry.boundingClientRect.top < 0);
      },
      { root: null, threshold: 0.5 }
    );
    observer.observe(currentRaceRef.current);
    return () => observer.disconnect();
  }, [currentRace]);

  // Search filter state.
  const [search, setSearch] = useState(() => {
    if (typeof window !== "undefined")
      return localStorage.getItem("search") || "";
    return "";
  });
  useEffect(() => {
    localStorage.setItem("search", search);
  }, [search]);

  // Debounce search input.
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(handler);
  }, [search]);

  const [filteredRaces, setFilteredRaces] = useState<RaceResult[] | null>(null);
  useEffect(() => {
    console.log("Updating filtered races");
    if (!races) return;
    const lowerSearch = debouncedSearch.toLowerCase();
    setFilteredRaces(
      races.filter((race) => {
        const raceName = `${race.number} ${race.raceteam[0]?.team?.name} ${race.raceteam[1]?.team?.name}`;
        return raceName.toLowerCase().includes(lowerSearch);
      })
    );
  }, [races, debouncedSearch]);

  const pulseAnimation = keyframes`
    0% { transform: scale(1); }
    50% { transform: scale(1.01); }
    100% { transform: scale(1); }
  `;

  // Set color mode to light on load.
  const { setColorMode } = useColorMode();
  useEffect(() => {
    setColorMode("light");
  }, []);

  return (
    <>
      <Box position="sticky" top="0" zIndex="100">
        <NavBar isAdmin={isAdmin} />
        <Box p={4} bg="white" boxShadow="md">
          <Box position="relative">
            <Input
              placeholder="Search"
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
      <Box p={4}>
        <Stack>
          {races ? (
            filteredRaces?.map((race) => (
              <Box
                key={race.id}
                ref={race.number === currentRace ? currentRaceRef : undefined}
              >
                <Race
                  race={race}
                  active={race.number === currentRace}
                  isStand={
                    currentRace !== null &&
                    goToStandOffset !== null &&
                    race.number > currentRace &&
                    race.number - currentRace <= goToStandOffset
                  }
                  search={debouncedSearch} // pass debounced search for inline highlighting in RaceCard
                />
              </Box>
            ))
          ) : (
            <>
              <Skeleton height="80px" variant="shine" />
              <Skeleton height="80px" variant="shine" />
              <Skeleton height="80px" variant="shine" />
              <Skeleton height="80px" variant="shine" />
              <Skeleton height="80px" variant="shine" />
            </>
          )}
        </Stack>
      </Box>
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
