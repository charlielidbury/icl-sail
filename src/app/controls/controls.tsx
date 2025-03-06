"use client";

import { Box, Stack, Heading, Button, Text, Input } from "@chakra-ui/react";
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
  hostnameAtom,
} from "@/shared";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import supabase from "@/supabase";
import { useEffect, useState } from "react";
import { useColorMode } from "@/components/ui/color-mode";
import { useAtomValue } from "jotai";
import dynamic from "next/dynamic";
import { useHydrateAtoms } from "jotai/utils";

function SettingsPage() {
  const { isAdmin } = useAuth();

  const competition = useCompetition();

  const { data: remoteSettings, isLoading } = useAtomValue(competitionAtom);

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

  const saveSettings = useMutation({
    mutationFn: async (newSettings: Competition) => {
      if (!settings) return;

      await supabase
        .from("competition")
        .update(newSettings)
        .eq("id", settings.id);
    },
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

            <Box>
              <Button
                onClick={() => saveSettings.mutate(settings)}
                loading={saveSettings.isPending}
                disabled={
                  settings.estimates === remoteSettings?.estimates &&
                  settings.go_to_stand === remoteSettings?.go_to_stand &&
                  settings.racing_paused === remoteSettings?.racing_paused &&
                  settings.announcement === remoteSettings?.announcement &&
                  settings.feedback === remoteSettings?.feedback
                }
                colorScheme="blue"
                bg={competition.accentColour}
                _hover={{ bg: `${competition.accentColour}dd` }}
                size="lg"
                w="full"
              >
                Save Changes
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

export default function Page({ hostname }: { hostname: string | undefined }) {
  useHydrateAtoms([[hostnameAtom, hostname]]);
  return (
    <QueryClientProvider client={queryClient}>
      <SharedLogic />
      <SettingsPage />
    </QueryClientProvider>
  );
}
