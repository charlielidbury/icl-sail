"use client";

import { Box, Flex, Text, Heading, Grid, GridItem, Skeleton, Stack, chakra } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import supabase from "@/supabase";
import { RaceResult } from "../shared";

// Define a type for a leaderboard row.
type LeaderboardRow = {
    avg_pts: number;
    losses: number;
    wins: number;
    team: {
        id: string;
        name: string;
    };
};

// Helper to transform a YouTube watch URL into an embed URL.
function getEmbedUrl(url: string): string {
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/;
    const match = url.match(ytRegex);
    if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}`;
    }
    return url;
}

// Wrap iframe using Chakra's chakra() so we can pass style props.
const Iframe = chakra("iframe");

interface RaceDialogProps {
    race: RaceResult;
}

export default function RaceDialog({ race }: RaceDialogProps) {
    const [stats, setStats] = useState<LeaderboardRow[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Extract team IDs from the race.
    const leftTeamId = race.raceteam[0]?.team.id;
    const rightTeamId = race.raceteam[1]?.team.id;

    useEffect(() => {
        if (!leftTeamId || !rightTeamId) {
            setLoading(false);
            return;
        }
        supabase
            .from("leaderboard")
            .select(`
        avg_pts,
        losses,
        wins,
        team (
          id, name
        )
      `)
            .in("team", [leftTeamId, rightTeamId])
            .then(({ data, error }) => {
                if (error) {
                    console.error("Error fetching head-to-head data:", error);
                } else {
                    setStats(data as LeaderboardRow[]);
                }
                setLoading(false);
            });
    }, [leftTeamId, rightTeamId]);

    const leftStats = stats?.find((s) => s.team.id === leftTeamId);
    const rightStats = stats?.find((s) => s.team.id === rightTeamId);

    return (
        <Box mt={4}>
            {/* Head-to-Head Header */}
            <Box mb={4} p={3} borderWidth="1px" borderRadius="md" bg="gray.50">
                <Grid templateColumns="1fr auto 1fr" gap={2}>
                    {/* Row 1: Wins */}
                    <GridItem textAlign="center">
                        <Text fontSize="sm" color="green.600" fontWeight="bold">
                            {leftStats ? leftStats.wins : "-"}
                        </Text>
                    </GridItem>
                    <GridItem textAlign="center" rowSpan={1} alignSelf="center">
                        <Text fontSize="xs" color="gray.600" fontWeight="bold">
                            WINS
                        </Text>
                    </GridItem>
                    <GridItem textAlign="center">
                        <Text fontSize="sm" color="green.600" fontWeight="bold">
                            {rightStats ? rightStats.wins : "-"}
                        </Text>
                    </GridItem>
                    {/* Row 2: Losses */}
                    <GridItem textAlign="center">
                        <Text fontSize="sm" color="red.600" fontWeight="bold">
                            {leftStats ? leftStats.losses : "-"}
                        </Text>
                    </GridItem>
                    <GridItem textAlign="center" alignSelf="center">
                        <Text fontSize="xs" color="gray.600" fontWeight="bold">
                            LOSSES
                        </Text>
                    </GridItem>
                    <GridItem textAlign="center">
                        <Text fontSize="sm" color="red.600" fontWeight="bold">
                            {rightStats ? rightStats.losses : "-"}
                        </Text>
                    </GridItem>
                    {/* Row 3: Average Points */}
                    <GridItem textAlign="center">
                        <Text fontSize="sm" color="black.600" fontWeight="bold">
                            {leftStats ? leftStats.avg_pts.toFixed(1) : "-"}
                        </Text>
                    </GridItem>
                    <GridItem textAlign="center" alignSelf="center">
                        <Text fontSize="xs" color="gray.600" fontWeight="bold">
                            AVG. POINTS
                        </Text>
                    </GridItem>
                    <GridItem textAlign="center">
                        <Text fontSize="sm" color="black.600" fontWeight="bold">
                            {rightStats ? rightStats.avg_pts.toFixed(1) : "-"}
                        </Text>
                    </GridItem>
                </Grid>
            </Box>

            {/* Video embed */}
            {race.video && (
                <Box mb={4}>
                    <Heading as="h3" size="md" mb={2}>
                        Race Video
                    </Heading>
                    <Iframe
                        src={getEmbedUrl(race.video)}
                        title="Race Video"
                        width="100%"
                        height="300px"
                        border="0"
                    />
                </Box>
            )}
        </Box>
    );
}
