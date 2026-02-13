"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Box,
  Stack,
  Heading,
  Text,
  Button,
  Textarea,
  Flex,
  HStack,
  VStack,
  IconButton,
} from "@chakra-ui/react";
import NavBar from "@/components/navbar";
import {
  competitionAtom,
  queryClient,
  SharedLogic,
  useAuth,
  hostnameAtom,
  useCompetition,
} from "@/shared";
import {
  QueryClientProvider,
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import supabase from "@/supabase";
import { useAtomValue } from "jotai";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { TbTrash } from "react-icons/tb";
import dynamic from "next/dynamic";
import { useHydrateAtoms } from "jotai/utils";
import { queryClientAtom } from "jotai-tanstack-query";

// Initialize dayjs plugins
dayjs.extend(relativeTime);

interface Feedback {
  id: number;
  body: string;
  created_at: string;
  hidden: boolean;
  response: string | null;
}

interface FeedbackItemProps {
  feedback: Feedback;
  isAdmin: boolean;
  onDelete: () => void;
}

function FeedbackItem({ feedback, isAdmin, onDelete }: FeedbackItemProps) {
  // Mutation to delete feedback
  const deleteFeedback = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("feedback")
        .delete()
        .eq("id", feedback.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      onDelete();
      alert("Feedback has been deleted.");
    },
    onError: (error) => {
      alert(`Error deleting feedback: ${error.message}`);
    },
  });

  const handleDelete = () => {
    deleteFeedback.mutate();
  };

  const competition = useCompetition();

  return (
    <Box
      bg="white"
      shadow="sm"
      borderRadius="lg"
      overflow="hidden"
      position="relative"
    >
      {isAdmin && (
        <Box position="absolute" top="8px" right="8px" zIndex="1">
          <IconButton
            aria-label="Delete feedback"
            children={<TbTrash />}
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={handleDelete}
            disabled={deleteFeedback.isPending}
            opacity="0.6"
            loading={deleteFeedback.isPending}
            _hover={{ opacity: 1 }}
          />
        </Box>
      )}
      <Box p={4} pb={0}>
        <Flex gap="4">
          <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
            <Box
              bg={competition.accentColour}
              w="32px"
              h="32px"
              borderRadius="full"
            />
            <Box>
              <Text fontWeight="bold">Anonymous</Text>
              <Text fontSize="sm" color="gray.500">
                {dayjs(feedback.created_at).fromNow()}
              </Text>
            </Box>
          </Flex>
        </Flex>
      </Box>
      <Box p={4}>
        <Text whiteSpace="pre-wrap">{feedback.body}</Text>
        {feedback.response && (
          <Box mt={4} p={3} bg="gray.100" borderRadius="md">
            <Text fontWeight="bold" fontSize="sm" color="gray.700">
              Developer Response
            </Text>
            <Text mt={1}>{feedback.response}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function Feedbacks({ isAdmin }: { isAdmin: boolean }) {
  // Query to fetch feedback
  const { data: feedbackItems, refetch: refreshFeedback } = useQuery({
    queryKey: ["feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .eq("hidden", false)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data as Feedback[];
    },
  });

  if (!feedbackItems) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.500">Loading feedback...</Text>
      </Box>
    );
  }

  if (feedbackItems.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.500">
          No feedback has been submitted yet. Be the first!
        </Text>
      </Box>
    );
  }

  return (
    <VStack gap={4} align="stretch">
      {feedbackItems.map((item) => (
        <FeedbackItem
          key={item.id}
          feedback={item}
          isAdmin={isAdmin}
          onDelete={refreshFeedback}
        />
      ))}
    </VStack>
  );
}

function FeedbackPage() {
  const { session, isAdmin } = useAuth();
  const [feedbackText, setFeedbackText] = useState("");
  const { data: settings } = useAtomValue(competitionAtom);

  const competition = useCompetition();

  // Redirect if feedback is disabled
  useEffect(() => {
    if (settings && !settings.feedback) {
      window.location.href = "/";
    }
  }, [settings]);

  // Mutation to submit feedback
  const submitFeedback = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from("feedback").insert([
        {
          body,
          created_at: new Date().toISOString(),
          hidden: false,
        },
      ]);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      setFeedbackText("");
    },
    onError: (error) => {
      alert(`Error submitting feedback: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!feedbackText.trim()) {
      alert("Please enter some feedback before submitting.");
      return;
    }

    submitFeedback.mutate(feedbackText);
  };

  if (!settings?.feedback) {
    return null;
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Box position="sticky" top="0" zIndex="100">
        <NavBar isAdmin={isAdmin} />
      </Box>
      <Box maxW="container.lg" mx="auto" p={8}>
        <VStack gap={8} align="stretch">
          <Box textAlign="center">
            <Heading size="xl" mb={2} color="gray.700">
              Feedback
            </Heading>
            <Text fontSize="lg" color="gray.600">
              If you spot any bugs or have any feature suggestions, please let
              us know below!
            </Text>
          </Box>

          <Box bg="white" shadow="sm" borderRadius="xl" p={6}>
            <VStack gap={4} align="stretch">
              <Textarea
                placeholder="Wouldn't it be great if..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                minH="120px"
                resize="vertical"
                borderColor={competition.accentColour}
              />
              <Flex justify="flex-end">
                <Button
                  onClick={handleSubmit}
                  disabled={submitFeedback.isPending}
                  colorScheme="blue"
                  bg={competition.accentColour}
                  _hover={{ bg: `${competition.accentColour}dd` }}
                >
                  {submitFeedback.isPending
                    ? "Submitting..."
                    : "Submit Feedback"}
                </Button>
              </Flex>
            </VStack>
          </Box>

          <Text
            fontSize="sm"
            fontStyle="italic"
            color="gray.500"
            textAlign="center"
          >
            If you can see this message, you can turn off feedback via{" "}
            <Link href="/controls" style={{ textDecoration: "underline" }}>
              controls
            </Link>
            . Please do so if things get out of hand.
          </Text>

          <Box height="1px" bg="gray.200" my={3} />

          <Box>
            <Heading size="lg" mb={4} color="gray.700">
              Community Feedback
            </Heading>
            <Feedbacks isAdmin={isAdmin} />
          </Box>
        </VStack>
      </Box>
    </Box>
  );
}

export default function Page({ hostname }: { hostname: string | undefined }) {
  useHydrateAtoms([
    [hostnameAtom, hostname],
    [queryClientAtom, queryClient],
  ]);
  return (
    <QueryClientProvider client={queryClient}>
      <SharedLogic />
      <FeedbackPage />
    </QueryClientProvider>
  );
}
