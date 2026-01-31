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
  Textarea,
  IconButton,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useColorMode, useColorModeValue } from "@/components/ui/color-mode";
import ordinal from "ordinal";
import {
  queryClient,
  SharedLogic,
  useAuth,
  LeaderboardTeam,
  leaderboardAtom,
  competitionAtom,
  useCompetition,
  hostnameAtom,
} from "@/shared";
import {
  QueryClientProvider,
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import supabase from "@/supabase";
import { TbEdit, TbCheck, TbX } from "react-icons/tb";
import { useAtom, useAtomValue } from "jotai";
import dynamic from "next/dynamic";
import { useHydrateAtoms } from "jotai/utils";
import { queryClientAtom } from "jotai-tanstack-query";

function FinalsMarkdown() {
  const { isAdmin } = useAuth();
  const competition = useCompetition();
  const { data: settings, refetch } = useAtomValue(competitionAtom);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (settings?.finals_markdown !== undefined) {
      setEditContent(settings.finals_markdown || "");
    }
  }, [settings?.finals_markdown]);

  const saveMarkdown = useMutation({
    mutationFn: async (newMarkdown: string) => {
      const { error } = await supabase
        .from("competition")
        .update({ finals_markdown: newMarkdown || null })
        .eq("id", competition.id);

      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      setIsEditing(false);
    },
    onError: (error) => {
      alert(`Error saving: ${error.message}`);
    },
  });

  const handleSave = () => {
    saveMarkdown.mutate(editContent);
  };

  const handleCancel = () => {
    setEditContent(settings?.finals_markdown || "");
    setIsEditing(false);
  };

  if (!settings) {
    return (
      <Stack>
        <Skeleton height="200px" />
      </Stack>
    );
  }

  if (isEditing && isAdmin) {
    return (
      <Box>
        <Flex justify="flex-end" mb={2} gap={2}>
          <IconButton
            aria-label="Save"
            size="sm"
            colorPalette="green"
            onClick={handleSave}
            loading={saveMarkdown.isPending}
          >
            <TbCheck />
          </IconButton>
          <IconButton
            aria-label="Cancel"
            size="sm"
            colorPalette="red"
            variant="outline"
            onClick={handleCancel}
            disabled={saveMarkdown.isPending}
          >
            <TbX />
          </IconButton>
        </Flex>
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          minH="300px"
          resize="vertical"
          fontFamily="mono"
          fontSize="sm"
          placeholder="Enter markdown content for finals results..."
        />
      </Box>
    );
  }

  const markdownContent = settings.finals_markdown;

  return (
    <Box position="relative">
      {isAdmin && (
        <Box position="absolute" top={0} right={0}>
          <IconButton
            aria-label="Edit"
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
          >
            <TbEdit />
          </IconButton>
        </Box>
      )}

      {markdownContent ? (
        <Box
          className="markdown-content"
          css={{
            "& h1": {
              fontSize: "2xl",
              fontWeight: "bold",
              marginTop: "1rem",
              marginBottom: "0.5rem",
            },
            "& h2": {
              fontSize: "xl",
              fontWeight: "bold",
              marginTop: "0.75rem",
              marginBottom: "0.5rem",
            },
            "& h3": {
              fontSize: "lg",
              fontWeight: "600",
              marginTop: "0.5rem",
              marginBottom: "0.25rem",
            },
            "& p": { marginBottom: "0.5rem" },
            "& ul, & ol": { paddingLeft: "1.5rem", marginBottom: "0.5rem" },
            "& li": { marginBottom: "0.25rem" },
            "& strong": { fontWeight: "bold" },
            "& em": { fontStyle: "italic" },
            "& code": {
              background: "#f0f0f0",
              padding: "0 0.25rem",
              borderRadius: "0.25rem",
              fontFamily: "monospace",
            },
            "& pre": {
              background: "#f0f0f0",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              overflow: "auto",
              marginBottom: "0.5rem",
            },
            "& blockquote": {
              borderLeft: "4px solid #ccc",
              paddingLeft: "1rem",
              fontStyle: "italic",
            },
          }}
        >
          <ReactMarkdown>{markdownContent}</ReactMarkdown>
        </Box>
      ) : (
        <Text textAlign="center" fontSize="lg" color="gray.600">
          {isAdmin
            ? "No finals content yet. Click the edit button to add results."
            : "Finals results will be posted here."}
        </Text>
      )}
    </Box>
  );
}

