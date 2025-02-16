"use client";

import NavBar from "@/components/navbar";
import {
    Box,
    Stack,
    Skeleton,
    Text,
    Heading,
    Flex
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import supabase from "@/supabase";
import { Session } from "@supabase/auth-js";
import { useColorMode } from "@/components/ui/color-mode";

type LeaderboardRow = {
    avg_pts: number;
    losses: number;
    order: number;
    wins: number;
    team: {
        id: string;
        name: string;
    };
};

export default function Leaderboard() {
    // Session and admin checking state.
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

    // Fetch leaderboard data from the database.
    const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    useEffect(() => {
        supabase
            .from("leaderboard")
            // Using the relationship to join team data.
            .select(`
        avg_pts,
        losses,
        order,
        wins,
        team (
          id, name
        )
      `)
            // Order by the "order" field (or you could order by avg_pts if preferred).
            .order("order", { ascending: true })
            .then(({ data, error }) => {
                if (error) {
                    console.error("Error fetching leaderboard:", error);
                } else {
                    setLeaderboard(data as LeaderboardRow[]);
                }
                setLoading(false);
            });
    }, []);

    // Ensure the app is in light mode.
    const { setColorMode } = useColorMode();
    useEffect(() => {
        setColorMode("light");
    }, []);

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
                        {leaderboard && leaderboard.length > 0 ? (
                            leaderboard.map((row) => (
                                <Box
                                    key={row.team.id}
                                    bg="white"
                                    borderWidth="1px"
                                    borderColor="gray.200"
                                    borderRadius="md"
                                    p={4}
                                    boxShadow="md"
                                >
                                    <Flex justify="space-between" align="center" mb={2}>
                                        <Text fontSize="xl" fontWeight="bold">
                                            {row.team.name}
                                        </Text>
                                    </Flex>
                                    <Flex justify="space-around">
                                        <Box textAlign="center">
                                            <Text fontSize="sm" color="gray.600">
                                                Wins
                                            </Text>
                                            <Text fontSize="lg" fontWeight="semibold">
                                                {row.wins}
                                            </Text>
                                        </Box>
                                        <Box textAlign="center">
                                            <Text fontSize="sm" color="gray.600">
                                                Losses
                                            </Text>
                                            <Text fontSize="lg" fontWeight="semibold">
                                                {row.losses}
                                            </Text>
                                        </Box>
                                        <Box textAlign="center">
                                            <Text fontSize="sm" color="gray.600">
                                                Avg. Points
                                            </Text>
                                            <Text fontSize="lg" fontWeight="semibold">
                                                {row.avg_pts.toFixed(1)}
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
