"use client";

import NavBar from "@/components/navbar";
import {
    Box,
    Stack,
    Skeleton,
    Text,
    Heading,
    Flex,
    Badge
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import supabase from "@/supabase";
import { Session } from "@supabase/auth-js";
import { useColorMode, useColorModeValue } from "@/components/ui/color-mode";
import ordinal from "ordinal";

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
    // Session and admin state.
    const [session, setSession] = useState<Session | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => setSession(session)
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
                    .single();
                setIsAdmin(!!data);
            } else {
                setIsAdmin(false);
            }
        };
        checkAdminStatus();
    }, [session]);

    // Fetch leaderboard data.
    const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    useEffect(() => {
        supabase
            .from("leaderboard")
            .select(`
        avg_pts,
        losses,
        order,
        wins,
        team (
          id, name
        )
      `)
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

    // Ensure light mode.
    const { setColorMode } = useColorMode();
    useEffect(() => {
        setColorMode("light");
    }, []);

    // Styling values.
    const pageBg = useColorModeValue("gray.50", "gray.800");
    const cardBg = useColorModeValue("white", "gray.700");
    const cardBorderColor = useColorModeValue("gray.200", "gray.600");
    const ordinalBg = useColorModeValue("blue.100", "blue.900");

    return (
        <>
            <Box position="sticky" top="0" zIndex="100">
                <NavBar isAdmin={isAdmin} />
            </Box>
            <Box p={4} bg={pageBg} minH="100vh">
                <Heading
                    as="h1"
                    size="xl"
                    mb={6}
                    textAlign="center"
                    color="black"
                    fontWeight="extrabold"
                >
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
                            leaderboard.map((row, index) => (
                                <Box
                                    key={row.team.id}
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
                                            bg={ordinalBg}
                                            color="black"
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
                            ))
                        ) : (
                            <Text textAlign="center" fontSize="lg" color="gray.600">
                                No leaderboard data available.
                            </Text>
                        )}
                    </Stack>
                )}
            </Box>
        </>
    );
}
