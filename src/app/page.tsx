"use client";

import NavBar from "@/components/navbar";
import {
  Box,
  Button,
  Input,
  IconButton,
  Skeleton,
  Stack
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import Race from "@/components/race";
import supabase from "@/supabase";
import { useEffect, useMemo, useRef, useState } from "react";
import { RaceResult } from "@/shared";
import { TbChevronsDown, TbChevronsUp, TbX } from "react-icons/tb";
import { Session } from "@supabase/auth-js";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

export default function Home() {
  // State for admin checking
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Check if the logged in user is an admin by looking up their uuid in the "admin" table.
    const checkAdminStatus = async () => {
      if (session && session.user) {
        const { data } = await supabase
          .from("admin")
          .select("uuid")
          .eq("uuid", session.user.id)
          .single();
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [session]);

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
          raceteam (
            team ( id, name ),
            result
          )
        `
      )
      .order("number", { ascending: false })
      .then(({ data, error }) => {
        setRaces(data);
        console.log({ data, error });
      });
  }, []);

  // Fetch settings to get go_to_stand offset (a 2-byte signed int)
  const [goToStandOffset, setGoToStandOffset] = useState<number | null>(null);
  useEffect(() => {
    supabase
      .from("settings")
      .select("go_to_stand")
      .single()
      .then(({ data, error }) => {
        if (data) {
          setGoToStandOffset(data.go_to_stand);
        }
        console.log({ data, error });
      });
  }, []);

  // Determine the current race by iterating through races until a race with a result is found.
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

  // We'll always scroll to the current race.
  const currentRaceRef = useRef<HTMLDivElement>(null);
  const scrollToCurrentRace = () => {
    currentRaceRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  // Auto-scroll on load
  useEffect(() => {
    if (currentRace !== null && races) {
      scrollToCurrentRace();
    }
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
      {
        root: null,
        threshold: 0.5,
      }
    );
    observer.observe(currentRaceRef.current);
    return () => observer.disconnect();
  }, [currentRace]);

  // Persist the search filter in local storage.
  const [search, setSearch] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("search") || "";
    }
    return "";
  });
  useEffect(() => {
    localStorage.setItem("search", search);
  }, [search]);

  // Optionally debounce the search input if needed.
  const debouncedSearch = useDebounce(search, 1000);

  const [filteredRaces, setFilteredRaces] = useState<RaceResult[] | null>()
  useEffect(() => {
    if (!races) return;
    const lowerSearch = debouncedSearch.toLowerCase();
    setFilteredRaces(races.filter((race) => {
      const raceName = `${race.number} ${race.raceteam[0]?.team?.name} ${race.raceteam[1]?.team?.name}`;
      return raceName.toLowerCase().includes(lowerSearch);
    }));
  }, [races, debouncedSearch]);


  // Define a subtle pulsing animation.
  const pulseAnimation = keyframes`
    0% { transform: scale(1); }
    50% { transform: scale(1.01); }
    100% { transform: scale(1); }
  `;

  return (
    <>
      <Box position="sticky" top="0" zIndex="100">
        <NavBar isAdmin={isAdmin} />
        <Box p={4} bg="white">
          <Box position="relative">
            <Input
              placeholder="Search"
              variant="subtle"
              bg="white"
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
                  search={search} // pass search term for inline highlighting in RaceCard
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
