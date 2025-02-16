"use client";

import NavBar from "@/components/navbar";
import { Box, Button, For, Input, Skeleton, Stack } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import Race from "@/components/race";
import supabase from "@/supabase";
import { useEffect, useRef, useState } from "react";
import { RaceResult } from "@/shared";
import { TbChevronsDown, TbChevronsUp } from "react-icons/tb";

export default function Home() {
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

  const currentRaceRef = useRef<HTMLDivElement>(null);
  const [currentRace, setCurrentRace] = useState<number | null>(null);
  useEffect(() => {
    if (races == null) return;

    // iterate through races in descending race number,
    // once a race with results is found, the one before is the current race
    let cr: number | null = null;
    for (let i = 0; i < races.length; i++) {
      if (races[i].raceteam[0] && races[i].raceteam[0].result !== null) {
        break; // hit a completed race
      }
      cr = races[i].number;
    }
    setCurrentRace(cr);
  }, [races]);

  const scrollToCurrentRace = () => {
    currentRaceRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  // Automatically scroll on load when races and currentRace are set.
  useEffect(() => {
    if (currentRace !== null && races) {
      scrollToCurrentRace();
    }
  }, [currentRace, races]);

  // State to control the floating button
  const [isCurrentRaceVisible, setIsCurrentRaceVisible] = useState(true);
  // New state to know whether current race is above the viewport
  const [isCurrentRaceAbove, setIsCurrentRaceAbove] = useState(false);

  // Re-run the observer effect when the current race changes
  useEffect(() => {
    if (!currentRaceRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCurrentRaceVisible(entry.isIntersecting);
        // if the element's top is less than 0, it is above the viewport.
        setIsCurrentRaceAbove(entry.boundingClientRect.top < 0);
      },
      {
        root: null, // use the viewport
        threshold: 0.5, // 50% visibility threshold
      }
    );

    observer.observe(currentRaceRef.current);

    return () => {
      observer.disconnect();
    };
  }, [currentRace]);

  // search filter
  const [search, setSearch] = useState("");
  const filteredRaces = races?.filter((race) => {
    const raceName = `${race.number} ${race.raceteam[0]?.team?.name} ${race.raceteam[1]?.team?.name}`;
    console.log(raceName);
    return raceName.toLowerCase().includes(search.toLowerCase());
  });

  // Define a simple pulsing animation using Chakra's keyframes.
  const pulseAnimation = keyframes`
    0% { transform: scale(1); }
    50% { transform: scale(1.01); }
    100% { transform: scale(1); }
  `;

  return (
    <>
      <Box position="sticky" top="0" zIndex="100">
        <NavBar />
        <Box p={4}>
          <Input
            placeholder="Search"
            variant="subtle"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>
      </Box>
      <Box p={4}>
        <Stack>
          {races ? (
            <For each={filteredRaces}>
              {(race) => (
                <Box ref={race.number === currentRace ? currentRaceRef : undefined}>
                  <Race key={race.id} race={race} active={race.number === currentRace} />
                </Box>
              )}
            </For>
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
      {/* Floating button in bottom right */}
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
