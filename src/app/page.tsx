"use client";

import NavBar from "@/components/navbar";
import { Box, Button, For, Input, Skeleton, Stack } from "@chakra-ui/react";
import Race from "@/components/race";
import supabase from "@/supabase";
import { useEffect, useRef, useState } from "react";
import { RaceResult } from "@/shared";
import { ActionBarContent, ActionBarRoot } from "@/components/ui/action-bar";
import { TbChevronsDown } from "react-icons/tb";

export default function Home() {
  // Fetch all
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
    if (races == null) {
      return;
    }

    // iterate through races in descending race number,
    // once a race with results is found,
    // the one before is the current race
    let cr: number | null = null;
    for (let i = 0; i < races.length; i++) {
      if (races[i].raceteam[0] && races[i].raceteam[0].result !== null) {
        // hit a completed race
        break;
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

  const [isCurrentRaceVisible, setIsCurrentRaceVisible] = useState(true);

  useEffect(() => {
    if (!currentRaceRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCurrentRaceVisible(entry.isIntersecting);
      },
      {
        root: null, // viewport
        threshold: 0.5, // 50% visibility threshold
      }
    );

    observer.observe(currentRaceRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // search filter
  const [search, setSearch] = useState("");
  const filteredRaces = races?.filter((race) => {
    const raceName = `${race.number} ${race.raceteam[0]?.team?.name} ${race.raceteam[1]?.team?.name}`;
    console.log(raceName);
    return raceName.toLowerCase().includes(search.toLowerCase());
  });

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
          {currentRace && (
            <ActionBarRoot open={!isCurrentRaceVisible}>
              <ActionBarContent borderWidth={"2px"} borderColor={"red.500"}>
                <Button variant="plain" size="sm" onClick={scrollToCurrentRace}>
                  <TbChevronsDown />
                  Current Race
                </Button>
              </ActionBarContent>
            </ActionBarRoot>
          )}
          {races ? (
            <For each={filteredRaces}>
              {(race) => (
                <Box
                  ref={race.number === currentRace ? currentRaceRef : undefined}
                >
                  <Race
                    key={race.id}
                    race={race}
                    active={race.number === currentRace}
                  />
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
    </>
  );
}