function LeaderboardRow({
  row,
  selectedLeague,
  leaderboard,
  index,
}: {
  row: LeaderboardTeam;
  selectedLeague: string;
  leaderboard: LeaderboardTeam[];
  index: number;
}) {
  const cardBg = useColorModeValue("white", "gray.700");
  const cardBorderColor = useColorModeValue("gray.200", "gray.600");
  const defaultOrdinalBg = useColorModeValue("blue.100", "blue.900");
  const competition = useCompetition();

  // For QUALI league, use gold for top half and silver for bottom half.
  let badgeBg: string = competition.accentColour;
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
  const [leaderboards] = useAtom(leaderboardAtom);

  if (leaderboards === undefined) {
    return (
      <Stack>
        <Skeleton height="80px" />
        <Skeleton height="80px" />
        <Skeleton height="80px" />
      </Stack>
    );
  }

  const leaderboard = leaderboards.get(league);
  if (leaderboard === undefined) {
    return (
      <Text textAlign="center" fontSize="lg" color="gray.600">
        No leaderboard found for this league.
      </Text>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Text textAlign="center" fontSize="lg" color="gray.600">
        No results in this league yet.
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

  const competition = useCompetition();

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
        <Box maxW="600px" mx="auto">
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
          <Box maxW="600px" mx="auto">
            <Flex w="full" justify="center" mb={6} boxShadow="lg">
              <ButtonGroup attached variant="solid" w="full">
                <Button
                  flex="1"
                  bg={
                    selectedLeague === "quali"
                      ? competition.accentColour
                      : "gray.300"
                  }
                  color={selectedLeague === "quali" ? "white" : "gray.800"}
                  _hover={{
                    bg:
                      selectedLeague === "quali"
                        ? competition.accentColour
                        : "gray.400",
                  }}
                  onClick={() => setSelectedLeague("quali")}
                  fontSize="xs"
                  fontWeight="bold"
                >
                  1. QUALIFYING
                </Button>
                <Button
                  flex="1"
                  bg={
                    selectedLeague === "finals"
                      ? competition.accentColour
                      : "gray.300"
                  }
                  color={selectedLeague === "finals" ? "white" : "gray.800"}
                  _hover={{
                    bg:
                      selectedLeague === "finals"
                        ? competition.accentColour
                        : "gray.400",
                  }}
                  onClick={() => setSelectedLeague("finals")}
                  fontSize="xs"
                  fontWeight="bold"
                >
                  2. FINALS
                </Button>
              </ButtonGroup>
            </Flex>

            <Stack gap={4}>
              {selectedLeague === "quali" ? (
                // Qualis
                <>
                  <Text
                    fontSize="sm"
                    color="gray.600"
                    mb={4}
                    fontStyle="italic"
                  >
                    Round Robin
                  </Text>
                  <Stack gap={4}>
                    <Leaderboard league="quali" />
                  </Stack>
                </>
              ) : selectedLeague === "finals" ? (
                <FinalsMarkdown />
              ) : (
                <></>
              )}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function LeaderboardPage({
  hostname,
}: {
  hostname: string | undefined;
}) {
  useHydrateAtoms([
    [hostnameAtom, hostname],
    [queryClientAtom, queryClient],
  ]);
  return (
    <QueryClientProvider client={queryClient}>
      <SharedLogic />
      <Page />
    </QueryClientProvider>
  );
}
