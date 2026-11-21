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
  competitionIdAtom,
  racesAtom,
} from "@/shared";
import {
  QueryClientProvider,
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import supabase from "@/supabase";
import { TbEdit, TbCheck, TbX } from "react-icons/tb";
import { useAtom, useAtomValue } from "jotai";
import dynamic from "next/dynamic";
import { useHydrateAtoms } from "jotai/utils";
import { groupsConfig, type CompetitionId } from "@/competitions";
import { queryClientAtom } from "jotai-tanstack-query";
import {
  GOLD_LEAGUE,
  SILVER_LEAGUE,
  STAGE_NAMES,
  competitionStages,
  leagueName,
  leagueStage,
  stageAtOrBefore,
  type Stage,
} from "@/leagues";
import GroupsAdmin from "./groups-admin";

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
            "& table": {
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "0.5rem",
            },
            "& th, & td": {
              border: "1px solid #ccc",
              padding: "0.4rem 0.75rem",
              textAlign: "left",
            },
            "& th": {
              fontWeight: "bold",
              background: "#f5f5f5",
            },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownContent}</ReactMarkdown>
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

/**
 * One group's standings. Teams that haven't finished a race yet come after
 * the rest, in qualifying order.
 */
function GroupStandings({ league }: { league: string }) {
  const leaderboards = useAtomValue(leaderboardAtom);
  const races = useAtomValue(racesAtom).data?.races;
  const cardBg = useColorModeValue("white", "gray.700");
  const cardBorderColor = useColorModeValue("gray.200", "gray.600");

  if (leaderboards === undefined || races === undefined) {
    return <Skeleton height="200px" />;
  }

  const standings = leaderboards.get(league) ?? [];
  const qualiOrder = (leaderboards.get("quali") ?? []).map((t) => t.team.id);
  const waiting = new Map<string, string>();
  for (const r of races) {
    if (r.league !== league) continue;
    for (const team of [r.lteam, r.rteam]) {
      if (team && !standings.some((s) => s.team.id === team.id)) {
        waiting.set(team.id, team.name);
      }
    }
  }
  const rank = (id: string) => {
    const i = qualiOrder.indexOf(id);
    return i === -1 ? Infinity : i;
  };
  const waitingTeams = [...waiting].sort(([a], [b]) => rank(a) - rank(b));

  return (
    <Stack gap={4}>
      <Heading as="h2" size="md" color="black" fontWeight="bold">
        {leagueName(league)}
      </Heading>
      {standings.length === 0 && waitingTeams.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No {leagueName(league)} races yet.
        </Text>
      ) : (
        <>
          {standings.map((row, index) => (
            <LeaderboardRow
              row={row}
              selectedLeague={league}
              leaderboard={standings}
              index={index}
              key={row.team.id}
            />
          ))}
          {waitingTeams.map(([id, name]) => (
            <Link
              key={id}
              href={`/races?search=league:${league} ${name}`}
              _hover={{ textDecoration: "none" }}
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
              >
                <Text fontSize="lg" fontWeight="bold" color="black">
                  {name}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  No results yet
                </Text>
              </Box>
            </Link>
          ))}
        </>
      )}
    </Stack>
  );
}

/** The Gold/Silver tab. Visitors only see it once the stage has started. */
function GroupsTab() {
  const { isAdmin } = useAuth();
  const { data: settings } = useAtomValue(competitionAtom);

  if (!settings) {
    return <Skeleton height="200px" />;
  }
  const released = stageAtOrBefore("groups", settings.stage);
  if (!released && !isAdmin) {
    return (
      <Text textAlign="center" fontSize="lg" color="gray.600">
        Gold/Silver hasn&apos;t started yet.
      </Text>
    );
  }
  return (
    <Stack gap={8}>
      {isAdmin && <GroupsAdmin released={released} />}
      <GroupStandings league={GOLD_LEAGUE} />
      <GroupStandings league={SILVER_LEAGUE} />
    </Stack>
  );
}

function Page() {
  // Session and admin state.
  const { isAdmin } = useAuth();

  const competition = useCompetition();

  // A tab per stage: "1. Qualifying", "2. Gold/Silver", "3. Finals", or
  // without Gold/Silver, "1. Qualifying", "2. Finals".
  const hasGroups = groupsConfig(competition).enabled;
  const tabs = competitionStages(hasGroups).map((stage, i) => ({
    stage,
    label: `${i + 1}. ${STAGE_NAMES[stage]}`,
  }));

  // Tab selection. Until one is picked, the latest released stage with
  // something to show: the finals text, then Gold/Silver races, then
  // qualifying.
  const { data: settings } = useAtomValue(competitionAtom);
  const races = useAtomValue(racesAtom).data?.races;
  const [pickedTab, setPickedTab] = useState<Stage | null>(null);
  const defaultTab: Stage =
    settings?.stage === "finals" && settings.finals_markdown
      ? "finals"
      : hasGroups &&
          settings !== undefined &&
          stageAtOrBefore("groups", settings.stage) &&
          races?.some((r) => leagueStage(r.league) === "groups")
        ? "groups"
        : "quali";
  const selectedTab: Stage = pickedTab ?? defaultTab;

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
                {tabs.map(({ stage, label }) => (
                  <Button
                    key={stage}
                    flex="1"
                    bg={
                      selectedTab === stage
                        ? competition.accentColour
                        : "gray.300"
                    }
                    color={selectedTab === stage ? "white" : "gray.800"}
                    _hover={{
                      bg:
                        selectedTab === stage
                          ? competition.accentColour
                          : "gray.400",
                    }}
                    onClick={() => setPickedTab(stage)}
                    fontSize="xs"
                    fontWeight="bold"
                    textTransform="uppercase"
                    px={2}
                  >
                    {label}
                  </Button>
                ))}
              </ButtonGroup>
            </Flex>

            <Stack gap={4}>
              {selectedTab === "quali" ? (
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
              ) : selectedTab === "groups" && hasGroups ? (
                <GroupsTab />
              ) : (
                <FinalsMarkdown />
              )}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function LeaderboardPage({
  competitionId,
}: {
  competitionId: CompetitionId;
}) {
  useHydrateAtoms([
    [competitionIdAtom, competitionId],
    [queryClientAtom, queryClient],
  ]);
  return (
    <QueryClientProvider client={queryClient}>
      <SharedLogic />
      <Page />
    </QueryClientProvider>
  );
}
