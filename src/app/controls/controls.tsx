"use client";

import {
  Box,
  Stack,
  Heading,
  Button,
  ButtonGroup,
  Text,
  Input,
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import {
  NumberInputRoot,
  NumberInputField,
} from "@/components/ui/number-input";
import { Checkbox } from "@/components/ui/checkbox";
import NavBar from "@/components/navbar";
import {
  useCompetition,
  Competition,
  competitionAtom,
  queryClient,
  SharedLogic,
  useAuth,
  competitionIdAtom,
} from "@/shared";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import supabase from "@/supabase";
import { useEffect, useState } from "react";
import { useColorMode } from "@/components/ui/color-mode";
import { useAtomValue } from "jotai";
import dynamic from "next/dynamic";
import { useHydrateAtoms } from "jotai/utils";
import type { CompetitionId } from "@/competitions";
import { queryClientAtom } from "jotai-tanstack-query";
import { competitionStages, STAGE_NAMES } from "@/leagues";
import { groupsConfig } from "@/competitions";

// The settings this page edits, so saving doesn't overwrite anything else
// (e.g. the finals text, edited on the leaderboard).
const EDITABLE = [
  "announcement",
  "racing_paused",
  "feedback",
  "go_to_stand",
  "estimates",
  "stage",
] as const;

function SettingsPage() {
  const { isAdmin } = useAuth();

  const competition = useCompetition();

  const {
    data: remoteSettings,
    isLoading,
    refetch,
  } = useAtomValue(competitionAtom);

  // Force light color mode on load
  const { setColorMode } = useColorMode();
  useEffect(() => {
    setColorMode("light");
  }, [setColorMode]);

  const [settings, setSettings] = useState<Competition | undefined>(undefined);
  useEffect(() => {
    if (remoteSettings) {
      setSettings(remoteSettings);
    }
  }, [JSON.stringify(remoteSettings)]);

  // Saves the changed settings. Fails on any error, and when no row was
  // updated (the database refuses non-admins without an error).
  const saveSettings = useMutation({
    mutationFn: async (newSettings: Competition) => {
      const changes = Object.fromEntries(
        EDITABLE.map((key) => [key, newSettings[key]]),
      );
      const { data, error } = await supabase
        .from("competition")
        .update(changes)
        .eq("id", newSettings.id)
        .select("id");
      if (error) {
        throw new Error(
          /fetch|network/i.test(error.message)
            ? "couldn't reach the server. Check your connection and try again."
            : error.message,
        );
      }
      if (!data || data.length === 0) {
        throw new Error(
          "the change was rejected. Make sure you're logged in as an admin of this competition.",
        );
      }
    },
    onSuccess: () => refetch(),
  });

  if (!isAdmin) {
    return (
      <Box>
        <NavBar isAdmin={isAdmin} />
        <Box p={4}>
          <Text>You do not have permission to access this page.</Text>
        </Box>
      </Box>
    );
  }

  if (isLoading || !settings) {
    return (
      <Box>
        <NavBar isAdmin={isAdmin} />
        <Box p={4}>
          <Text>Loading...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Box position="sticky" top="0" zIndex="100">
        <NavBar isAdmin={isAdmin} />
      </Box>
      <Box maxW="container.xl" mx="auto" p={8}>
        <Box maxW="md" mx="auto" bg="white" borderRadius="xl" p={8} shadow="sm">
          <Stack gap={6}>
            <Heading size="lg" color="gray.700" fontWeight="bold">
              General
            </Heading>
            <Field label="Announcement">
              <Input
                value={settings.announcement || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    announcement: e.target.value || null,
                  })
                }
                placeholder="Enter an announcement message (optional)"
              />
            </Field>
            <Field label="Pause Racing">
              <Checkbox
                checked={settings.racing_paused}
                onCheckedChange={(v) =>
                  setSettings({ ...settings, racing_paused: !!v.checked })
                }
                colorScheme={competition.accentColour}
              />
            </Field>

            <Field label="Enable Feedback">
              <Checkbox
                checked={settings.feedback}
                onCheckedChange={(v) =>
                  setSettings({ ...settings, feedback: !!v.checked })
                }
                colorScheme={competition.accentColour}
              />
            </Field>

            <Box height="1px" bg="gray.200" my={3} />

            <Heading size="lg" color="gray.700" fontWeight="bold">
              Beach Master
            </Heading>
            <Field label="Go to Stand Notification">
              <NumberInputRoot
                value={settings.go_to_stand.toString()}
                onValueChange={(value) =>
                  setSettings({ ...settings, go_to_stand: Number(value.value) })
                }
                min={0}
                max={10}
              >
                <NumberInputField />
              </NumberInputRoot>
            </Field>

            <Field label="Show Time Estimates">
              <Checkbox
                checked={settings.estimates}
                onCheckedChange={(v) =>
                  setSettings({ ...settings, estimates: !!v.checked })
                }
                colorScheme={competition.accentColour}
              />
            </Field>

            <Box height="1px" bg="gray.200" my={3} />

            <Heading size="lg" color="gray.700" fontWeight="bold">
              Stage
            </Heading>
            <Field
              label="Released to visitors"
              helperText="Visitors only see the races and standings of stages up to this one. Admins always see everything."
            >
              <ButtonGroup attached variant="outline" size="sm" w="full">
                {competitionStages(groupsConfig(competition).enabled).map((stage) => (
                  <Button
                    key={stage}
                    flex="1"
                    aria-pressed={settings.stage === stage}
                    bg={
                      settings.stage === stage
                        ? competition.accentColour
                        : undefined
                    }
                    color={settings.stage === stage ? "white" : undefined}
                    _hover={{
                      bg:
                        settings.stage === stage
                          ? competition.accentColour
                          : "gray.100",
                    }}
                    onClick={() => setSettings({ ...settings, stage })}
                  >
                    {STAGE_NAMES[stage]}
                  </Button>
                ))}
              </ButtonGroup>
            </Field>

            <Box height="1px" bg="gray.200" my={3} />

            <Box>
              <Button
                onClick={() => saveSettings.mutate(settings)}
                loading={saveSettings.isPending}
                disabled={EDITABLE.every(
                  (key) => settings[key] === remoteSettings?.[key],
                )}
                colorScheme="blue"
                bg={competition.accentColour}
                _hover={{ bg: `${competition.accentColour}dd` }}
                size="lg"
                w="full"
              >
                Save Changes
              </Button>
              {saveSettings.isError && (
                <Text mt={2} fontSize="sm" color="red.600" role="alert">
                  Not saved: {saveSettings.error.message}
                </Text>
              )}
              {saveSettings.isSuccess &&
                EDITABLE.every((key) => settings[key] === remoteSettings?.[key]) && (
                <Text mt={2} fontSize="sm" color="green.600">
                  Saved
                </Text>
              )}
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

export default function Page({ competitionId }: { competitionId: CompetitionId }) {
  useHydrateAtoms([
    [competitionIdAtom, competitionId],
    [queryClientAtom, queryClient],
  ]);
  return (
    <QueryClientProvider client={queryClient}>
      <SharedLogic />
      <SettingsPage />
    </QueryClientProvider>
  );
}
