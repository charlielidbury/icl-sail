"use client";

import NavBar from "@/components/navbar";
import {
    Box,
    Skeleton,
    Stack,
    Text,
    Heading,
    Flex
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import supabase from "@/supabase";
import { Session } from "@supabase/auth-js";

// Define a helper type for leaderboard statistics.
type LeaderboardStats = {
    teamId: string;
    teamName: string;
    wins: number;
    losses: number;
    totalPoints: number;
    games: number;
    avgPoints: number;
};

// Helper function to sum an array of numbers (or return 0 if null).
const sumResult = (result: number[] | null): number =>
    result ? result.reduce((sum, num) => sum + num, 0) : 0;

export default function Leaderboard() {
    // Session and admin checking state (similar to page.tsx).
    const [session, setSession] = useState<Session | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
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

    // Fetch races with their related raceteam rows (including nested team info).
    const [races, setRaces] = useState<any[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
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
            result,
            halfflight
          )
        `
            )
            .order("number", { ascending: false })
            .then(({ data, error }) => {
                if (error) {
                    console.error("Error fetching races:", error);
                } else {
                    setRaces(data);
                }
                setLoading(false);
            });
    }, []);

    // Aggregate leaderboard stats.
    const leaderboardStats: LeaderboardStats[] = useMemo(() => {
        const statsMap: { [teamId: string]: LeaderboardStats } = {};
        if (!races) return [];

        races.forEach((race) => {
            // Process only races with exactly two raceteam rows.
            if (!race.raceteam || race.raceteam.length < 2) return;
            const [rtA, rtB] = race.raceteam;

            // Only process if both teams have non-null results.
            if (rtA.result === null || rtB.result === null) return;

            const scoreA = sumResult(rtA.result);
            const scoreB = sumResult(rtB.result);

            // Skip tied races (or handle ties as desired).
            if (scoreA === scoreB) return;

            const winner = scoreA > scoreB ? rtA : rtB;
            const loser = scoreA > scoreB ? rtB : rtA;
            const winnerScore = scoreA > scoreB ? scoreA : scoreB;
            const loserScore = scoreA > scoreB ? scoreB : scoreA;

            // Helper to update team stats.
            const updateStats = (teamRow: any, isWin: boolean, points: number) => {
                const teamId = teamRow.team.id;
                const teamName = teamRow.team.name;
                if (!statsMap[teamId]) {
                    statsMap[teamId] = {
                        teamId,
                        teamName,
                        wins: 0,
                        losses: 0,
                        totalPoints: 0,
                        games: 0,
                        avgPoints: 0,
                    };
                }
                statsMap[teamId].games += 1;
                statsMap[teamId].totalPoints += points;
                if (isWin) {
                    statsMap[teamId].wins += 1;
                } else {
                    statsMap[teamId].losses += 1;
                }
            };

            updateStats(winner, true, winnerScore);
            updateStats(loser, false, loserScore);
        });

        const leaderboardArray = Object.values(statsMap).map((stats) => ({
            ...stats,
            avgPoints: stats.games > 0 ? stats.totalPoints / stats.games : 0,
        }));

        // Sort ascending: lowest average points at the top.
        leaderboardArray.sort((a, b) => a.avgPoints - b.avgPoints);
        return leaderboardArray;
    }, [races]);

    return (
        <>
            <Box position="sticky" top="0" zIndex="100">
                <NavBar isAdmin={isAdmin} />
            </Box>
            <Box p={4}>
                <Heading as="h1" size="lg" mb={6} textAlign="center">
                    Leaderboard
                </Heading>
                {loading ? (
                    <Stack>
                        <Skeleton height="80px" />
                        <Skeleton height="80px" />
                        <Skeleton height="80px" />
                    </Stack>
                ) : (
                    <Stack>
                        {leaderboardStats.length > 0 ? (
                            leaderboardStats.map((stats) => (
                                <Box
                                    key={stats.teamId}
                                    bg="white"
                                    borderWidth="1px"
                                    borderColor="gray.200"
                                    borderRadius="md"
                                    p={4}
                                    boxShadow="md"
                                >
                                    <Flex justify="space-between" align="center" mb={2}>
                                        <Text fontSize="xl" fontWeight="bold">
                                            {stats.teamName}
                                        </Text>
                                    </Flex>
                                    <Flex justify="space-around">
                                        <Box textAlign="center">
                                            <Text fontSize="sm" color="gray.600">
                                                Wins
                                            </Text>
                                            <Text fontSize="lg" fontWeight="semibold">
                                                {stats.wins}
                                            </Text>
                                        </Box>
                                        <Box textAlign="center">
                                            <Text fontSize="sm" color="gray.600">
                                                Losses
                                            </Text>
                                            <Text fontSize="lg" fontWeight="semibold">
                                                {stats.losses}
                                            </Text>
                                        </Box>
                                        <Box textAlign="center">
                                            <Text fontSize="sm" color="gray.600">
                                                Avg. Points
                                            </Text>
                                            <Text fontSize="lg" fontWeight="semibold">
                                                {stats.avgPoints.toFixed(1)}
                                            </Text>
                                        </Box>
                                    </Flex>
                                </Box>
                            ))
                        ) : (
                            <Text textAlign="center">No leaderboard data available.</Text>
                        )}
                    </Stack>
                )}
            </Box>
        </>
    );
}
